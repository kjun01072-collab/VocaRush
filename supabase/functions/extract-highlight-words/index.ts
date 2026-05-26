import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SAFE_GENERIC_ERROR = "문제가 발생했습니다. 다시 시도해 주세요.";
const SAFE_ANALYSIS_ERROR = "단어 추출에 실패했습니다. 다시 시도해 주세요.";

type ExtractedWord = {
  word: string;
  reading: string;
  meaningKo: string;
  category: string;
  confidence: number;
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function getOutputText(data: any): string {
  if (typeof data?.output_text === "string") return data.output_text;
  const chunks: string[] = [];
  for (const item of data?.output || []) {
    for (const content of item?.content || []) {
      if (typeof content?.text === "string") chunks.push(content.text);
    }
  }
  return chunks.join("\n");
}

function parseWords(raw: string): ExtractedWord[] {
  const jsonText = raw.match(/\{[\s\S]*\}/)?.[0] || raw;
  const parsed = JSON.parse(jsonText);
  const words = Array.isArray(parsed?.words) ? parsed.words : [];
  return words
    .map((item: any) => ({
      word: String(item.word || "").trim(),
      reading: String(item.reading || "").trim(),
      meaningKo: String(item.meaningKo || item.meaning_ko || "").trim(),
      category: String(item.category || "추출 단어").trim(),
      confidence: Math.max(0, Math.min(100, Math.round(Number(item.confidence) || 70))),
    }))
    .filter((item: ExtractedWord) => item.word && item.reading && item.meaningKo)
    .slice(0, 30);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST 요청만 지원합니다." }, 405);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const openaiKey = Deno.env.get("OPENAI_API_KEY");

  if (!supabaseUrl || !anonKey || !serviceRoleKey || !openaiKey) {
    console.warn("[extract-highlight-words] missing_server_secret");
    return jsonResponse({ error: SAFE_GENERIC_ERROR }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const serviceClient = createClient(supabaseUrl, serviceRoleKey);

  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "로그인이 필요합니다." }, 401);
  }

  let body: { uploadId?: string; filePath?: string; fileName?: string; mimeType?: string };
  try {
    body = await req.json();
  } catch (error) {
    console.warn("[extract-highlight-words] invalid_json", error);
    return jsonResponse({ error: SAFE_GENERIC_ERROR }, 400);
  }

  const { uploadId, filePath, fileName, mimeType } = body;

  if (!uploadId || !filePath || !mimeType) {
    return jsonResponse({ error: "uploadId, filePath, mimeType이 필요합니다." }, 400);
  }

  if (!String(filePath).startsWith(`${user.id}/`)) {
    return jsonResponse({ error: "본인 파일만 분석할 수 있습니다." }, 403);
  }

  try {
    if (!String(mimeType).startsWith("image/")) {
      return jsonResponse({ error: "이미지 파일만 업로드할 수 있습니다." }, 400);
    }

    const { data: fileData, error: downloadError } = await serviceClient.storage
      .from("vocarush-highlight-files")
      .download(filePath);

    if (downloadError || !fileData) {
      console.warn("[extract-highlight-words] download_failed", downloadError);
      throw new Error("download_failed");
    }

    const bytes = new Uint8Array(await fileData.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    const base64 = btoa(binary);

    const prompt = [
      "You are extracting Japanese vocabulary from a student textbook/highlight photo for a Korean EJU vocabulary app.",
      "Return ONLY valid JSON.",
      "Schema: {\"words\":[{\"word\":\"日本語\", \"reading\":\"ひらがな\", \"meaningKo\":\"한국어 뜻\", \"category\":\"종합과목/경제\", \"confidence\":0-100}]}",
      "Rules:",
      "- Extract Japanese vocabulary, kanji compounds, academic terms, and EJU/JLPT-style expressions.",
      "- Do not include full copyrighted passages or question text.",
      "- Do not invent long explanations.",
      "- If Korean meaning is uncertain, provide a short best-effort Korean gloss.",
      "- Max 30 words.",
    ].join("\n");

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        temperature: 0.1,
        input: [
          {
            role: "user",
            content: [
              { type: "input_text", text: prompt },
              { type: "input_image", image_url: `data:${mimeType};base64,${base64}` },
            ],
          },
        ],
      }),
    });

    if (!openaiResponse.ok) {
      const detail = await openaiResponse.text();
      console.warn("[extract-highlight-words] openai_failed", openaiResponse.status, detail.slice(0, 300));
      throw new Error("openai_failed");
    }

    const openaiData = await openaiResponse.json();
    let words: ExtractedWord[] = [];
    try {
      words = parseWords(getOutputText(openaiData));
    } catch (error) {
      console.warn("[extract-highlight-words] parse_failed", error);
      throw new Error("parse_failed");
    }

    await serviceClient
      .from("vocarush_highlight_uploads")
      .update({ status: "completed", updated_at: new Date().toISOString(), error_message: null })
      .eq("id", uploadId)
      .eq("user_id", user.id);

    if (words.length) {
      await serviceClient.from("vocarush_highlight_extracted_words").insert(
        words.map((word) => ({
          upload_id: uploadId,
          user_id: user.id,
          word: word.word,
          reading: word.reading,
          meaning_ko: word.meaningKo,
          category: word.category,
          confidence: word.confidence,
        }))
      );
    }

    return jsonResponse({ uploadId, fileName, words });
  } catch (error) {
    console.warn("[extract-highlight-words] internal_error", error);
    await serviceClient
      .from("vocarush_highlight_uploads")
      .update({ status: "failed", updated_at: new Date().toISOString(), error_message: "analysis_failed" })
      .eq("id", uploadId)
      .eq("user_id", user.id);

    return jsonResponse({ error: SAFE_ANALYSIS_ERROR }, 500);
  }
});
