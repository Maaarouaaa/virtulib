import type { Book } from "@/data/books";

export function matchesShelfFilters(
  book: Book,
  selectedGenres: readonly string[],
  status: string | null
): boolean {
  if (status && book.status !== status) return false;
  if (selectedGenres.length === 0) return true;
  const tags = book.genres ?? [];
  return selectedGenres.some((genre) => tags.includes(genre));
}
