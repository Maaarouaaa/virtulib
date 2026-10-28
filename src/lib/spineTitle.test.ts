import assert from "node:assert/strict";
import { test } from "node:test";
import {
  displayTitle,
  isThinSpine,
  seriesFromTitle,
  spineLetterSize,
  spineTitleLimit,
  THIN_SPINE_PX,
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
  assert.ok(spineLetterSize(22) >= 10);
  assert.ok(spineTitleLimit(240, 10) >= 8);
});
