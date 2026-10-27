"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Book } from "@/data/books";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type LibraryFilterProps = {
  books: Book[];
  onChange: (visible: Book[] | null) => void;
};

type SearchResponse = {
  ids?: string[];
  error?: string;
  fallback?: boolean;
};

function localMatch(books: Book[], query: string): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return books
    .map((book) => {
      const hay =
        `${book.title} ${book.author} ${(book.genres ?? []).join(" ")} ${book.blurb}`.toLowerCase();
      const score = terms.reduce((sum, term) => sum + (hay.includes(term) ? 1 : 0), 0);
      return { id: book.id, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 20)
    .map((row) => row.id);
}

export function LibraryFilter({ books, onChange }: LibraryFilterProps) {
  const [query, setQuery] = useState("");
  const [genre, setGenre] = useState<string | null>(null);
  const [status, setStatus] = useState<string>("");
  const [aiIds, setAiIds] = useState<string[] | null>(null);
  const [error, setError] = useState<string>("");
  const reqId = useRef(0);
  const searching = query.trim().length >= 2;
  const rankedIds = searching ? aiIds : null;

  const genres = useMemo(() => {
    const counts = new Map<string, number>();
    for (const book of books) {
      for (const g of book.genres ?? []) {
        counts.set(g, (counts.get(g) ?? 0) + 1);
      }
    }
    return [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  }, [books]);

  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;

    const id = ++reqId.current;
    const handle = window.setTimeout(async () => {
      setStatus("Reading the shelves…");
      setError("");
      try {
        const res = await fetch("/api/search", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: q }),
        });
        const data = (await res.json()) as SearchResponse;
        if (id !== reqId.current) return;
        if (!res.ok || data.error) {
          const ids = localMatch(books, q);
          setAiIds(ids);
          setStatus(ids.length ? `${ids.length} found` : "Nothing quite fits.");
          setError(data.error ?? "");
          return;
        }
        const known = new Set(books.map((b) => b.id));
        const ids = (data.ids ?? []).filter((item) => known.has(item));
        setAiIds(ids);
        setStatus(ids.length ? `${ids.length} found` : "Nothing quite fits.");
      } catch {
        if (id !== reqId.current) return;
        const ids = localMatch(books, q);
        setAiIds(ids);
        setStatus(ids.length ? `${ids.length} found` : "Nothing quite fits.");
      }
    }, 600);

    return () => window.clearTimeout(handle);
  }, [query, books]);

  useEffect(() => {
    let list: Book[] | null = null;
    if (rankedIds) {
      const rank = new Map(rankedIds.map((id, i) => [id, i]));
      list = books
        .filter((book) => rank.has(book.id))
        .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
    }
    if (genre) {
      const source = list ?? books;
      list = source.filter((book) => book.genres?.includes(genre));
    }
    onChange(list);
  }, [rankedIds, genre, books, onChange]);

  return (
    <div className="mt-8 space-y-4">
      <div className="relative max-w-xl">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="What are you looking for?"
          className="h-12 rounded-full border-foreground/15 bg-card/60 px-5 font-sans text-base shadow-none placeholder:italic placeholder:text-muted-foreground/80"
        />
        <p className="mt-2 min-h-[1.2em] font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {searching ? error || status : ""}
        </p>
      </div>
      {genres.length > 0 ? (
        <div className="no-scrollbar flex gap-2 overflow-x-auto whitespace-nowrap">
          {genres.map((name) => {
            const active = genre === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => setGenre(active ? null : name)}
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
  );
}
