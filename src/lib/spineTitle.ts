export const THIN_SPINE_PX = 22;
export const TWO_LINE_MIN_PX = 24;
export const MIN_SPINE_FONT = 11;

const TRAILING_SERIES = /\s*[\(\[]\s*[^)\]]+?\s*[\)\]]\s*$/;
const SUBTITLE = /\s*[:–—−]\s+.+$/;

export type SpineFace = "literary" | "sans" | "caps";

export type SpineFit = {
  text: string;
  fontSize: number;
  lines: 1 | 2;
  face: SpineFace;
};

export function isThinSpine(width: number, threshold = THIN_SPINE_PX): boolean {
  return width < threshold;
}

export function seriesFromTitle(title: string): string | undefined {
  const match = title.match(/\(([^)]+)\)\s*$/) ?? title.match(/\[([^\]]+)\]\s*$/);
  const value = match?.[1]?.trim();
  return value || undefined;
}

export function displayTitle(title: string, maxChars?: number): string {
  let next = title.trim();
  while (TRAILING_SERIES.test(next)) {
    next = next.replace(TRAILING_SERIES, "").trim();
  }
  next = next.replace(SUBTITLE, "").trim();
  if (!next) next = title.trim();

  if (maxChars && next.length > maxChars) {
    const slice = next.slice(0, maxChars);
    const atWord = slice.replace(/\s+\S*$/, "").trim();
    const base =
      atWord.length >= Math.min(6, Math.floor(maxChars * 0.45))
        ? atWord
        : slice.trim();
    return `${base}…`;
  }
  return next;
}

export function charAdvance(face: SpineFace, fontSize: number): number {
  const em = face === "literary" ? 0.46 : face === "sans" ? 0.51 : 0.6;
  return fontSize * em;
}

export function lineCapacity(
  height: number,
  fontSize: number,
  face: SpineFace
): number {
  const usable = Math.max(72, height * 0.8);
  return Math.max(8, Math.floor(usable / charAdvance(face, fontSize)));
}

export function balanceLines(title: string): string {
  const words = title.split(/\s+/).filter(Boolean);
  if (words.length < 2) return title;
  const mid = title.length / 2;
  let best = 1;
  let bestScore = Infinity;
  let acc = 0;
  for (let i = 0; i < words.length - 1; i++) {
    acc += words[i].length + (i === 0 ? 0 : 1);
    const glue = /^(and|of|the|a|to|in)$/i.test(words[i]) ? -3 : 0;
    const score = Math.abs(acc - mid) + glue;
    if (score < bestScore) {
      bestScore = score;
      best = i + 1;
    }
  }
  return `${words.slice(0, best).join(" ")}\n${words.slice(best).join(" ")}`;
}

function maxFontForWidth(width: number): number {
  if (width >= 42) return 15;
  if (width >= 34) return 14;
  if (width >= 28) return 13;
  if (width >= 24) return 12;
  return MIN_SPINE_FONT;
}

function fitWithFace(
  text: string,
  width: number,
  height: number,
  face: SpineFace
): Omit<SpineFit, "face"> {
  const allowTwo = width >= TWO_LINE_MIN_PX;
  const maxFont = maxFontForWidth(width);

  for (let font = maxFont; font >= MIN_SPINE_FONT; font -= 1) {
    if (text.length <= lineCapacity(height, font, face)) {
      return { text, fontSize: font, lines: 1 };
    }
  }

  if (allowTwo) {
    const twoMax = width >= 36 ? 13 : 12;
    for (let font = Math.min(maxFont, twoMax); font >= MIN_SPINE_FONT; font -= 1) {
      const cap = lineCapacity(height, font, face) * 2 - 1;
      if (text.length <= cap) {
        return { text: balanceLines(text), fontSize: font, lines: 2 };
      }
    }
  }

  const lines: 1 | 2 = allowTwo ? 2 : 1;
  const cap =
    lineCapacity(height, MIN_SPINE_FONT, face) * (lines === 2 ? 2 : 1) -
    (lines === 2 ? 1 : 0);
  const shortened = displayTitle(text, cap);
  return {
    text: lines === 2 ? balanceLines(shortened) : shortened,
    fontSize: MIN_SPINE_FONT,
    lines,
  };
}

export function fitSpineTitle(
  title: string,
  width: number,
  height: number,
  face: SpineFace
): SpineFit {
  const text = displayTitle(title);
  const preferred = fitWithFace(text, width, height, face);
  if (!preferred.text.includes("…") || face === "literary") {
    return { ...preferred, face };
  }
  const relaxed = fitWithFace(text, width, height, "literary");
  if (!relaxed.text.includes("…")) {
    return { ...relaxed, face: "literary" };
  }
  return { ...preferred, face };
}
