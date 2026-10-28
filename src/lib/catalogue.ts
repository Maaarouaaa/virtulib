import type { Book } from "@/data/books";
import { derivePhysical, fallbackPalette } from "@/lib/bookPhysics";
import { mapSubjects } from "@/lib/bookMatch";
import type { CatalogueDoc } from "@/lib/openLibraryServer";

export type CatalogueResult = {
  key: string;
  title: string;
  author: string;
  year: number;
  cover: string;
  isbn: string[];
  subjects: string[];
  editionCount: number;
  communityRating?: number;
  communityRatingCount?: number;
  pages: number;
  publisher: string;
};

export function docToResult(doc: CatalogueDoc): CatalogueResult | null {
  if (!doc.title || !doc.key) return null;
  return {
    key: doc.key,
    title: doc.title,
    author: doc.author_name?.[0] ?? "Unknown",
    year: doc.first_publish_year ?? 0,
    cover: doc.cover_i
      ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-L.jpg`
      : "",
    isbn: doc.isbn ?? [],
    subjects: doc.subject ?? [],
    editionCount: doc.edition_count ?? 0,
    communityRating:
      typeof doc.ratings_average === "number"
        ? Number(doc.ratings_average.toFixed(2))
        : undefined,
    communityRatingCount:
      typeof doc.ratings_count === "number" ? doc.ratings_count : undefined,
    pages: doc.number_of_pages_median ?? 0,
    publisher: doc.publisher?.[0] ?? "",
  };
}

export function catalogueToBook(result: CatalogueResult): Book {
  const physical = derivePhysical({ key: result.key, pages: result.pages });
  const palette = fallbackPalette(result.key);
  return {
    id: `ol-${result.key.replace(/[^a-zA-Z0-9]/g, "")}`,
    title: result.title,
    author: result.author,
    genres: mapSubjects(result.subjects),
    cover: result.cover,
    year: result.year,
    blurb: "",
    rating: 0,
    communityRating: result.communityRating,
    communityRatingCount: result.communityRatingCount,
    finished: "",
    publisher: result.publisher,
    pages: result.pages || undefined,
    isbn: result.isbn[0],
    isbn13: result.isbn.find((value) => value.length === 13),
    openLibraryKey: result.key,
    spine: palette.spine,
    band: palette.band,
    ink: palette.ink,
    ...physical,
  };
}
