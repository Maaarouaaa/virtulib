"use client";

import type { CatalogueResult } from "@/lib/catalogue";
import { formatCount } from "@/lib/text";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type CatalogueResultsProps = {
  results: CatalogueResult[];
  numFound: number;
  status: "idle" | "loading" | "error";
  error: string;
  hasMore: boolean;
  inLibraryKeys: Set<string>;
  onOpen: (result: CatalogueResult, rect: DOMRect) => void;
  onLoadMore: () => void;
  onRetry: () => void;
};

function OpenLibraryRating({
  average,
  count,
}: {
  average?: number;
  count?: number;
}) {
  if (average == null) {
    return (
      <span className="text-muted-foreground">Open Library · no rating yet</span>
    );
  }
  return (
    <span>
      Open Library {average.toFixed(1)}★
      {count != null ? ` · ${formatCount(count)} ratings` : ""}
    </span>
  );
}

export function CatalogueResults({
  results,
  numFound,
  status,
  error,
  hasMore,
  inLibraryKeys,
  onOpen,
  onLoadMore,
  onRetry,
}: CatalogueResultsProps) {
  return (
    <section className="mx-auto max-w-6xl px-6 pb-16">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.28em] text-muted-foreground">
            Open Library catalogue
          </p>
          <p className="mt-1 font-display text-2xl italic">
            {status === "loading" && results.length === 0
              ? "Searching the stacks…"
              : numFound
                ? `${formatCount(numFound)} titles`
                : "No titles found"}
          </p>
        </div>
      </div>

      {status === "error" && results.length === 0 ? (
        <div className="rounded-xl bg-card/70 px-5 py-8 text-center ring-1 ring-foreground/8">
          <p className="font-display text-2xl italic">The catalogue slipped.</p>
          <p className="mt-2 text-muted-foreground">{error}</p>
          <Button className="mt-5" onClick={onRetry}>
            Try again
          </Button>
        </div>
      ) : null}

      {status === "idle" && results.length === 0 && !error ? (
        <p className="py-12 text-center text-muted-foreground">
          Nothing in Open Library matched that search.
        </p>
      ) : null}

      <ul className="space-y-2">
        {results.map((result) => {
          const owned = inLibraryKeys.has(result.key);
          return (
            <li key={result.key}>
              <button
                type="button"
                onClick={(event) =>
                  onOpen(result, event.currentTarget.getBoundingClientRect())
                }
                className="flex w-full items-center gap-4 rounded-xl bg-card/55 p-3 text-left ring-1 ring-foreground/6 transition-colors hover:bg-card"
              >
                <span
                  className="relative h-[72px] w-[48px] shrink-0 overflow-hidden rounded-sm ring-1 ring-foreground/10"
                  style={{ background: "var(--secondary)" }}
                >
                  {result.cover ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={result.cover}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="flex h-full items-center justify-center px-1 text-center font-display text-[10px] leading-tight">
                      {result.title}
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-display text-xl leading-tight">
                    {result.title}
                  </span>
                  <span className="mt-1 block truncate text-sm text-foreground/75">
                    {result.author}
                    {result.year ? ` · ${result.year}` : ""}
                  </span>
                  <span className="mt-1 block font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                    <OpenLibraryRating
                      average={result.communityRating}
                      count={result.communityRatingCount}
                    />
                  </span>
                </span>
                {owned ? (
                  <span className="shrink-0 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                    In my library
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>

      {status === "loading" && results.length > 0 ? (
        <p className="mt-4 font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          Fetching more…
        </p>
      ) : null}

      {error && results.length > 0 ? (
        <div className="mt-4 flex items-center gap-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        </div>
      ) : null}

      {hasMore && status !== "error" ? (
        <div className="mt-6 flex justify-center">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={status === "loading"}
            className={cn("rounded-full px-5")}
          >
            {status === "loading" ? "Loading…" : "Load more"}
          </Button>
        </div>
      ) : null}
    </section>
  );
}
