"use client";

import { useEffect, useState } from "react";
import type { Book } from "@/data/books";
import { buildBook, searchBooks, type SearchResult } from "@/lib/openLibrary";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

type RecommendBookDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecommend: (book: Book) => Promise<unknown>;
};

export function RecommendBookDialog({
  open,
  onOpenChange,
  onRecommend,
}: RecommendBookDialogProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [picked, setPicked] = useState<SearchResult | null>(null);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setQuery("");
      setResults([]);
      setPicked(null);
      setName("");
      setNote("");
      setFormError("");
      setSearchError("");
      setSearching(false);
    }
  }

  const looking = open && !picked && query.trim().length >= 2;

  useEffect(() => {
    if (!looking) return;
    const q = query.trim();
    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      setSearching(true);
      try {
        const docs = await searchBooks(q, controller.signal);
        setResults(docs);
        setSearchError(docs.length ? "" : "No titles with covers turned up.");
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setSearchError("Could not reach Open Library.");
      } finally {
        setSearching(false);
      }
    }, 280);
    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [query, looking]);

  async function submit() {
    if (!picked) return;
    const recommender = name.trim();
    if (recommender.length < 1 || recommender.length > 60) {
      setFormError("Your name should be between 1 and 60 characters.");
      return;
    }
    if (note.length > 500) {
      setFormError("Keep the note under 500 characters.");
      return;
    }
    setSubmitting(true);
    setFormError("");
    try {
      const book = await buildBook({
        ...picked,
        recommender,
        note: note.trim(),
      });
      await onRecommend(book);
      onOpenChange(false);
    } catch {
      setFormError("The book slipped from the cart. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[min(88vh,640px)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl italic font-normal">
            Recommend a book
          </DialogTitle>
          <DialogDescription>
            Search the real stacks, then leave it on the shelf for me.
          </DialogDescription>
        </DialogHeader>

        {!picked ? (
          <div className="space-y-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by title or author…"
              className="h-10"
            />
            <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              {looking && searching ? "Looking it up…" : looking ? searchError : ""}
            </p>
            <ul className="space-y-2">
              {(looking ? results : []).map((result) => (
                <li key={result.key}>
                  <button
                    type="button"
                    onClick={() => setPicked(result)}
                    className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted/70"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={result.cover}
                      alt=""
                      className="h-14 w-10 rounded-sm object-cover ring-1 ring-foreground/10"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-display text-lg leading-tight">
                        {result.title}
                      </span>
                      <span className="block truncate text-sm text-muted-foreground">
                        {result.author}
                        {result.year ? ` · ${result.year}` : ""}
                      </span>
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">
                      Pick
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex gap-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={picked.cover}
                alt=""
                className="h-28 w-20 rounded-sm object-cover ring-1 ring-foreground/10"
              />
              <div>
                <p className="font-display text-xl leading-tight">{picked.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {picked.author}
                  {picked.year ? ` · ${picked.year}` : ""}
                </p>
                <button
                  type="button"
                  className="mt-3 font-mono text-[10px] uppercase tracking-[0.16em] text-primary"
                  onClick={() => setPicked(null)}
                >
                  Choose another
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="recommender">Your name</Label>
              <Input
                id="recommender"
                value={name}
                maxLength={60}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Why should I read it?</Label>
              <Textarea
                id="note"
                value={note}
                maxLength={500}
                onChange={(e) => setNote(e.target.value)}
                placeholder="A line or two is plenty."
              />
            </div>
            {formError ? (
              <p className="text-sm text-destructive">{formError}</p>
            ) : null}
            <Button onClick={submit} disabled={submitting} className="w-full">
              {submitting ? "Shelving…" : "Leave it on the shelf"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
