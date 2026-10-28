export const THIN_SPINE_PX = 22;

const TRAILING_SERIES = /\s*[\(\[]\s*[^)\]]+?\s*[\)\]]\s*$/;
const SUBTITLE = /\s*[:–—−]\s+.+$/;

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

export function spineTitleLimit(
  height: number,
  fontSize: number,
  caps = false
): number {
  const usable = Math.max(48, height * 0.64);
  const advance = fontSize * (caps ? 0.88 : 0.74);
  return Math.max(8, Math.floor(usable / advance));
}

export function spineLetterSize(width: number): number {
  return Math.min(13, Math.max(10, Math.round(width * 0.42)));
}
