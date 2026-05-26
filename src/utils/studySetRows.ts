import { sanitizeText } from "./validation";

export type StudySetRowInput = {
  id?: string;
  word: string;
  reading: string;
  meaningKo: string;
};

export function parseStudySetRows(text: string): StudySetRowInput[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const cols = line
        .split(/\t|,| \/ | - | — | – /)
        .map((x) => sanitizeText(x, 180))
        .filter(Boolean);
      if (cols.length >= 3) return { word: cols[0], reading: cols[1], meaningKo: cols.slice(2).join(" ") };
      if (cols.length === 2) return { word: cols[0], reading: cols[0], meaningKo: cols[1] };
      return { word: cols[0] || "", reading: cols[0] || "", meaningKo: "" };
    })
    .filter((row) => row.word && row.meaningKo);
}
