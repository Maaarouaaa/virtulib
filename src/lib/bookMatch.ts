import type { Book } from "@/data/books";
import { normalizeIsbn } from "@/lib/text";

export type CatalogueHit = {
  key: string;
  isbn?: string[];
};

export function libraryIndex(books: Book[]) {
  const isbns = new Set<string>();
  const keys = new Set<string>();
  for (const book of books) {
    const isbn = normalizeIsbn(book.isbn);
    const isbn13 = normalizeIsbn(book.isbn13);
    if (isbn) isbns.add(isbn);
    if (isbn13) isbns.add(isbn13);
    if (book.openLibraryKey) keys.add(book.openLibraryKey);
  }
  return { isbns, keys };
}

export function isInLibrary(
  hit: CatalogueHit,
  index: ReturnType<typeof libraryIndex>
): boolean {
  if (hit.key && index.keys.has(hit.key)) return true;
  for (const raw of hit.isbn ?? []) {
    const isbn = normalizeIsbn(raw);
    if (isbn && index.isbns.has(isbn)) return true;
  }
  return false;
}

export function mapSubjects(subjects: string[] | undefined): string[] | undefined {
  if (!subjects?.length) return undefined;
  const found = new Set<string>();
  for (const subject of subjects) {
    const s = subject.toLowerCase();
    if (/\bscience fiction\b|\bsci-?fi\b|cyberpunk|dystop/.test(s)) {
      found.add("Sci-Fi");
    } else if (/\bfantasy\b|fairies|fairy|witchcraft|magic/.test(s)) {
      found.add("Fantasy");
    } else if (/\bromance\b|love stories/.test(s)) {
      found.add("Romance");
    } else if (/\bmystery\b|\bthriller\b|detective|crime fiction/.test(s)) {
      found.add("Mystery & Thriller");
    } else if (/\bnonfiction\b|\bnon-fiction\b|biography|memoir|history/.test(s)) {
      found.add("Nonfiction");
    } else if (/^fiction$|\bliterary fiction\b/.test(s)) {
      found.add("Fiction");
    }
  }
  return found.size ? [...found] : undefined;
}

export function mapBinding(
  raw: string | undefined,
  pages: number
): "hardcover" | "paperback" | "mass" {
  const value = (raw ?? "").toLowerCase();
  if (value.includes("mass")) return "mass";
  if (value.includes("hardcover") || value.includes("hardback") || value.includes("library binding")) {
    return "hardcover";
  }
  if (value.includes("paperback") || value.includes("trade")) return "paperback";
  if (pages > 420) return "hardcover";
  if (pages > 0 && pages < 260) return "mass";
  return "paperback";
}

export function statusLabel(book: Book): string {
  if (book.recommender) return `Recommended by ${book.recommender}`;
  if (book.status === "currently-reading") return "Currently reading";
  if (book.status === "to-read") return "To read";
  if (book.dateRead) return `Finished ${book.finished || book.dateRead}`;
  if (book.status === "read") {
    return book.finished ? `Read · added ${book.finished}` : "Read";
  }
  return book.finished || "On the shelf";
}
