"use client";

import { useMemo, useState } from "react";
import { BookDetail } from "@/components/BookDetail";
import { CatalogueResults } from "@/components/CatalogueResults";
import { LibraryFilter } from "@/components/LibraryFilter";
import { RecommendBookDialog } from "@/components/RecommendBookDialog";
import { Shelf, type ShelfRect } from "@/components/Shelf";
import { TypedTitle } from "@/components/TypedTitle";
import { Button } from "@/components/ui/button";
import { books } from "@/data/books";
import { useCatalogueSearch } from "@/hooks/useCatalogueSearch";
import { useRecommendations } from "@/hooks/useRecommendations";
import type { Book } from "@/data/books";
import { libraryIndex, isInLibrary } from "@/lib/bookMatch";
import { catalogueToBook, type CatalogueResult } from "@/lib/catalogue";
import { matchesShelfFilters } from "@/lib/shelfFilters";

type OpenBook = {
  book: Book;
  rect: ShelfRect;
  collection: Book[];
};

export function Library() {
  const [query, setQuery] = useState("");
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [shelfStatus, setShelfStatus] = useState<string | null>(null);
  const [open, setOpen] = useState<OpenBook | null>(null);
  const [recommendOpen, setRecommendOpen] = useState(false);
  const { recommendations, justAdded, recommend } = useRecommendations();
  const catalogue = useCatalogueSearch(query);
  const index = useMemo(() => libraryIndex(books), []);

  const inLibraryKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const result of catalogue.results) {
      if (isInLibrary({ key: result.key, isbn: result.isbn }, index)) {
        keys.add(result.key);
      }
    }
    return keys;
  }, [catalogue.results, index]);

  const visible = useMemo(() => {
    return books.filter((book) =>
      matchesShelfFilters(book, selectedGenres, shelfStatus)
    );
  }, [selectedGenres, shelfStatus]);

  const emptyLibrary = books.length === 0;
  const noMatch = !emptyLibrary && visible.length === 0;
  const searching = catalogue.active;
  const searchStatus =
    catalogue.status === "loading"
      ? "Searching Open Library…"
      : catalogue.error
        ? catalogue.error
        : catalogue.results.length
          ? `${catalogue.numFound} found`
          : "Nothing quite fits.";

  function openFromShelf(book: Book, rect: ShelfRect, collection: Book[]) {
    setOpen({ book, rect, collection });
  }

  function openFromCatalogue(result: CatalogueResult, rect: DOMRect) {
    const book = catalogueToBook(result);
    const collection = catalogue.results.map(catalogueToBook);
    setOpen({
      book,
      rect: { left: rect.left, top: rect.top, width: rect.width, height: rect.height },
      collection,
    });
  }

  return (
    <div className="grain relative min-h-screen overflow-hidden">
      <div
        aria-hidden
        className="animate-drift pointer-events-none absolute -top-32 left-1/2 h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,var(--glow),transparent_68%)] opacity-70"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_circle_at_20%_-10%,oklch(0.93_0.02_85/0.7),transparent_55%),radial-gradient(900px_circle_at_90%_20%,oklch(0.88_0.03_70/0.45),transparent_50%)]"
      />

      <header className="relative z-10 mx-auto max-w-6xl px-6 pt-12 pb-4 sm:pt-16">
        <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
          A personal archive
        </p>
        <div className="mt-5 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <TypedTitle />
          <div className="flex flex-wrap items-center gap-4 lg:mb-2">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
              {books.length} {books.length === 1 ? "volume" : "volumes"}
            </p>
            <Button
              variant="outline"
              className="rounded-full px-4 font-sans"
              onClick={() => setRecommendOpen(true)}
            >
              Recommend a book
            </Button>
          </div>
        </div>
        <LibraryFilter
          books={books}
          query={query}
          onQueryChange={setQuery}
          selectedGenres={selectedGenres}
          onSelectedGenresChange={setSelectedGenres}
          status={shelfStatus}
          onStatusChange={setShelfStatus}
          searching={searching}
          searchStatus={searchStatus}
        />
      </header>

      <main className={recommendations.length ? "relative z-10 pb-2" : "relative z-10 pb-16"}>
        {searching ? (
          <CatalogueResults
            results={catalogue.results}
            numFound={catalogue.numFound}
            status={catalogue.status}
            error={catalogue.error}
            hasMore={catalogue.hasMore}
            inLibraryKeys={inLibraryKeys}
            onOpen={openFromCatalogue}
            onLoadMore={catalogue.loadMore}
            onRetry={catalogue.retry}
          />
        ) : emptyLibrary ? (
          <div className="mx-auto max-w-xl px-6 py-24 text-center">
            <p className="font-display text-3xl italic">The shelves are waiting.</p>
            <p className="mt-4 text-muted-foreground">
              Attach your Goodreads export (
              <code className="font-mono text-sm">goodreads_library_export.csv</code>
              ) and I will set the spines from your real library.
            </p>
          </div>
        ) : noMatch ? (
          <div className="mx-auto max-w-xl px-6 py-24 text-center">
            <p className="font-display text-3xl italic">No books match.</p>
            <p className="mt-3 text-muted-foreground">
              {selectedGenres.length > 0 && shelfStatus
                ? "Nothing on this shelf is tagged with the selected genres. Clear genres or switch reading status."
                : selectedGenres.length > 0
                  ? "Nothing on the shelf is tagged with the selected genres. Clear genres to see the rest of your library."
                  : "Try a different reading status."}
            </p>
          </div>
        ) : (
          <Shelf
            books={visible}
            disabled={Boolean(open)}
            onOpen={(book, rect) => openFromShelf(book, rect, visible)}
          />
        )}

        {recommendations.length > 0 ? (
          <section className="pt-2">
            <div className="mx-auto max-w-6xl px-6">
              <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
                Recommended to me
              </p>
            </div>
            <Shelf
              books={recommendations}
              justAdded={justAdded}
              disabled={Boolean(open)}
              onOpen={(book, rect) =>
                openFromShelf(book, rect, recommendations)
              }
            />
          </section>
        ) : null}
      </main>

      {open ? (
        <BookDetail
          book={open.book}
          rect={open.rect}
          books={open.collection}
          onChange={(book) => setOpen((prev) => (prev ? { ...prev, book } : prev))}
          onClose={() => setOpen(null)}
        />
      ) : null}

      <RecommendBookDialog
        open={recommendOpen}
        onOpenChange={setRecommendOpen}
        onRecommend={recommend}
      />
    </div>
  );
}
