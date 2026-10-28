import type { Book } from "@/data/books";
import { hashString, unit } from "./bookPhysics.ts";
import type { SpineFace } from "./spineTitle";

export type SpinePlace = "center" | "high";
export type ThinMark = "none" | "diamond" | "lozenge" | "plus" | "bar";

export type ThinDecor = {
  rules: boolean;
  band: boolean;
  mark: ThinMark;
};

export type SpineMaterial = {
  grainX: number;
  grainY: number;
  grainScale: number;
  sheen: number;
  inkFade: number;
  curve: number;
};

export function spineFace(id: string): SpineFace {
  const u = unit(hashString(id), 3);
  if (u < 0.42) return "literary";
  if (u < 0.74) return "sans";
  return "caps";
}

export function spinePlace(id: string): SpinePlace {
  return unit(hashString(id), 4) > 0.55 ? "high" : "center";
}

export function letteredRules(id: string): boolean {
  return unit(hashString(id), 7) > 0.58;
}

export function letteredBand(id: string): boolean {
  return unit(hashString(id), 8) > 0.78;
}

export function thinDecoration(id: string): ThinDecor {
  const h = hashString(id);
  const kind = unit(h, 5);
  const markRoll = unit(h, 6);
  const marks: ThinMark[] = ["diamond", "lozenge", "plus", "bar"];
  const mark = marks[Math.floor(markRoll * marks.length)] ?? "diamond";

  if (kind < 0.2) return { rules: false, band: false, mark: "none" };
  if (kind < 0.42) return { rules: true, band: false, mark: "none" };
  if (kind < 0.6) return { rules: false, band: true, mark: "none" };
  if (kind < 0.78) return { rules: false, band: false, mark };
  if (kind < 0.9) return { rules: true, band: false, mark };
  return { rules: false, band: true, mark };
}

export function spineMaterial(
  id: string,
  finish: Book["finish"],
  wear: number
): SpineMaterial {
  const h = hashString(id);
  return {
    grainX: Math.round(unit(h, 11) * 11),
    grainY: Math.round(unit(h, 12) * 13),
    grainScale: 0.88 + unit(h, 13) * 0.42,
    sheen: (finish === "gloss" ? 0.62 : 0.48) + unit(h, 14) * 0.28,
    inkFade: Math.max(0.74, 0.9 - wear * 0.28 - unit(h, 15) * 0.05),
    curve: 0.72 + unit(h, 16) * 0.4,
  };
}

export function isLightInk(ink: string): boolean {
  const hex = ink.replace("#", "");
  if (hex.length < 6) return true;
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 150;
}

export function letterShadow(
  ink: string,
  kind: "emboss" | "print"
): string {
  const light = isLightInk(ink);
  if (kind === "print") {
    return light
      ? "0 0.5px 0 rgb(0 0 0 / 0.22)"
      : "0 0.5px 0 rgb(255 255 255 / 0.16)";
  }
  return light
    ? "0 1px 0 rgb(0 0 0 / 0.2), 0 -0.5px 0 rgb(255 255 255 / 0.1)"
    : "0 1px 0 rgb(255 255 255 / 0.2), 0 -0.5px 0 rgb(0 0 0 / 0.16)";
}

export function faceClass(face: SpineFace): string {
  if (face === "sans") return "font-sans";
  return "font-display";
}

export function faceTracking(face: SpineFace): string {
  if (face === "literary") return "0.02em";
  if (face === "sans") return "0.035em";
  return "0.1em";
}
