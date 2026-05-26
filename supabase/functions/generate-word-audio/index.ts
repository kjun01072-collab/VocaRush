import { createClient } from "https://esm.sh/@supabase/supabase-js@2.105.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const SAFE_GENERIC_ERROR = "문제가 발생했습니다. 다시 시도해 주세요.";
const SAFE_AUDIO_ERROR = "음성 생성에 실패했습니다. 다시 시도해 주세요.";

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function blobToBase64(blob: Blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

function cleanText(value: unknown) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "POST 요청만 지원합니다." }, 405);
  }

  const openaiKey = Deno.env.get("OPENAI_API_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!openaiKey || !supabaseUrl || !anonKey) {
    console.warn("[generate-word-audio] missing_server_config");
    return jsonResponse({ error: SAFE_GENERIC_ERROR }, 500);
  }

  const authHeader = req.headers.get("Authorization") || "";
  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) {
    return jsonResponse({ error: "로그인 후 음성을 생성할 수 있습니다." }, 401);
  }

  let body: { text?: string; subject?: string; part?: string };
  try {
    body = await req.json();
  } catch (error) {
    console.warn("[generate-word-audio] invalid_json", error);
    return jsonResponse({ error: SAFE_GENERIC_ERROR }, 400);
  }

  const text = cleanText(body.text);
  if (!text) {
    return jsonResponse({ error: "text가 필요합니다." }, 400);
  }

  const isEnglish = body.subject === "영어";
  const isScience = body.subject === "EJU 이과";
  const instructions = isEnglish
    ? "Read clearly as a calm English vocabulary tutor. Keep a natural study pace."
    : isScience
      ? "Read clearly as a Japanese math and science tutor. Pronounce the term slowly first, then read the problem sentence naturally."
      : "Read clearly as a Japanese language tutor. Pronounce the vocabulary term slowly first, then the example sentence naturally.";

  try {
    const openaiResponse = await fetch("https://api.openai.com/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini-tts",
        voice: "cedar",
        input: text,
        instructions,
        response_format: "mp3",
      }),
    });

    if (!openaiResponse.ok) {
      const detail = await openaiResponse.text();
      console.warn("[generate-word-audio] openai_failed", openaiResponse.status, detail.slice(0, 300));
      return jsonResponse({ error: SAFE_AUDIO_ERROR }, 502);
    }

    const audioBlob = await openaiResponse.blob();
    return jsonResponse({
      audioBase64: await blobToBase64(audioBlob),
      contentType: "audio/mpeg",
      format: "mp3",
      disclosure: "AI-generated voice",
    });
  } catch (error) {
    console.warn("[generate-word-audio] internal_error", error);
    return jsonResponse({ error: SAFE_AUDIO_ERROR }, 500);
  }
});
