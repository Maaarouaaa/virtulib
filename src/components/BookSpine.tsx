"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { COVER_W } from "@/components/bookFaces";
import type { Book } from "@/data/books";
import {
  faceClass,
  faceTracking,
  letteredBand,
  letteredRules,
  letterShadow,
  spineFace,
  spineMaterial,
  spinePlace,
  thinDecoration,
  type ThinMark,
} from "@/lib/spineStyle";
import {
  fitSpineTitle,
  isThinSpine,
  seriesFromTitle,
} from "@/lib/spineTitle";
import { cn } from "@/lib/utils";

type BookSpineProps = {
  book: Book;
  onOpen: (book: Book, rect: DOMRect) => void;
  justAdded?: boolean;
  suppressHover?: boolean;
};

function finishTexture(
  finish: Book["finish"],
  grainX: number,
  grainY: number,
  scale: number
): CSSProperties {
  if (finish === "cloth") {
    return {
      backgroundImage: [
        `repeating-linear-gradient(90deg, rgb(255 255 255 / 0.045) 0 1px, transparent 1px ${2 + scale}px)`,
        `repeating-linear-gradient(0deg, rgb(0 0 0 / 0.04) 0 1px, transparent 1px ${3.5 + scale}px)`,
        `repeating-linear-gradient(180deg, rgb(70 46 20 / 0.03) 0 2px, transparent 2px ${6 + scale}px)`,
      ].join(", "),
      backgroundPosition: `${grainX}px ${grainY}px`,
    };
  }
  if (finish === "gloss") {
    return {
      backgroundImage:
        "linear-gradient(180deg, rgb(255 255 255 / 0.06), transparent 38%)",
    };
  }
  return {
    backgroundImage: [
      `repeating-linear-gradient(180deg, rgb(40 28 16 / 0.03) 0 1px, transparent 1px ${2.4 + scale * 0.4}px)`,
      "radial-gradient(rgb(40 24 8 / 0.035) 0.55px, transparent 0.7px)",
    ].join(", "),
    backgroundSize: `auto, ${3.2 + scale}px ${3.2 + scale}px`,
    backgroundPosition: `0 0, ${grainX}px ${grainY}px`,
  };
}

function finishSheen(finish: Book["finish"], sheen: number): string {
  if (finish === "cloth") {
    return `linear-gradient(90deg, rgb(255 255 255 / ${0.05 * sheen}) 0%, transparent 22%, rgb(255 255 255 / ${0.03 * sheen}) 48%, rgb(0 0 0 / ${0.1 * sheen}) 100%)`;
  }
  if (finish === "gloss") {
    return `linear-gradient(90deg, rgb(255 255 255 / ${0.1 * sheen}) 0%, transparent 32%, rgb(255 255 255 / ${0.08 * sheen}) 52%, transparent 68%, rgb(0 0 0 / ${0.1 * sheen}) 100%)`;
  }
  return `linear-gradient(90deg, rgb(255 255 255 / ${0.04 * sheen}) 0%, transparent 40%, rgb(0 0 0 / ${0.08 * sheen}) 100%)`;
}

