"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { COVER_W, faceFont } from "@/components/bookFaces";
import type { Book } from "@/data/books";
import { cn } from "@/lib/utils";

type BookSpineProps = {
  book: Book;
  onOpen: (book: Book, rect: DOMRect) => void;
  justAdded?: boolean;
  suppressHover?: boolean;
};

const finishSheen: Record<Book["finish"], string> = {
  cloth:
    "linear-gradient(90deg, transparent 0%, rgb(255 255 255 / 0.08) 18%, rgb(255 255 255 / 0.02) 42%, rgb(0 0 0 / 0.16) 78%, rgb(0 0 0 / 0.08) 100%)",
  gloss:
    "linear-gradient(90deg, rgb(255 255 255 / 0.22) 0%, transparent 28%, rgb(255 255 255 / 0.34) 48%, transparent 62%, rgb(0 0 0 / 0.22) 100%)",
  matte:
    "linear-gradient(90deg, rgb(255 255 255 / 0.06) 0%, transparent 40%, rgb(0 0 0 / 0.12) 100%)",
};

const finishTexture: Record<Book["finish"], string> = {
  cloth:
    "repeating-linear-gradient(90deg, rgb(255 255 255 / 0.04) 0 1px, transparent 1px 3px), repeating-linear-gradient(0deg, rgb(0 0 0 / 0.05) 0 1px, transparent 1px 4px)",
  gloss: "linear-gradient(180deg, rgb(255 255 255 / 0.08), transparent 40%)",
  matte:
    "repeating-linear-gradient(180deg, rgb(0 0 0 / 0.03) 0 1px, transparent 1px 3px)",
};

