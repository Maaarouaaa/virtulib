import assert from "node:assert/strict";
import { test } from "node:test";
import {
  letteredBand,
  letteredRules,
  spineFace,
  spineMaterial,
  spinePlace,
  thinDecoration,
} from "./spineStyle.ts";

const ids = Array.from({ length: 48 }, (_, i) => `gr-${1000 + i}`);

test("spine faces are a fixed trio assigned from the book id", () => {
  assert.equal(spineFace("gr-62816044"), spineFace("gr-62816044"));
  const faces = new Set(ids.map(spineFace));
  assert.deepEqual([...faces].sort(), ["caps", "literary", "sans"].sort());
  assert.equal(["literary", "sans", "caps"].includes(spineFace("abc")), true);
});

test("placement is deterministic and only center or slightly high", () => {
  assert.equal(spinePlace("gr-1"), spinePlace("gr-1"));
  const places = new Set(ids.map(spinePlace));
  for (const place of places) {
    assert.equal(place === "center" || place === "high", true);
  }
  assert.equal(places.size >= 1, true);
});

test("thin decoration uses a few variants and leaves some spines plain", () => {
  const plains = ids.filter((id) => {
    const decor = thinDecoration(id);
    return !decor.rules && !decor.band && decor.mark === "none";
  });
  assert.ok(plains.length >= 4);
  const marked = ids.filter((id) => thinDecoration(id).mark !== "none");
  const ruled = ids.filter((id) => thinDecoration(id).rules);
  const banded = ids.filter((id) => thinDecoration(id).band);
  assert.ok(marked.length >= 4);
  assert.ok(ruled.length >= 4);
  assert.ok(banded.length >= 3);
  for (const id of ids) {
    const decor = thinDecoration(id);
    const extras = Number(decor.rules) + Number(decor.band) + Number(decor.mark !== "none");
    assert.ok(extras <= 2);
    assert.equal(JSON.stringify(thinDecoration(id)), JSON.stringify(thinDecoration(id)));
  }
});

test("material variation stays stable for the same id", () => {
  const a = spineMaterial("gr-9", "cloth", 0.2);
  const b = spineMaterial("gr-9", "cloth", 0.2);
  assert.deepEqual(a, b);
  assert.ok(a.inkFade >= 0.74 && a.inkFade <= 0.95);
  assert.ok(letteredRules("x") === letteredRules("x"));
  assert.ok(letteredBand("x") === letteredBand("x"));
});
