import { parse } from "csv-parse/sync";
import { readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

const require = createRequire(import.meta.url);
const sharp = require("sharp");

const USER_AGENT =
  "VirtualLibrary/1.0 (personal bookshelf; goodreads import)";
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

function derivePhysical(key, pagesIn, bindingHint) {
  const h = hashString(key || "book");
  const pages = pagesIn > 0 ? pagesIn : 280 + Math.round(unit(h, 1) * 220);
  let binding =
    bindingHint ||
    (pages > 420 ? "hardcover" : pages < 260 ? "mass" : "paperback");
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

function htmlToText(input) {
  return String(input || "")
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

function normalizeIsbn(raw) {
  if (!raw) return "";
  const cleaned = String(raw)
    .replace(/^="/, "")
    .replace(/"$/, "")
    .replace(/[=\s"'-]/g, "")
    .trim();
  return /^\d{9}[\dXx]$|^\d{13}$/.test(cleaned) ? cleaned.toUpperCase() : "";
}

function shortTitle(title) {
  return title.replace(/\s*\([^)]*\)\s*$/, "").trim() || title.trim();
}

function normalizeTitle(title) {
  return shortTitle(title)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function titlesCompatible(a, b) {
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

function formatMonthYear(raw) {
  if (!raw) return "";
  const d = new Date(String(raw).replace(/\//g, "-"));
  if (Number.isNaN(d.getTime())) return "";
  return `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

function dateStamp(raw) {
  if (!raw) return 0;
  const d = new Date(String(raw).replace(/\//g, "-"));
  return Number.isNaN(d.getTime()) ? 0 : d.getTime();
}

function mapBinding(raw, pages) {
  const value = String(raw || "").toLowerCase();
  if (value.includes("mass")) return "mass";
  if (
    value.includes("hardcover") ||
    value.includes("hardback") ||
    value.includes("library binding")
  ) {
    return "hardcover";
  }
  if (value.includes("paperback") || value.includes("trade")) return "paperback";
  if (pages > 420) return "hardcover";
  if (pages > 0 && pages < 260) return "mass";
  return "paperback";
}

function mapSubjects(subjects) {
  if (!subjects?.length) return undefined;
  const found = new Set();
  for (const subject of subjects) {
    const s = String(subject).toLowerCase();
    if (/\bscience fiction\b|\bsci-?fi\b|cyberpunk|dystop/.test(s)) found.add("Sci-Fi");
    else if (/\bfantasy\b|fairies|fairy|witchcraft|magic/.test(s)) found.add("Fantasy");
    else if (/\bromance\b|love stories/.test(s)) found.add("Romance");
    else if (/\bmystery\b|\bthriller\b|detective|crime fiction/.test(s)) {
      found.add("Mystery & Thriller");
    } else if (/\bnonfiction\b|\bnon-fiction\b|biography|memoir|history/.test(s)) {
      found.add("Nonfiction");
    } else if (/^fiction$|\bliterary fiction\b/.test(s)) found.add("Fiction");
  }
  return found.size ? [...found] : undefined;
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
    const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
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

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function olJson(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (res.status === 429) {
    await sleep(1500);
    return olJson(url);
  }
  if (!res.ok) return null;
  return res.json();
}

async function searchOl({ isbn, title, author }) {
  const url = new URL("https://openlibrary.org/search.json");
  if (isbn) url.searchParams.set("isbn", isbn);
  else {
    url.searchParams.set("title", title);
    if (author) url.searchParams.set("author", author);
  }
  url.searchParams.set("limit", "5");
  url.searchParams.set(
    "fields",
    "key,title,author_name,first_publish_year,cover_i,isbn,subject,ratings_average,ratings_count,number_of_pages_median,publisher"
  );
  const data = await olJson(url.toString());
  return data?.docs ?? [];
}

async function workDescription(workKey) {
  if (!workKey) return "";
  const data = await olJson(`https://openlibrary.org${workKey}.json`);
  if (!data) return "";
  const raw =
    typeof data.description === "string"
      ? data.description
      : data.description?.value ?? "";
  const text = htmlToText(raw).replace(/\s+/g, " ").trim();
  if (text.length > 420) return `${text.slice(0, 417).trim()}…`;
  return text;
}

function parseShelves(row) {
  const exclusive = (row["Exclusive Shelf"] || "").trim();
  const raw = (row.Bookshelves || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const shelves = [...new Set(raw.filter((s) => s && s !== exclusive))];
  return { status: exclusive || "read", shelves };
}

function parseRow(row) {
  const goodreadsId = String(row["Book Id"] || "").trim();
  const title = (row.Title || "").trim();
  if (!goodreadsId || !title) return null;
  const isbn = normalizeIsbn(row.ISBN);
  const isbn13 = normalizeIsbn(row.ISBN13);
  const pages = Number(row["Number of Pages"] || 0) || 0;
  const year =
    Number(row["Original Publication Year"] || 0) ||
    Number(row["Year Published"] || 0) ||
    0;
  const rating = Number(row["My Rating"] || 0) || 0;
  const { status, shelves } = parseShelves(row);
  const dateRead = (row["Date Read"] || "").trim();
  const dateAdded = (row["Date Added"] || "").trim();
  const finished =
    status === "currently-reading"
      ? "Currently reading"
      : status === "to-read"
        ? "To read"
        : formatMonthYear(dateRead) || formatMonthYear(dateAdded);
  return {
    goodreadsId,
    title,
    author: (row.Author || "Unknown").trim(),
    isbn,
    isbn13,
    pages,
    year,
    rating,
    review: htmlToText(row["My Review"] || ""),
    publisher: (row.Publisher || "").trim(),
    bindingRaw: row.Binding || "",
    status,
    shelves,
    dateRead,
    dateAdded,
    finished,
  };
}

async function enrich(parsed) {
  const key = `goodreads:${parsed.goodreadsId}`;
  const isbn = parsed.isbn13 || parsed.isbn;
  let docs = [];
  if (isbn) {
    docs = await searchOl({ isbn });
    await sleep(350);
  }
  let doc = docs.find((d) => d.title && titlesCompatible(parsed.title, d.title)) ?? docs[0];
  let certain = Boolean(isbn && doc);
  if (!doc) {
    docs = await searchOl({ title: shortTitle(parsed.title), author: parsed.author });
    await sleep(350);
    doc = docs.find((d) => d.title && titlesCompatible(parsed.title, d.title));
    certain = Boolean(doc);
  } else if (!isbn) {
    certain = titlesCompatible(parsed.title, doc.title);
  }

  let cover = "";
  let openLibraryKey = "";
  let blurb = "";
  let communityRating;
  let communityRatingCount;
  let genres;
  let unmatched = !certain;

  if (certain && doc) {
    openLibraryKey = doc.key || "";
    if (doc.cover_i) cover = `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`;
    if (typeof doc.ratings_average === "number") communityRating = Number(doc.ratings_average.toFixed(2));
    if (typeof doc.ratings_count === "number") communityRatingCount = doc.ratings_count;
    genres = mapSubjects(doc.subject);
    blurb = await workDescription(openLibraryKey);
    await sleep(250);
  }

  const pages = parsed.pages || doc?.number_of_pages_median || 0;
  const physical = derivePhysical(key, pages, mapBinding(parsed.bindingRaw, pages));
  const palette = cover ? await sampleCover(cover, key) : fallbackPalette(key);

  return {
    id: `gr-${parsed.goodreadsId}`,
    goodreadsId: parsed.goodreadsId,
    title: parsed.title,
    author: parsed.author,
    genres,
    cover,
    year: parsed.year || doc?.first_publish_year || 0,
    blurb,
    review: parsed.review,
    rating: parsed.rating,
    communityRating,
    communityRatingCount,
    finished: parsed.finished,
    dateRead: parsed.dateRead,
    dateAdded: parsed.dateAdded,
    status: parsed.status,
    shelves: parsed.shelves.length ? parsed.shelves : undefined,
    isbn: parsed.isbn || undefined,
    isbn13: parsed.isbn13 || undefined,
    openLibraryKey: openLibraryKey || undefined,
    publisher: parsed.publisher || doc?.publisher?.[0] || "",
    pages: pages || undefined,
    ...physical,
    spine: palette.spine,
    band: palette.band,
    ink: palette.ink,
    unmatched,
  };
}

function tsValue(v) {
  if (typeof v === "string") return JSON.stringify(v);
  if (typeof v === "boolean" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return `[${v.map((x) => JSON.stringify(x)).join(", ")}]`;
  return JSON.stringify(v);
}

function bookToTs(book) {
  const skip = new Set(["unmatched"]);
  const keys = Object.keys(book).filter((k) => {
    if (skip.has(k)) return false;
    const v = book[k];
    if (v === undefined || v === null) return false;
    if (v === "") return k === "cover" || k === "blurb" || k === "publisher" || k === "finished";
    if (Array.isArray(v) && v.length === 0) return false;
    return true;
  });
  const lines = keys.map((k) => `    ${k}: ${tsValue(book[k])},`);
  return `  {\n${lines.join("\n")}\n  }`;
}

export function parseGoodreadsCsv(text) {
  const records = parse(text, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true,
  });
  const seen = new Set();
  const parsed = [];
  for (const row of records) {
    const item = parseRow(row);
    if (!item) continue;
    if (seen.has(item.goodreadsId)) continue;
    seen.add(item.goodreadsId);
    parsed.push(item);
  }
  return parsed;
}

async function main() {
  const csvPath =
    process.argv[2] ||
    path.join(process.cwd(), "goodreads_library_export.csv");
  const text = await readFile(csvPath, "utf8");
  const parsed = parseGoodreadsCsv(text);
  parsed.sort((a, b) => {
    const aKey = dateStamp(a.dateRead) || dateStamp(a.dateAdded);
    const bKey = dateStamp(b.dateRead) || dateStamp(b.dateAdded);
    return bKey - aKey;
  });

  console.log(`parsed ${parsed.length} unique Goodreads books`);
  const books = [];
  let unmatched = 0;
  let missingCover = 0;
  for (const item of parsed) {
    const book = await enrich(item);
    if (book.unmatched) unmatched += 1;
    if (!book.cover) missingCover += 1;
    books.push(book);
    console.log(
      book.unmatched ? "unmatched" : "ok",
      book.title.slice(0, 48),
      book.cover ? "cover" : "no-cover"
    );
    await sleep(200);
  }

  const header = `export type ReadingStatus = "read" | "currently-reading" | "to-read" | string;

export type Book = {
  id: string;
  goodreadsId?: string;
  title: string;
  author: string;
  genres?: string[];
  cover: string;
  year: number;
  blurb: string;
  review?: string;
  rating: number;
  communityRating?: number;
  communityRatingCount?: number;
  finished: string;
  dateRead?: string;
  dateAdded?: string;
  status?: ReadingStatus;
  shelves?: string[];
  isbn?: string;
  isbn13?: string;
  openLibraryKey?: string;
  recommender?: string;
  publisher: string;
  pages?: number;
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
 * Personal Goodreads library. Refresh with:
 * node scripts/import-goodreads.mjs /path/to/goodreads_library_export.csv
 * Do not commit the raw CSV.
 */
export const books: Book[] = [
`;

  const body = `${header}${books.map(bookToTs).join(",\n")}
];
`;
  const out = path.join(process.cwd(), "src/data/books.ts");
  await writeFile(out, body);
  console.log(
    JSON.stringify(
      {
        imported: books.length,
        unmatched,
        missingCover,
        out,
      },
      null,
      2
    )
  );
}

const isMain = process.argv[1]?.endsWith("import-goodreads.mjs");
if (isMain) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
