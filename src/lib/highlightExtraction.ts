import { supabase } from "./supabase";
import { logInternalError, UserFacingError } from "../utils/errors";
import { validateHighlightUploadFile } from "../utils/validation";

export type HighlightExtractionCandidate = {
  word: string;
  reading: string;
  meaningKo: string;
  category: string;
  confidence: number;
};

type UploadableFile = Blob & {
  name?: string;
  type?: string;
};

const BUCKET_NAME = "vocarush-highlight-files";

function requireSupabase() {
  if (!supabase) {
    throw new Error("Supabase 연결이 설정되어 있지 않습니다.");
  }
  return supabase;
}

function safeFileName(name: string) {
  const cleaned = name
    .replace(/[\\/:*?"<>|#%{}[\]^~`]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 120);
  return cleaned || "highlight-upload";
}

export async function extractHighlightWordsFromFile(file: UploadableFile): Promise<HighlightExtractionCandidate[]> {
  const client = requireSupabase();
  const fileValidation = validateHighlightUploadFile(file, "한국어");
  if (!fileValidation.ok) {
    throw new UserFacingError(fileValidation.message);
  }

  const {
    data: { user },
    error: userError,
  } = await client.auth.getUser();

  if (userError || !user) {
    throw new UserFacingError("로그인 후 실제 추출을 사용할 수 있습니다.");
  }

  const fileName = safeFileName(file.name || "highlight-upload");
  const mimeType = file.type || "application/octet-stream";
  const filePath = `${user.id}/${Date.now()}-${fileName}`;

  const { error: uploadError } = await client.storage.from(BUCKET_NAME).upload(filePath, file, {
    cacheControl: "3600",
    contentType: mimeType,
    upsert: false,
  });

  if (uploadError) {
    logInternalError(uploadError, "highlightUpload");
    throw new UserFacingError("파일 업로드에 실패했습니다. 다시 시도해 주세요.");
  }

  const { data: uploadRow, error: uploadRowError } = await client
    .from("vocarush_highlight_uploads")
    .insert({
      user_id: user.id,
      file_path: filePath,
      file_name: fileName,
      mime_type: mimeType,
      status: "processing",
    })
    .select("id")
    .single();

  if (uploadRowError || !uploadRow?.id) {
    logInternalError(uploadRowError || "missing upload id", "highlightUploadRow");
    throw new UserFacingError("파일 업로드에 실패했습니다. 다시 시도해 주세요.");
  }

  const { data, error } = await client.functions.invoke("extract-highlight-words", {
    body: {
      uploadId: uploadRow.id,
      filePath,
      fileName,
      mimeType,
    },
  });

  if (error) {
    logInternalError(error, "highlightFunction");
    throw new UserFacingError("단어 추출에 실패했습니다. 다시 시도해 주세요.");
  }

  const words = (data?.words || []) as HighlightExtractionCandidate[];
  return words
    .filter((word) => word.word && word.reading && word.meaningKo)
    .map((word) => ({
      word: word.word,
      reading: word.reading,
      meaningKo: word.meaningKo,
      category: word.category || "추출 단어",
      confidence: Math.max(0, Math.min(100, Math.round(Number(word.confidence) || 70))),
    }));
}
