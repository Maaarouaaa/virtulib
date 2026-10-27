"use client";

import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { BookSpine } from "@/components/BookSpine";
import type { Book } from "@/data/books";
import { cn } from "@/lib/utils";

export type ShelfRect = { left: number; top: number; width: number; height: number };

type ShelfProps = {
  books: Book[];
  justAdded?: string | null;
  onOpen: (book: Book, rect: ShelfRect, index: number) => void;
  disabled?: boolean;
};

const LOOP_MIN = 2600;

function applyCurve(row: HTMLElement, viewport: HTMLElement) {
  const vr = viewport.getBoundingClientRect();
  const center = vr.left + vr.width / 2;
  const half = Math.max(1, vr.width / 2);
  const spines = row.querySelectorAll<HTMLElement>("[data-spine]");
  spines.forEach((el) => {
    const r = el.getBoundingClientRect();
    const t = (r.left + r.width / 2 - center) / half;
    const clamped = Math.max(-1, Math.min(1, t));
    const ry = Math.sign(clamped) * 34 * Math.pow(Math.abs(clamped), 1.35);
    el.style.setProperty("--ry", `${ry}deg`);
  });
}

export function Shelf({ books, justAdded, onOpen, disabled = false }: ShelfProps) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const rowRef = useRef<HTMLDivElement>(null);
  const [looping, setLooping] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const drag = useRef<{
    active: boolean;
    moved: boolean;
    x: number;
    scroll: number;
  } | null>(null);

  const copies = looping ? 3 : 1;
  const rendered = Array.from({ length: copies }, (_, copy) =>
    books.map((book, i) => ({ book, i, copy, key: `${copy}-${book.id}-${i}` }))
  ).flat();

  const measure = useCallback(() => {
    const scroller = scrollerRef.current;
    const row = rowRef.current;
    if (!scroller || !row) return;
    const natural = books.reduce((sum, b) => sum + b.width + 2, 0);
    const shouldLoop = natural > LOOP_MIN;
    setLooping(shouldLoop);
    setOverflowing(scroller.scrollWidth > scroller.clientWidth + 4);
    applyCurve(row, scroller);
  }, [books]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(scroller);
    const frame = requestAnimationFrame(() => measure());
    return () => {
      cancelAnimationFrame(frame);
      ro.disconnect();
    };
  }, [measure, looping]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !looping) return;
    requestAnimationFrame(() => {
      scroller.scrollLeft = scroller.scrollWidth / 3;
    });
  }, [looping, books]);

  useEffect(() => {
    if (!justAdded) return;
    const scroller = scrollerRef.current;
    const target = scroller?.querySelector<HTMLElement>(
      `[data-book-id="${CSS.escape(justAdded)}"]`
    );
    target?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [justAdded]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const row = rowRef.current;
    if (!scroller || !row) return;

    function onScroll() {
      if (!scroller || !row) return;
      if (looping) {
        const seg = scroller.scrollWidth / 3;
        if (seg > 0) {
          if (scroller.scrollLeft < seg * 0.5) scroller.scrollLeft += seg;
          else if (scroller.scrollLeft >= seg * 1.5) scroller.scrollLeft -= seg;
        }
      }
      applyCurve(row, scroller);
    }

    function onWheel(e: WheelEvent) {
      if (!scroller) return;
      if (Math.abs(e.deltaY) >= Math.abs(e.deltaX)) {
        e.preventDefault();
        scroller.scrollLeft += e.deltaY;
      }
    }

    scroller.addEventListener("scroll", onScroll, { passive: true });
    scroller.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      scroller.removeEventListener("scroll", onScroll);
      scroller.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onScroll);
    };
  }, [looping, books]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (disabled) return;
      const scroller = scrollerRef.current;
      if (!scroller) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        scroller.scrollBy({ left: -320, behavior: "smooth" });
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        scroller.scrollBy({ left: 320, behavior: "smooth" });
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [disabled]);

  return (
    <div className="relative">
      {overflowing ? (
        <>
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />
        </>
      ) : null}
      <div
        ref={scrollerRef}
        className={cn(
          "no-scrollbar overflow-x-auto overflow-y-visible pt-16 pb-6 select-none",
          !overflowing && "flex"
        )}
        style={{ perspective: 1400, perspectiveOrigin: "50% 65%" }}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const scroller = scrollerRef.current;
          if (!scroller) return;
          drag.current = {
            active: true,
            moved: false,
            x: e.clientX,
            scroll: scroller.scrollLeft,
          };
        }}
        onPointerMove={(e) => {
          if (!drag.current?.active) return;
          const scroller = scrollerRef.current;
          if (!scroller) return;
          const dx = e.clientX - drag.current.x;
          if (Math.abs(dx) > 4) {
            drag.current.moved = true;
            if (!scroller.hasPointerCapture(e.pointerId)) {
              scroller.setPointerCapture(e.pointerId);
            }
          }
          if (drag.current.moved) {
            scroller.scrollLeft = drag.current.scroll - dx;
          }
        }}
        onPointerUp={() => {
          drag.current = drag.current
            ? { ...drag.current, active: false }
            : null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerLeave={() => {
          if (drag.current?.active) drag.current.active = false;
        }}
      >
        <div
          ref={rowRef}
          className={cn(
            "flex items-end gap-[2px] px-8",
            !overflowing && "mx-auto justify-center"
          )}
          style={{ transformStyle: "preserve-3d" }}
        >
          {rendered.map(({ book, i, key }) => (
            <div key={key} data-spine data-book-id={book.id} style={{ "--ry": "0deg" } as CSSProperties}>
              <BookSpine
                book={book}
                justAdded={justAdded === book.id}
                suppressHover={disabled}
                onOpen={(opened, rect) => {
                  if (drag.current?.moved) return;
                  onOpen(opened, {
                    left: rect.left,
                    top: rect.top,
                    width: rect.width,
                    height: rect.height,
                  }, i);
                }}
              />
            </div>
          ))}
        </div>
      </div>
      <div className="pointer-events-none mx-8 h-px bg-gradient-to-r from-transparent via-foreground/25 to-transparent" />
      <div className="pointer-events-none mx-10 h-8 bg-gradient-to-b from-foreground/8 to-transparent blur-md" />
    </div>
  );
}
