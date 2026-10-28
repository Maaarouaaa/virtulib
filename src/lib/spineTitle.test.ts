import assert from "node:assert/strict";
import { test } from "node:test";
import {
  balanceLines,
  displayTitle,
  fitSpineTitle,
  isThinSpine,
  MIN_SPINE_FONT,
  seriesFromTitle,
  THIN_SPINE_PX,
  TWO_LINE_MIN_PX,
} from "./spineTitle.ts";

test("displayTitle strips trailing series annotations and subtitles", () => {
  assert.equal(
    displayTitle("A Curse for True Love (Once Upon a Broken Heart, #3)"),
    "A Curse for True Love"
  );
  assert.equal(
    displayTitle("Fourth Wing (The Empyrean, #1)"),
    "Fourth Wing"
  );
  assert.equal(
    displayTitle(
      "Rich Dad Poor Dad: What the Rich Teach Their Kids About Money—That the Poor and Middle Class Do Not!"
    ),
    "Rich Dad Poor Dad"
  );
  assert.equal(displayTitle("The Alchemist"), "The Alchemist");
  assert.equal(displayTitle("4:50 from Paddington"), "4:50 from Paddington");
});

test("displayTitle truncates at a word boundary", () => {
  assert.equal(
    displayTitle("Harry Potter and the Prisoner of Azkaban", 18),
    "Harry Potter and…"
  );
});

test("seriesFromTitle reads trailing series and skips titles without one", () => {
  assert.equal(
    seriesFromTitle("Fourth Wing (The Empyrean, #1)"),
    "The Empyrean, #1"
  );
  assert.equal(seriesFromTitle("The Alchemist"), undefined);
});

test("thin spines use a single width threshold", () => {
  assert.equal(THIN_SPINE_PX, 22);
  assert.equal(isThinSpine(21), true);
  assert.equal(isThinSpine(22), false);
  assert.equal(isThinSpine(16), true);
});

test("fitSpineTitle keeps the full main title when it can", () => {
  const short = fitSpineTitle("Fourth Wing (The Empyrean, #1)", 22, 236, "literary");
  assert.equal(short.text, "Fourth Wing");
  assert.equal(short.lines, 1);
  assert.ok(short.fontSize >= MIN_SPINE_FONT);

  const mid = fitSpineTitle(
    "A Curse for True Love (Once Upon a Broken Heart, #3)",
    23,
    241,
    "literary"
  );
  assert.equal(mid.text, "A Curse for True Love");
  assert.equal(mid.text.includes("…"), false);
});

test("fitSpineTitle uses two lines on wider spines before truncating", () => {
  const wide = fitSpineTitle(
    "Harry Potter and the Prisoner of Azkaban (Harry Potter, #3)",
    36,
    240,
    "literary"
  );
  assert.equal(wide.lines, 2);
  assert.equal(wide.text.includes("…"), false);
  assert.match(wide.text, /Harry Potter/);
  assert.match(wide.text, /Azkaban/);
  assert.ok(wide.fontSize >= MIN_SPINE_FONT);
  assert.ok(36 >= TWO_LINE_MIN_PX);
});

test("fitSpineTitle truncates at a word boundary only as a last resort", () => {
  const long =
    "An Exceptionally Long Invented Title About Nothing In Particular That Cannot Fit";
  const fitted = fitSpineTitle(long, 22, 210, "caps");
  assert.equal(fitted.lines, 1);
  assert.equal(fitted.text.endsWith("…"), true);
  assert.equal(/\s…$/.test(fitted.text) || /[A-Za-z]…$/.test(fitted.text), true);
  assert.equal(fitted.text.includes("Particular"), false);
});

test("balanceLines splits near the middle on a word boundary", () => {
  const split = balanceLines("Harry Potter and the Prisoner of Azkaban");
  assert.equal(split.includes("\n"), true);
  assert.equal(split.startsWith("Harry Potter"), true);
  assert.equal(split.split("\n").length, 2);
});
