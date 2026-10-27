import type { Book } from "@/data/books";

export function hashString(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function unit(hash: number, salt: number): number {
  const mixed = Math.imul(hash ^ (salt * 0x9e3779b9), 0x85ebca6b) >>> 0;
  return (mixed & 0xffff) / 0xffff;
}

export function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

export function slugId(title: string, extra: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return `${base || "book"}-${extra.replace(/[^a-z0-9]+/gi, "").slice(-6) || "0"}`;
}

export type Palette = {
  spine: string;
  band?: string;
  ink: string;
};

export function hslToHex(h: number, s: number, l: number): string {
  const sat = s / 100;
  const lig = l / 100;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = lig - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

export function fallbackPalette(key: string): Palette {
  const h = hashString(key);
  const hue = h % 360;
  return {
    spine: hslToHex(hue, 32, 28),
    band: hslToHex((hue + 28) % 360, 42, 44),
    ink: "#faf7f0",
  };
}

export function inkForSpineLum(lum: number): string {
  return lum > 0.55 ? "#241f19" : "#faf7f0";
}

export type PhysicalInput = {
  key: string;
  pages: number;
};

export type PhysicalProps = Pick<
  Book,
  | "binding"
  | "finish"
  | "width"
  | "height"
  | "lean"
  | "depth"
  | "wear"
  | "face"
  | "caps"
>;

export function derivePhysical(input: PhysicalInput): PhysicalProps {
  const h = hashString(input.key || "book");
  const pages = input.pages > 0 ? input.pages : 280 + Math.round(unit(h, 1) * 220);

  const binding: Book["binding"] =
    pages > 420 ? "hardcover" : pages < 260 ? "mass" : "paperback";

  const finish: Book["finish"] =
    binding === "hardcover" ? "cloth" : unit(h, 2) > 0.5 ? "gloss" : "matte";

  const heightRange =
    binding === "hardcover"
      ? [236, 254]
      : binding === "mass"
        ? [196, 210]
        : [214, 230];
  const height = Math.round(
    heightRange[0] + unit(h, 3) * (heightRange[1] - heightRange[0])
  );

  const jitter = (unit(h, 4) - 0.5) * 6;
  const width = Math.round(clamp(pages * 0.055 + jitter, 16, 58));

  const faces: Book["face"][] = ["serif", "sans", "mono"];
  const face = faces[Math.floor(unit(h, 5) * faces.length)] ?? "serif";

  return {
    binding,
    finish,
    width,
    height,
    lean: -(unit(h, 6) * 5),
    depth: (unit(h, 7) - 0.5) * 14,
    wear: unit(h, 8) * 0.35,
    face,
    caps: unit(h, 9) > 0.62,
  };
}

const MONTHS = [
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

export function formatFinished(date: Date | string | undefined | null): string {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function finishedFromHash(key: string): string {
  const h = hashString(key);
  const year = 2018 + Math.floor(unit(h, 11) * 8);
  const month = Math.floor(unit(h, 12) * 12);
  return `${MONTHS[month]} ${year}`;
}

export function ratingFromHash(key: string): number {
  const u = unit(hashString(key), 13);
  if (u < 0.18) return 0;
  if (u < 0.38) return 3;
  if (u < 0.72) return 4;
  return 5;
}
