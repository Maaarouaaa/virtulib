"use client";

import { useEffect, useMemo, useState } from "react";
import { COVER_W, faceFont } from "@/components/bookFaces";
import type { ShelfRect } from "@/components/Shelf";
import type { Book } from "@/data/books";
import { Button } from "@/components/ui/button";
import { statusLabel } from "@/lib/bookMatch";
import { formatCount } from "@/lib/text";
import { cn } from "@/lib/utils";

type BookDetailProps = {
  book: Book;
  rect: ShelfRect;
  books: Book[];
  onClose: () => void;
  onChange: (book: Book) => void;
};

function PersonalRating({ rating }: { rating: number }) {
  if (rating <= 0) return <span>Your rating · Not rated</span>;
  const full = Math.round(rating);
  return (
    <span>
      Your rating · {"★".repeat(full)}
      {"☆".repeat(Math.max(0, 5 - full))}
    </span>
  );
}

function CommunityRating({
  average,
  count,
}: {
  average?: number;
  count?: number;
}) {
  if (average == null) return null;
  return (
    <p className="mt-2 font-mono text-[12px] uppercase tracking-[0.14em] text-muted-foreground">
      Open Library {average.toFixed(1)}★
      {count != null ? ` · ${formatCount(count)} ratings` : ""}
    </p>
  );
}

export function BookDetail({ book, rect, books, onClose, onChange }: BookDetailProps) {
  const [out, setOut] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [fetchedBlurb, setFetchedBlurb] = useState("");
  const [vp, setVp] = useState(() =>
    typeof window === "undefined"
      ? { w: 1200, h: 800 }
      : { w: window.innerWidth, h: window.innerHeight }
  );

  useEffect(() => {
    const onResize = () =>
      setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setOut(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (book.blurb || !book.openLibraryKey) return;
    const controller = new AbortController();
    fetch(
      `/api/catalogue/work?key=${encodeURIComponent(book.openLibraryKey)}`,
      { signal: controller.signal }
    )
      .then((res) => res.json())
      .then((data: { description?: string }) => {
        if (typeof data.description === "string" && data.description.trim()) {
          setFetchedBlurb(data.description.trim());
        }
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [book.blurb, book.openLibraryKey, book.id]);

  function retract() {
    if (leaving) return;
    setLeaving(true);
    setOut(false);
    window.setTimeout(onClose, 620);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        retract();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        step(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        step(1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [book.id, books, leaving]);

  function step(dir: number) {
    const idx = books.findIndex((b) => b.id === book.id);
    if (idx < 0 || books.length === 0) return;
    const next = books[(idx + dir + books.length) % books.length];
    if (next) onChange(next);
  }

  const pose = useMemo(() => {
    const narrow = vp.w < 720;
    const coverH = Math.min(vp.h * (narrow ? 0.42 : 0.6), 480);
    const scale = coverH / Math.max(1, rect.height);
    const coverW = COVER_W * scale;
    const targetLeft = narrow ? (vp.w - coverW) / 2 : Math.max(32, vp.w * 0.1);
    const targetTop = (vp.h - coverH) / 2;
    const hingeX = rect.left + rect.width;
    const hingeY = rect.top + rect.height / 2;
    const dx = targetLeft - hingeX;
    const dy = targetTop + coverH / 2 - hingeY;
    return { scale, coverW, coverH, dx, dy, narrow, targetLeft, targetTop };
  }, [vp, rect]);

  const visible = out && !leaving;
  const personal = Boolean(book.goodreadsId);
  const description = book.blurb || fetchedBlurb;

  return (
    <div className="fixed inset-0 z-[80]">
      <button
        type="button"
        aria-label="Return book to shelf"
        className="absolute inset-0 bg-background/70 backdrop-blur-xl"
        style={{
          opacity: visible ? 1 : 0,
          transition: "opacity 700ms ease",
        }}
        onClick={retract}
      />

      <div
        className="pointer-events-none fixed"
        style={{
          left: rect.left,
          top: rect.top,
          width: rect.width,
          height: rect.height,
          transformOrigin: "right center",
          transformStyle: "preserve-3d",
          perspective: 1400,
          transform: visible
            ? `translate3d(${pose.dx}px, ${pose.dy}px, 0) scale(${pose.scale}) rotateY(-90deg)`
            : "translate3d(0,0,0) scale(1) rotateY(-26deg)",
          transition: "transform 900ms cubic-bezier(0.16, 1, 0.3, 1)",
          zIndex: 90,
        }}
      >
        <div className="absolute inset-0" style={{ transformStyle: "preserve-3d" }}>
          <div
            className="absolute inset-0 overflow-hidden"
            style={{ background: book.spine }}
          />
          <div
            className="absolute top-0 left-full overflow-hidden bg-card"
            style={{
              width: COVER_W,
              height: rect.height,
              transformOrigin: "left center",
              transform: "rotateY(90deg)",
              backfaceVisibility: "hidden",
            }}
          >
            {book.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.cover}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <div
                className={cn(
                  "flex h-full flex-col justify-between p-5",
                  faceFont[book.face]
                )}
                style={{ background: book.spine, color: book.ink }}
              >
                <p className="text-xl leading-tight">{book.title}</p>
                <p className="font-sans text-sm">{book.author}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <aside
        className={cn(
          "pointer-events-auto absolute z-[95] max-h-[80vh] overflow-y-auto max-w-[min(420px,calc(100%-2rem))] px-6",
          pose.narrow
            ? "right-4 bottom-6 left-4"
            : "top-1/2 right-[6vw] -translate-y-1/2"
        )}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0)" : "translateY(16px)",
          transition: "opacity 700ms ease 260ms, transform 700ms cubic-bezier(0.16, 1, 0.3, 1) 260ms",
        }}
      >
        <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-muted-foreground">
          {statusLabel(book)}
        </p>
        <h2 className="mt-3 font-display text-[clamp(1.8rem,4vw,2.6rem)] leading-[1.1] italic">
          {book.title}
        </h2>
        <p className="mt-2 font-sans text-lg text-foreground/80">{book.author}</p>
        {description ? (
          <p className="mt-4 max-w-prose whitespace-pre-wrap text-[15px] leading-7 text-foreground/75">
            {description}
          </p>
        ) : null}
        {book.review ? (
          <div className="mt-5">
            <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Your review
            </p>
            <p className="mt-2 max-w-prose whitespace-pre-wrap text-[15px] leading-7 text-foreground/80">
              {book.review}
            </p>
          </div>
        ) : null}
        {personal ? (
          <p className="mt-4 font-mono text-sm tracking-[0.16em] text-primary">
            <PersonalRating rating={book.rating} />
          </p>
        ) : null}
        <CommunityRating
          average={book.communityRating}
          count={book.communityRatingCount}
        />
        <div className="mt-8 flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => step(-1)}>
            Previous
          </Button>
          <Button variant="outline" onClick={() => step(1)}>
            Next
          </Button>
          <Button onClick={retract}>Shelve it</Button>
        </div>
      </aside>
    </div>
  );
}
