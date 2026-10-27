import { writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const TITLES = [
  { q: "Pride and Prejudice Jane Austen", genres: ["Fiction", "Romance"] },
  { q: "To Kill a Mockingbird Harper Lee", genres: ["Fiction"] },
  { q: "The Great Gatsby F Scott Fitzgerald", genres: ["Fiction"] },
  { q: "Jane Eyre Charlotte Bronte", genres: ["Fiction", "Romance"] },
  { q: "Beloved Toni Morrison", genres: ["Fiction"] },
  { q: "Little Women Louisa May Alcott", genres: ["Fiction"] },
  { q: "The Catcher in the Rye J D Salinger", genres: ["Fiction"] },
  { q: "Their Eyes Were Watching God Zora Neale Hurston", genres: ["Fiction"] },
  { q: "Tuesdays with Morrie Mitch Albom", genres: ["Nonfiction"] },
  { q: "Sapiens Yuval Noah Harari", genres: ["Nonfiction"] },
  { q: "Educated Tara Westover", genres: ["Nonfiction"] },
  { q: "The Diary of a Young Girl Anne Frank", genres: ["Nonfiction"] },
  { q: "Into Thin Air Jon Krakauer", genres: ["Nonfiction"] },
  { q: "The Immortal Life of Henrietta Lacks Rebecca Skloot", genres: ["Nonfiction"] },
  { q: "Quiet Susan Cain", genres: ["Nonfiction"] },
  { q: "The Warmth of Other Suns Isabel Wilkerson", genres: ["Nonfiction"] },
  { q: "Dune Frank Herbert", genres: ["Sci-Fi"] },
  { q: "Neuromancer William Gibson", genres: ["Sci-Fi"] },
  { q: "The Left Hand of Darkness Ursula K Le Guin", genres: ["Sci-Fi"] },
  { q: "Foundation Isaac Asimov", genres: ["Sci-Fi"] },
  { q: "The Martian Andy Weir", genres: ["Sci-Fi"] },
  { q: "Kindred Octavia Butler", genres: ["Sci-Fi", "Fiction"] },
  { q: "Hyperion Dan Simmons", genres: ["Sci-Fi"] },
  { q: "The Handmaid's Tale Margaret Atwood", genres: ["Sci-Fi", "Fiction"] },
  { q: "The Girl with the Dragon Tattoo Stieg Larsson", genres: ["Mystery & Thriller"] },
  { q: "Gone Girl Gillian Flynn", genres: ["Mystery & Thriller"] },
  { q: "And Then There Were None Agatha Christie", genres: ["Mystery & Thriller"] },
  { q: "The Big Sleep Raymond Chandler", genres: ["Mystery & Thriller"] },
  { q: "In the Woods Tana French", genres: ["Mystery & Thriller"] },
  { q: "The Maltese Falcon Dashiell Hammett", genres: ["Mystery & Thriller"] },
  { q: "Rebecca Daphne du Maurier", genres: ["Mystery & Thriller", "Fiction"] },
  { q: "The Silent Patient Alex Michaelides", genres: ["Mystery & Thriller"] },
  { q: "The Hobbit J R R Tolkien", genres: ["Fantasy"] },
  { q: "The Name of the Wind Patrick Rothfuss", genres: ["Fantasy"] },
  { q: "Circe Madeline Miller", genres: ["Fantasy", "Fiction"] },
  { q: "A Wizard of Earthsea Ursula K Le Guin", genres: ["Fantasy"] },
  { q: "The Night Circus Erin Morgenstern", genres: ["Fantasy"] },
  { q: "Piranesi Susanna Clarke", genres: ["Fantasy"] },
  { q: "The Priory of the Orange Tree Samantha Shannon", genres: ["Fantasy"] },
  { q: "Jonathan Strange and Mr Norrell Susanna Clarke", genres: ["Fantasy"] },
  { q: "The Notebook Nicholas Sparks", genres: ["Romance"] },
  { q: "Outlander Diana Gabaldon", genres: ["Romance", "Fantasy"] },
  { q: "Beach Read Emily Henry", genres: ["Romance"] },
  { q: "Red White and Royal Blue Casey McQuiston", genres: ["Romance"] },
  { q: "The Kiss Quotient Helen Hoang", genres: ["Romance"] },
  { q: "Persuasion Jane Austen", genres: ["Romance", "Fiction"] },
  { q: "The Seven Husbands of Evelyn Hugo Taylor Jenkins Reid", genres: ["Fiction", "Romance"] },
  { q: "Normal People Sally Rooney", genres: ["Fiction", "Romance"] },
];

function hashString(input) {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function unit(hash, salt) {
  const mixed = Math.imul(hash ^ (salt * 0x9e3779b9), 0x85ebca6b) >>> 0;
  return (mixed & 0xffff) / 0xffff;
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function slugId(title, extra) {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 28);
  return `${base || "book"}-${String(extra).replace(/[^a-z0-9]+/gi, "").slice(-6) || "0"}`;
}

function hslToHex(h, s, l) {
  const sat = s / 100;
  const lig = l / 100;
  const a = sat * Math.min(lig, 1 - lig);
  const f = (n) => {
    const k = (n + h / 30) % 12;
    const color = lig - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function fallbackPalette(key) {
  const h = hashString(key);
  const hue = h % 360;
  return {
    spine: hslToHex(hue, 32, 28),
    band: hslToHex((hue + 28) % 360, 42, 44),
    ink: "#faf7f0",
  };
}

function derivePhysical(key, pagesIn) {
  const h = hashString(key || "book");
  const pages = pagesIn > 0 ? pagesIn : 280 + Math.round(unit(h, 1) * 220);
  const binding = pages > 420 ? "hardcover" : pages < 260 ? "mass" : "paperback";
  const finish = binding === "hardcover" ? "cloth" : unit(h, 2) > 0.5 ? "gloss" : "matte";
  const heightRange =
    binding === "hardcover" ? [236, 254] : binding === "mass" ? [196, 210] : [214, 230];
  const height = Math.round(heightRange[0] + unit(h, 3) * (heightRange[1] - heightRange[0]));
  const jitter = (unit(h, 4) - 0.5) * 6;
  const width = Math.round(clamp(pages * 0.055 + jitter, 16, 58));
  const faces = ["serif", "sans", "mono"];
  const face = faces[Math.floor(unit(h, 5) * faces.length)] ?? "serif";
  return {
    binding,
    finish,
    width,
    height,
    lean: Number((-(unit(h, 6) * 5)).toFixed(2)),
    depth: Number(((unit(h, 7) - 0.5) * 14).toFixed(2)),
    wear: Number((unit(h, 8) * 0.35).toFixed(2)),
    face,
    caps: unit(h, 9) > 0.62,
  };
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function finishedFromHash(key) {
  const h = hashString(key);
  const year = 2018 + Math.floor(unit(h, 11) * 8);
  const month = Math.floor(unit(h, 12) * 12);
  return `${MONTHS[month]} ${year}`;
}

function ratingFromHash(key) {
  const u = unit(hashString(key), 13);
  if (u < 0.18) return 0;
  if (u < 0.38) return 3;
  if (u < 0.72) return 4;
  return 5;
}

function rgbToHex(r, g, b) {
  return `#${[r, g, b]
    .map((c) => Math.round(c).toString(16).padStart(2, "0"))
    .join("")}`;
}

function luminance(r, g, b) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function saturation(r, g, b) {
  const max = Math.max(r, g, b) / 255;
  const min = Math.min(r, g, b) / 255;
  if (max === 0) return 0;
  return (max - min) / max;
}

function samplePalette(data, width, height, fallbackKey) {
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
    ink: spineLum > 0.55 ? "#241f19" : "#faf7f0",
  };
}

async function sampleCover(url, key) {
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "VirtualLibrary/1.0 (personal bookshelf)" },
    });
    if (!res.ok) return fallbackPalette(key);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length < 800) return fallbackPalette(key);
    const { data, info } = await sharp(buf)
      .resize(80)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    return samplePalette(data, info.width, info.height, key);
  } catch {
    return fallbackPalette(key);
  }
}

