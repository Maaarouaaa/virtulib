"use client";

import { useMemo } from "react";
import type { Book } from "@/data/books";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type LibraryFilterProps = {
  books: Book[];
  query: string;
  onQueryChange: (query: string) => void;
  selectedGenres: string[];
  onSelectedGenresChange: (genres: string[]) => void;
  status: string | null;
  onStatusChange: (status: string | null) => void;
  searching: boolean;
  searchStatus: string;
};

const STATUS_LABEL: Record<string, string> = {
  read: "Read",
  "currently-reading": "Currently reading",
  "to-read": "To read",
};

export function LibraryFilter({
  books,
  query,
  onQueryChange,
  selectedGenres,
  onSelectedGenresChange,
  status,
  onStatusChange,
  searching,
  searchStatus,
}: LibraryFilterProps) {
  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of books) {
      for (const g of book.genres ?? []) {
        counts.set(g, (counts.get(g) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [books]);

  const statuses = useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of books) {
      if (book.status) counts.set(book.status, (counts.get(book.status) ?? 0) + 1);
    }
    const order = ["currently-reading", "read", "to-read"];
    return [...counts.keys()].sort(
      (a, b) => (order.indexOf(a) + 10) - (order.indexOf(b) + 10)
    );
  }, [books]);

  return (
    <div className="mt-8 space-y-4">
      <div className="relative max-w-xl">
        <Input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search books or authors…"
          className="h-12 rounded-full border-foreground/15 bg-card/60 px-5 font-sans text-base shadow-none placeholder:italic placeholder:text-muted-foreground/80"
        />
        <p className="mt-2 min-h-[1.2em] font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {searching ? searchStatus : ""}
        </p>
      </div>
      {!searching && (statuses.length > 0 || genres.length > 0) ? (
        <div className="space-y-2">
          {statuses.length > 0 ? (
            <div className="no-scrollbar flex gap-2 overflow-x-auto whitespace-nowrap">
              {statuses.map((name) => {
                const active = status === name;
                return (
                  <button
                    key={name}
                    type="button"
                    onClick={() => onStatusChange(active ? null : name)}
                    className={cn(
                      "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors duration-500",
                      active
                        ? "border-primary/40 bg-primary text-primary-foreground"
                        : "border-foreground/12 bg-card/50 text-muted-foreground hover:border-foreground/25 hover:text-foreground"
                    )}
                  >
                    {STATUS_LABEL[name] ?? name}
                  </button>
                );
              })}
            </div>
          ) : null}
          {genres.length > 0 ? (
            <div className="no-scrollbar flex gap-2 overflow-x-auto whitespace-nowrap">
              {selectedGenres.length > 0 ? (
                <button
                  type="button"
                  onClick={() => onSelectedGenresChange([])}
                  className="rounded-full border border-foreground/18 bg-transparent px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] text-foreground transition-colors duration-500 hover:border-foreground/35"
                >
                  Clear genres
                </button>
              ) : null}
              {genres.map((name) => {
                const active = selectedGenres.includes(name);
                return (
                  <button
                    key={name}
                    type="button"
                    aria-pressed={active}
                    onClick={() =>
                      onSelectedGenresChange(
                        active
                          ? selectedGenres.filter((genre) => genre !== name)
                          : [...selectedGenres, name]
                      )
                    }
                    className={cn(
                      "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-[0.16em] transition-colors duration-500",
                      active
                        ? "border-primary/40 bg-primary text-primary-foreground"
                        : "border-foreground/12 bg-card/50 text-muted-foreground hover:border-foreground/25 hover:text-foreground"
                    )}
                  >
                    {name}
                  </button>
                );
              })}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