function SpineMark({
  mark,
  color,
  embossed,
}: {
  mark: ThinMark;
  color: string;
  embossed: boolean;
}) {
  if (mark === "none") return null;
  const relief = embossed
    ? "inset 0.5px 0.5px 0 rgb(255 255 255 / 0.2), 0.5px 0.5px 0 rgb(0 0 0 / 0.22)"
    : "0 0.5px 0 rgb(0 0 0 / 0.18)";

  if (mark === "plus") {
    return (
      <span aria-hidden className="absolute inset-0 flex items-center justify-center">
        <span
          className="absolute h-[11px] w-px"
          style={{ background: color, boxShadow: relief, opacity: 0.7 }}
        />
        <span
          className="absolute h-px w-[11px]"
          style={{ background: color, boxShadow: relief, opacity: 0.7 }}
        />
      </span>
    );
  }
  if (mark === "bar") {
    return (
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[13px] w-px -translate-x-1/2 -translate-y-1/2"
        style={{ background: color, boxShadow: relief, opacity: 0.7 }}
      />
    );
  }
  if (mark === "lozenge") {
    return (
      <span
        aria-hidden
        className="absolute left-1/2 top-1/2 h-[9px] w-[5px] -translate-x-1/2 -translate-y-1/2"
        style={{
          border: `1px solid ${color}`,
          borderRadius: "40%",
          boxShadow: relief,
          opacity: 0.62,
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="absolute left-1/2 top-[46%] h-[5px] w-[5px]"
      style={{
        border: `1px solid ${color}`,
        transform: "translateX(-50%) rotate(45deg)",
        boxShadow: relief,
        opacity: 0.62,
      }}
    />
  );
}

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

  const thin = isThinSpine(book.width);
  const fit = fitSpineTitle(
    book.title,
    book.width,
    book.height,
    spineFace(book.id)
  );
  const face = fit.face;
  const place = spinePlace(book.id);
  const material = spineMaterial(book.id, book.finish, book.wear);
  const decor = thin ? thinDecoration(book.id) : null;
  const showRules = thin ? Boolean(decor?.rules) : letteredRules(book.id);
  const showBand = thin ? Boolean(decor?.band) : letteredBand(book.id) && Boolean(book.band);
  const embossed = book.finish === "cloth" || book.binding === "hardcover";
  const series = seriesFromTitle(book.title);
  const author = book.author.trim() || undefined;
  const publisher = book.publisher.trim() || undefined;
  const facts = [
    book.year ? String(book.year) : null,
    book.binding,
    book.goodreadsId
      ? book.rating > 0
        ? `${book.rating.toFixed(1)}★`
        : "Not rated"
      : book.status
        ? book.status.replace("-", " ")
        : null,
  ].filter((part): part is string => Boolean(part));
  const ruleColor = book.band || book.ink;
  const letterKind = embossed ? "emboss" : "print";

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        aria-label={author ? `${book.title} by ${author}` : book.title}
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
                "inset 1px 0 0 rgb(255 255 255 / 0.12), inset -1px 0 0 rgb(0 0 0 / 0.24), 2px 8px 16px rgb(40 28 16 / 0.16)",
            }}
          >
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                background: `linear-gradient(90deg, rgb(0 0 0 / ${0.09 * material.curve}), rgb(255 255 255 / ${0.05 * material.curve}) 20%, transparent 46%, rgb(0 0 0 / ${0.07 * material.curve}) 78%, rgb(0 0 0 / ${0.14 * material.curve}) 100%)`,
              }}
            />
            {showRules ? (
              <>
                <span
                  aria-hidden
                  className="absolute inset-x-[18%] top-[7%] h-px"
                  style={{ background: ruleColor, opacity: 0.42 }}
                />
                <span
                  aria-hidden
                  className="absolute inset-x-[18%] bottom-[8%] h-px"
                  style={{ background: ruleColor, opacity: 0.38 }}
                />
              </>
            ) : null}
            {showBand ? (
              <span
                aria-hidden
                className="absolute inset-x-0 top-[16%] h-[5px]"
                style={{
                  background: book.band ?? ruleColor,
                  opacity: 0.55,
                  boxShadow: "inset 0 1px 0 rgb(255 255 255 / 0.12), inset 0 -1px 0 rgb(0 0 0 / 0.12)",
                }}
              />
            ) : null}
            {thin && decor ? (
              <SpineMark mark={decor.mark} color={book.ink} embossed={embossed} />
            ) : null}
            {!thin ? (
              <span
                aria-hidden
                className={cn(
                  "absolute inset-x-0 flex justify-center overflow-hidden px-[2px]",
                  faceClass(face),
                  face === "caps" && "uppercase",
                  place === "high" ? "top-[8%] bottom-[22%]" : "top-[13%] bottom-[15%]",
                  "items-center"
                )}
                style={{
                  color: book.ink,
                  writingMode: "vertical-rl",
                  textOrientation: "mixed",
                  transform: "rotate(180deg)",
                  fontSize: fit.fontSize,
                  fontWeight: face === "sans" ? 400 : 500,
                  letterSpacing: faceTracking(face),
                  lineHeight: fit.lines === 2 ? 1.05 : 1,
                  whiteSpace: fit.lines === 2 ? "pre-line" : "nowrap",
                  textShadow: letterShadow(book.ink, letterKind),
                  opacity: material.inkFade,
                }}
              >
                {fit.text}
              </span>
            ) : null}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 mix-blend-overlay"
              style={finishTexture(
                book.finish,
                material.grainX,
                material.grainY,
                material.grainScale
              )}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 mix-blend-soft-light"
              style={{ backgroundImage: finishSheen(book.finish, material.sheen) }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                opacity: book.wear * 0.55,
                background:
                  "linear-gradient(180deg, rgb(255 236 190 / 0.16), transparent 16%, transparent 80%, rgb(40 24 8 / 0.22))",
              }}
            />
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                boxShadow:
                  "inset 0 1px 0 rgb(255 255 255 / 0.18), inset 0 -2px 3px rgb(0 0 0 / 0.14)",
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
              {author ? (
                <p className="mt-1 font-sans" style={{ fontSize: 15 }}>
                  {author}
                </p>
              ) : null}
              {series ? (
                <p
                  className="mt-1 font-sans text-muted-foreground"
                  style={{ fontSize: 14 }}
                >
                  {series}
                </p>
              ) : null}
              {publisher ? (
                <p
                  className="mt-1 font-mono uppercase tracking-[0.12em] text-muted-foreground"
                  style={{ fontSize: 13 }}
                >
                  {publisher}
                </p>
              ) : null}
              {facts.length ? (
                <p
                  className="mt-2 font-mono uppercase tracking-[0.14em] text-muted-foreground"
                  style={{ fontSize: 14 }}
                >
                  {facts.join(" · ")}
                </p>
              ) : null}
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
