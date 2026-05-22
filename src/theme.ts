export const COLORS = {
  bg: "#07091F",
  panel: "#101331",
  card: "#171A3B",
  card2: "#202650",
  elevated: "#242A58",
  field: "#1A1F45",
  line: "#323A70",
  lineSoft: "rgba(255,255,255,0.08)",
  text: "#F7F8FF",
  muted: "#A9B0D0",
  dim: "#767D9F",
  blue: "#5062FF",
  blueDark: "#3948D8",
  violet: "#7B5CF6",
  cyan: "#69D7FF",
  gold: "#F6C85F",
  red: "#FF6B7A",
  green: "#50D890",
  overlay: "rgba(2,3,14,0.72)",
} as const;

export const RADII = {
  sm: 10,
  md: 14,
  card: 18,
  cardLg: 24,
  sheet: 30,
  pill: 999,
} as const;

export const SPACING = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  pageX: 20,
  gap: 10,
} as const;

export const TYPO = {
  logo: 26,
  display: 32,
  h1: 28,
  h1Line: 36,
  h2: 20,
  h2Line: 27,
  h3: 16,
  h3Line: 23,
  body: 14,
  bodyLine: 22,
  small: 12,
  smallLine: 18,
  micro: 11,
  microLine: 15,
  nav: 10,
  badge: 11,
  word: 32,
  wordLarge: 38,
} as const;

export const FONT_WEIGHT = {
  regular: "400",
  medium: "500",
  semibold: "600",
  bold: "700",
  heavy: "800",
} as const;

export function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export function formatKoreanPercent(n: number) {
  return `${Math.round(n)}%`;
}

export function nowMs() {
  return Date.now();
}
