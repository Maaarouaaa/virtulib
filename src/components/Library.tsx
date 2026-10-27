"use client";

import { useCallback, useState } from "react";
import { BookDetail } from "@/components/BookDetail";
import { LibraryFilter } from "@/components/LibraryFilter";
import { RecommendBookDialog } from "@/components/RecommendBookDialog";
import { Shelf, type ShelfRect } from "@/components/Shelf";
import { TypedTitle } from "@/components/TypedTitle";
import { Button } from "@/components/ui/button";
import { books } from "@/data/books";
import { useRecommendations } from "@/hooks/useRecommendations";
import type { Book } from "@/data/books";

type OpenBook = {
  book: Book;
  rect: ShelfRect;
};

export function Library() {
  const [shown, setShown] = useState<Book[] | null>(null);
  const [open, setOpen] = useState<OpenBook | null>(null);
  const [recommendOpen, setRecommendOpen] = useState(false);
  const { recommendations, justAdded, recommend } = useRecommendations();

  const onFilter = useCallback((visible: Book[] | null) => {
    setShown(visible);
  }, []);

  const visible = shown ?? books;
  const emptyLibrary = books.length === 0;
  const noMatch = !emptyLibrary && visible.length === 0;

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
        <LibraryFilter books={books} onChange={onFilter} />
      </header>

      <main className={recommendations.length ? "relative z-10 pb-2" : "relative z-10 pb-16"}>
        {emptyLibrary ? (
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
              Try a looser wish, or clear the genre filter.
            </p>
          </div>
        ) : (
          <Shelf
            books={visible}
            disabled={Boolean(open)}
            onOpen={(book, rect) => setOpen({ book, rect })}
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
              onOpen={(book, rect) => setOpen({ book, rect })}
            />
          </section>
        ) : null}
      </main>

      {open ? (
        <BookDetail
          book={open.book}
          rect={open.rect}
          books={
            recommendations.some((item) => item.id === open.book.id)
              ? recommendations
              : visible
          }
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