async function fetchJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "VirtualLibrary/1.0 (personal bookshelf)" },
  });
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

function cleanBlurb(raw, title, author, year) {
  const text =
    typeof raw === "string"
      ? raw
      : raw && typeof raw === "object" && "value" in raw
        ? String(raw.value)
        : "";
  const trimmed = text.replace(/\s+/g, " ").trim();
  if (trimmed.length > 40) {
    return trimmed.length > 420 ? `${trimmed.slice(0, 417).trim()}…` : trimmed;
  }
  return year
    ? `${title} by ${author}, first published in ${year}.`
    : `${title} by ${author}.`;
}

async function fetchOne(entry) {
  const url = new URL("https://openlibrary.org/search.json");
  url.searchParams.set("q", entry.q);
  url.searchParams.set("limit", "5");
  url.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i,number_of_pages_median,publisher"
  );
  const data = await fetchJson(url);
  const doc = (data.docs ?? []).find((d) => d.title && d.cover_i);
  if (!doc) return null;

  let description = "";
  try {
    const work = await fetchJson(`https://openlibrary.org${doc.key}.json`);
    description = work.description ?? "";
  } catch {
    description = "";
  }

  const key = doc.key;
  const title = doc.title;
  const author = doc.author_name?.[0] ?? "Unknown";
  const year = doc.first_publish_year ?? 0;
  const cover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
  const pages = doc.number_of_pages_median ?? 0;
  const publisher = doc.publisher?.[0] ?? "";
  const physical = derivePhysical(key, pages);
  const palette = await sampleCover(cover, key);

  return {
    id: slugId(title, key),
    title,
    author,
    genres: entry.genres,
    cover,
    year,
    blurb: cleanBlurb(description, title, author, year),
    rating: ratingFromHash(key),
    finished: finishedFromHash(key),
    publisher,
    ...physical,
    spine: palette.spine,
    band: palette.band,
    ink: palette.ink,
  };
}

