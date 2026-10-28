export function htmlToText(input: string): string {
  return input
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\s*\/p\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function normalizeIsbn(raw: string | undefined | null): string {
  if (!raw) return "";
  const cleaned = raw
    .replace(/^="/, "")
    .replace(/"$/, "")
    .replace(/[=\s"'-]/g, "")
    .trim();
  return /^\d{9}[\dXx]$|^\d{13}$/.test(cleaned) ? cleaned.toUpperCase() : "";
}

export function shortTitle(title: string): string {
  return title.replace(/\s*\([^)]*\)\s*$/, "").trim() || title.trim();
}

export function normalizeTitle(title: string): string {
  return shortTitle(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function titlesCompatible(a: string, b: string): boolean {
  const left = normalizeTitle(a);
  const right = normalizeTitle(b);
  if (!left || !right) return false;
  if (left === right) return true;
  if (left.includes(right) || right.includes(left)) return true;
  const aTokens = left.split(" ").filter((t) => t.length > 2);
  const bSet = new Set(right.split(" ").filter((t) => t.length > 2));
  if (aTokens.length === 0 || bSet.size === 0) return false;
  const overlap = aTokens.filter((t) => bSet.has(t)).length;
  return overlap / Math.min(aTokens.length, bSet.size) >= 0.6;
}

export function formatMonthYear(raw: string | undefined | null): string {
  if (!raw) return "";
  const iso = raw.replace(/\//g, "-");
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return `${months[d.getMonth()]} ${d.getFullYear()}`;
}

export function dateStamp(raw: string | undefined | null): number {
  if (!raw) return 0;
  const d = new Date(raw.replace(/\//g, "-"));
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

export function formatCount(n: number): string {
  return new Intl.NumberFormat("en-US").format(n);
}
