"use client";

import { useEffect, useState } from "react";

const FULL = "Welcome to my library";

export function TypedTitle() {
  const [count, setCount] = useState(0);
  const done = count >= FULL.length;

  useEffect(() => {
    if (done) return;
    const id = window.setTimeout(() => setCount((c) => c + 1), 95);
    return () => window.clearTimeout(id);
  }, [count, done]);

  return (
    <h1
      aria-label={FULL}
      className="font-display text-[clamp(2.4rem,7vw,4.6rem)] font-light italic leading-[1.05] tracking-tight text-foreground"
    >
      <span aria-hidden="true">{FULL.slice(0, count)}</span>
      <span
        aria-hidden="true"
        className={`ml-[0.08em] inline-block h-[0.72em] w-[2px] translate-y-[0.08em] bg-primary ${
          done ? "animate-caret" : ""
        }`}
      />
    </h1>
  );
}