function tsValue(v) {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return `[${v.map((x) => JSON.stringify(x)).join(", ")}]`;
  return JSON.stringify(v);
}

function bookToTs(book) {
  const keys = [
    "id",
    "title",
    "author",
    "genres",
    "cover",
    "year",
    "blurb",
    "rating",
    "finished",
    "publisher",
    "binding",
    "finish",
    "spine",
    "band",
    "ink",
    "face",
    "caps",
    "width",
    "height",
    "lean",
    "depth",
    "wear",
  ];
  const lines = keys
    .filter((k) => book[k] !== undefined)
    .map((k) => `    ${k}: ${tsValue(book[k])},`);
  return `  {\n${lines.join("\n")}\n  }`;
}

const MONTH_INDEX = Object.fromEntries(MONTHS.map((m, i) => [m, i]));

function finishedStamp(finished) {
  const [mon, year] = String(finished).split(" ");
  return Number(year) * 12 + (MONTH_INDEX[mon] ?? 0);
}

async function main() {
  const books = [];
  const seen = new Set();
  for (const entry of TITLES) {
    try {
      const book = await fetchOne(entry);
      if (!book) {
        console.warn("skip (no cover)", entry.q);
        continue;
      }
      if (seen.has(book.id)) {
        console.warn("skip (dup)", book.title);
        continue;
      }
      seen.add(book.id);
      books.push(book);
      console.log("ok", book.title, book.spine, book.width + "px");
    } catch (err) {
      console.warn("fail", entry.q, err.message);
    }
    await new Promise((r) => setTimeout(r, 220));
  }

  books.sort((a, b) => finishedStamp(b.finished) - finishedStamp(a.finished));

  const body = `export type Book = {
  id: string;
  title: string;
  author: string;
  genres?: string[];
  cover: string;
  year: number;
  blurb: string;
  rating: number;
  finished: string;
  recommender?: string;
  publisher: string;
  binding: "hardcover" | "paperback" | "mass";
  finish: "cloth" | "gloss" | "matte";
  spine: string;
  band?: string;
  ink: string;
  face: "serif" | "sans" | "mono";
  caps?: boolean;
  width: number;
  height: number;
  lean: number;
  depth: number;
  wear: number;
  spineImage?: string;
};

/**
 * Starter catalogue from Open Library so the shelf is livable on first run.
 * Overwrite this file with a Goodreads import (see README) to make it yours.
 */
export const books: Book[] = [
${books.map(bookToTs).join(",\n")}
];
`;

  const out = path.join(process.cwd(), "src/data/books.ts");
  await writeFile(out, body);
  console.log(`wrote ${books.length} books to ${out}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
