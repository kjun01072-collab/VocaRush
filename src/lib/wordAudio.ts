import { supabase } from "./supabase";
import { logInternalError, UserFacingError } from "../utils/errors";
import { VocabItem } from "../types";

export type WordAudioPayload = {
  audioBase64: string;
  contentType: string;
  format: "mp3";
  disclosure: string;
};

function requireSupabase() {
  if (!supabase) {
    throw new UserFacingError("음성 생성 서버가 아직 연결되어 있지 않습니다.");
  }
  return supabase;
}

function compactText(value: string, maxLength: number) {
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function buildWordAudioText(word: VocabItem) {
  const base = compactText(word.word, 80);
  const reading = word.reading && word.reading !== word.word ? compactText(word.reading, 80) : "";
  const example = compactText(word.exampleJa, 260);
  return [base, reading, example].filter(Boolean).join("。");
}

export async function generateWordAudio(word: VocabItem): Promise<WordAudioPayload> {
  const client = requireSupabase();
  const input = buildWordAudioText(word);

  const { data, error } = await client.functions.invoke("generate-word-audio", {
    body: {
      wordId: word.id,
      text: input,
      subject: word.subject,
      part: word.part,
    },
  });

  if (error) {
    logInternalError(error, "generateWordAudio");
    throw new UserFacingError("음성 생성에 실패했습니다. 다시 시도해 주세요.");
  }

  if (!data?.audioBase64 || data?.format !== "mp3") {
    logInternalError(data, "generateWordAudio.invalidResponse");
    throw new UserFacingError("음성 생성에 실패했습니다. 다시 시도해 주세요.");
  }

  return {
    audioBase64: String(data.audioBase64),
    contentType: String(data.contentType || "audio/mpeg"),
    format: "mp3",
    disclosure: String(data.disclosure || "AI-generated voice"),
  };
}