export function BookSpine({
  book,
  onOpen,
  justAdded = false,
  suppressHover = false,
}: BookSpineProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [hovered, setHovered] = useState(false);
  const [cardPos, setCardPos] = useState<{ left: number; top: number } | null>(
    null
  );
  const leaveTimer = useRef<number | null>(null);
  const titleFont = faceFont[book.face];

  const pull = hovered && !suppressHover ? 96 : 0;
  const lift = hovered && !suppressHover ? -26 : 0;
  const lean = hovered && !suppressHover ? 0 : book.lean;

  function clearLeave() {
    if (leaveTimer.current) {
      window.clearTimeout(leaveTimer.current);
      leaveTimer.current = null;
    }
  }

  function onEnter() {
    clearLeave();
    const rect = buttonRef.current?.getBoundingClientRect();
    if (rect) {
      setCardPos({ left: rect.left + rect.width / 2, top: rect.top - 14 });
    }
    setHovered(true);
  }

  function onLeave() {
    leaveTimer.current = window.setTimeout(() => {
      setHovered(false);
      setCardPos(null);
    }, 90);
  }

  useEffect(() => () => clearLeave(), []);

  useEffect(() => {
    if (!hovered) return;
    function update() {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        setCardPos({ left: rect.left + rect.width / 2, top: rect.top - 14 });
      }
    }
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [hovered]);

  const shortTitle =
    book.title.length > 42 ? `${book.title.slice(0, 40).trim()}…` : book.title;

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={`${book.title} by ${book.author}`}
        onPointerEnter={onEnter}
        onPointerLeave={onLeave}
        onFocus={onEnter}
        onBlur={onLeave}
        onClick={() => {
          const rect = buttonRef.current?.getBoundingClientRect();
          if (rect) onOpen(book, rect);
        }}
        className={cn(
          "relative shrink-0 origin-bottom cursor-pointer border-0 bg-transparent p-0 text-left",
          justAdded && "animate-shelve-in"
        )}
        style={{
          width: book.width,
          height: book.height,
          zIndex: hovered && !suppressHover ? 40 : undefined,
          "--spine-w": `${book.width}px`,
        } as CSSProperties}
      >
        <span
          className="absolute inset-0 block"
          style={{
            transformStyle: "preserve-3d",
            transform: `rotateY(var(--ry, 0deg)) rotateZ(${lean}deg) translateZ(${
              pull + book.depth
            }px) translateY(${lift}px)`,
            transition: "transform 720ms cubic-bezier(0.16, 1, 0.3, 1)",
          }}
        >
          <span
            className="absolute inset-0 overflow-hidden"
            style={{
              background: book.spine,
              boxShadow:
                "inset 1px 0 0 rgb(255 255 255 / 0.14), inset -1px 0 0 rgb(0 0 0 / 0.28), 2px 8px 16px rgb(40 28 16 / 0.18)",
            }}
          >
            {book.cover ? (
              <span
                aria-hidden
                className="absolute inset-y-0 left-0 w-[42%] opacity-55"
                style={{
                  backgroundImage: `url(${book.cover})`,
                  backgroundSize: `${COVER_W}px 100%`,
                  backgroundPosition: "left center",
                  backgroundRepeat: "no-repeat",
                  mixBlendMode: "multiply",
                }}
              />
            ) : null}
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, rgb(0 0 0 / 0.18), transparent 28%, ${book.spine} 72%)`,
              }}
            />
            {book.band ? (
              <>
                <span
                  aria-hidden
                  className="absolute inset-x-0 top-0 h-[3px]"
                  style={{ background: book.band }}
                />
                <span
                  aria-hidden
                  className="absolute inset-x-0 bottom-0 h-[3px]"
                  style={{ background: book.band }}
                />
              </>
            ) : null}
            <span
              className={cn(
                "absolute inset-x-0 top-[14%] bottom-[18%] flex items-center justify-center px-[1px]",
                titleFont,
                book.caps && "uppercase"
              )}
              style={{
                color: book.ink,
                writingMode: "vertical-rl",
                textOrientation: "mixed",
                transform: "rotate(180deg)",
                fontSize: Math.max(9, Math.min(13, book.width * 0.46)),
                letterSpacing: book.caps ? "0.12em" : "0.04em",
                lineHeight: 1,
                textShadow: "0 1px 0 rgb(0 0 0 / 0.18)",
                opacity: 0.92 - book.wear * 0.25,
              }}
            >
              {shortTitle}
            </span>
            {book.width >= 44 ? (
              <span
                className={cn(
                  "absolute inset-x-0 top-[6%] h-[18%] overflow-hidden px-[1px] text-center",
                  titleFont
                )}
                style={{
                  color: book.ink,
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  fontSize: Math.max(8, book.width * 0.28),
                  letterSpacing: "0.16em",
                  textTransform: "uppercase",
                  opacity: 0.7,
                }}
              >
                {book.author}
              </span>
            ) : null}
            {book.width >= 30 && book.publisher ? (
              <span
                className="absolute inset-x-0 bottom-[7px] px-[1px] text-center font-mono uppercase"
                style={{
                  color: book.ink,
                  fontSize: Math.max(6, Math.min(8, book.width * 0.28)),
                  letterSpacing: "0.08em",
                  opacity: 0.62,
                }}
              >
                {book.publisher.slice(0, 10)}
              </span>
            ) : null}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 mix-blend-overlay"
              style={{ backgroundImage: finishTexture[book.finish] }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 mix-blend-soft-light"
              style={{ backgroundImage: finishSheen[book.finish] }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                opacity: book.wear,
                background:
                  "linear-gradient(180deg, rgb(255 236 190 / 0.28), transparent 18%, transparent 78%, rgb(40 24 8 / 0.35))",
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgb(255 255 255 / 0.22), inset 0 -2px 3px rgb(0 0 0 / 0.18)",
              }}
            />
          </span>

          <span
            className="absolute top-0 left-full overflow-hidden"
            style={{
              width: COVER_W,
              height: book.height,
              transformOrigin: "left center",
              transform: "rotateY(90deg)",
              backfaceVisibility: "hidden",
              boxShadow: "8px 10px 24px rgb(30 20 10 / 0.22)",
            }}
          >
            {book.cover ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={book.cover}
                alt=""
                className="h-full w-full object-cover"
                draggable={false}
              />
            ) : (
              <span
                className="flex h-full w-full flex-col justify-between p-4 font-display"
                style={{ background: book.spine, color: book.ink }}
              >
                <span className="text-lg leading-tight">{book.title}</span>
                <span className="font-sans text-sm opacity-80">{book.author}</span>
              </span>
            )}
          </span>

          <span
            aria-hidden
            className="absolute right-0 left-0"
            style={{
              height: Math.max(6, book.width * 0.28),
              top: -1,
              transformOrigin: "bottom center",
              transform: "rotateX(78deg)",
              background:
                book.binding === "hardcover"
                  ? "linear-gradient(180deg, #efe6d4, #d9cbb3 55%, #c9b79a)"
                  : "linear-gradient(180deg, #f7f1e6, #eadfca)",
              boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.5)",
            }}
          />
          {book.binding === "hardcover" ? (
            <span
              aria-hidden
              className="absolute left-0 right-0 top-0 h-[3px]"
              style={{
                background: book.band ?? book.ink,
                transform: "translateZ(1px)",
              }}
            />
          ) : null}
        </span>
      </button>
      {hovered && !suppressHover && cardPos && typeof document !== "undefined"
        ? createPortal(
            <div
              className="pointer-events-none fixed z-[100] w-[248px] -translate-x-1/2 -translate-y-full rounded-md bg-card/95 px-4 py-3 text-card-foreground shadow-[0_18px_50px_rgb(40_28_16/0.18)] ring-1 ring-foreground/8 backdrop-blur-md"
              style={{ left: cardPos.left, top: cardPos.top }}
            >
              <p
                className="font-display text-[20px] leading-tight"
                style={{ fontSize: 20 }}
              >
                {book.title}
              </p>
              <p className="mt-1 font-sans" style={{ fontSize: 15 }}>
                {book.author}
              </p>
              <p
                className="mt-2 font-mono uppercase tracking-[0.14em] text-muted-foreground"
                style={{ fontSize: 14 }}
              >
                {book.year || "—"} · {book.binding}
                {book.goodreadsId
                  ? book.rating > 0
                    ? ` · ${book.rating.toFixed(1)}★`
                    : " · Not rated"
                  : book.status
                    ? ` · ${book.status.replace("-", " ")}`
                    : ""}
              </p>
              {book.genres?.length ? (
                <p
                  className="mt-1 font-sans text-muted-foreground"
                  style={{ fontSize: 14 }}
                >
                  {book.genres.join(" · ")}
                </p>
              ) : null}
            </div>,
            document.body
          )
        : null}
    </>
  );
}
