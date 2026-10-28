import type { Book } from "@/data/books";
import {
  derivePhysical,
  fallbackPalette,
  inkForSpineLum,
  slugId,
  type Palette,
} from "@/lib/bookPhysics";

export type OpenLibraryDoc = {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  cover_i?: number;
  number_of_pages_median?: number;
  publisher?: string[];
};

export type SearchResult = {
  key: string;
  title: string;
  author: string;
  year: number;
  cover: string;
  coverId: number;
  pages: number;
  publisher: string;
};

function coverUrl(coverId: number): string {
  return `https://covers.openlibrary.org/b/id/${coverId}-L.jpg`;
}

export async function searchBooks(
  q: string,
  signal?: AbortSignal
): Promise<SearchResult[]> {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", q);
  url.searchParams.set("limit", "12");
  url.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,publisher"
  );

  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error("Open Library search failed.");
  const data = (await res.json()) as { docs?: OpenLibraryDoc[] };

  return (data.docs ?? [])
    .filter((doc) => Boolean(doc.title && doc.key))
    .map((doc) => ({
      key: doc.key,
      title: doc.title,
      author: doc.author_name?.[0] ?? "Unknown",
      year: doc.first_publish_year ?? 0,
      cover: doc.cover_i ? coverUrl(doc.cover_i) : "",
      coverId: doc.cover_i ?? 0,
      pages: doc.number_of_pages_median ?? 0,
      publisher: doc.publisher?.[0] ?? "",
    }));
}

function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("")}`;
}

function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === 0) return 0;
  return (max - min) / max;
}

export function readCoverPalette(src: string): Promise<Palette> {
  if (typeof window === "undefined") {
    return Promise.resolve(fallbackPalette(src));
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        const targetW = 80;
        const scale = targetW / Math.max(1, img.naturalWidth);
        canvas.width = targetW;
        canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) {
          resolve(fallbackPalette(src));
          return;
        }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        resolve(samplePalette(image.data, canvas.width, canvas.height, src));
      } catch {
        resolve(fallbackPalette(src));
      }
    };
    img.onerror = () => resolve(fallbackPalette(src));
    img.src = src;
  });
}

export function samplePalette(
  data: Uint8ClampedArray | Buffer | Uint8Array,
  width: number,
  height: number,
  fallbackKey: string
): Palette {
  const edgeW = Math.max(1, Math.round(width * 0.06));
  let rSum = 0;
  let gSum = 0;
  let bSum = 0;
  let n = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < edgeW; x++) {
      const i = (y * width + x) * 4;
      const a = data[i + 3] ?? 255;
      if (a < 20) continue;
      rSum += data[i] ?? 0;
      gSum += data[i + 1] ?? 0;
      bSum += data[i + 2] ?? 0;
      n++;
    }
  }

  if (n === 0) return fallbackPalette(fallbackKey);

  const spine = rgbToHex(rSum / n, gSum / n, bSum / n);
  const spineLum = luminance(rSum / n, gSum / n, bSum / n);

  let bestSat = -1;
  let bandRgb = [rSum / n, gSum / n, bSum / n];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i] ?? 0;
      const g = data[i + 1] ?? 0;
      const b = data[i + 2] ?? 0;
      const a = data[i + 3] ?? 255;
      if (a < 20) continue;
      const lum = luminance(r, g, b);
      if (lum < 0.18 || lum > 0.82) continue;
      const sat = saturation(r, g, b);
      if (sat > bestSat) {
        bestSat = sat;
        bandRgb = [r, g, b];
      }
    }
  }

  return {
    spine,
    band: rgbToHex(bandRgb[0], bandRgb[1], bandRgb[2]),
    ink: inkForSpineLum(spineLum),
  };
}

export async function buildBook(
  result: SearchResult & { recommender?: string; note?: string }
): Promise<Book> {
  const physical = derivePhysical({ key: result.key, pages: result.pages });
  const palette = await readCoverPalette(result.cover);

  return {
    id: slugId(result.title, result.key),
    title: result.title,
    author: result.author,
    cover: result.cover,
    year: result.year,
    blurb: result.note?.trim() || "",
    rating: 0,
    finished: result.recommender ? `Recommended by ${result.recommender}` : "",
    recommender: result.recommender,
    publisher: result.publisher,
    spine: palette.spine,
    band: palette.band,
    ink: palette.ink,
    ...physical,
  };
}
