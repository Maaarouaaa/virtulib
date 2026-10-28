import assert from "node:assert/strict";
import { test } from "node:test";
import type { Book } from "../data/books.ts";
import { matchesShelfFilters } from "./shelfFilters.ts";

function book(partial: Pick<Book, "id" | "genres" | "status">): Book {
  return {
    title: partial.id,
    author: "Test",
    cover: "",
    year: 2020,
    blurb: "",
    rating: 0,
    finished: "",
    publisher: "",
    binding: "paperback",
    finish: "matte",
    spine: "#000",
    ink: "#fff",
    face: "sans",
    width: 30,
    height: 200,
    lean: 0,
    depth: 0,
    wear: 0,
    ...partial,
  };
}

const fantasyRomance = book({
  id: "both",
  genres: ["Fantasy", "Romance"],
  status: "read",
});
const fantasyOnly = book({
  id: "fantasy",
  genres: ["Fantasy"],
  status: "to-read",
});
const romanceOnly = book({
  id: "romance",
  genres: ["Romance"],
  status: "read",
});
const untagged = book({
  id: "none",
  status: "read",
});

test("no selected genres keeps every book allowed by status", () => {
  assert.equal(matchesShelfFilters(fantasyRomance, [], null), true);
  assert.equal(matchesShelfFilters(untagged, [], null), true);
  assert.equal(matchesShelfFilters(fantasyOnly, [], "read"), false);
  assert.equal(matchesShelfFilters(romanceOnly, [], "read"), true);
});

test("selected genres match with OR, including books tagged with both", () => {
  const selected = ["Fantasy", "Romance"];
  assert.equal(matchesShelfFilters(fantasyRomance, selected, null), true);
  assert.equal(matchesShelfFilters(fantasyOnly, selected, null), true);
  assert.equal(matchesShelfFilters(romanceOnly, selected, null), true);
  assert.equal(matchesShelfFilters(untagged, selected, null), false);
});

test("genres AND reading status", () => {
  const selected = ["Fantasy", "Romance"];
  assert.equal(matchesShelfFilters(fantasyRomance, selected, "read"), true);
  assert.equal(matchesShelfFilters(romanceOnly, selected, "read"), true);
  assert.equal(matchesShelfFilters(fantasyOnly, selected, "read"), false);
});

test("toggling a genre off is just a smaller selected collection", () => {
  assert.equal(matchesShelfFilters(romanceOnly, ["Fantasy"], null), false);
  assert.equal(matchesShelfFilters(fantasyOnly, ["Fantasy"], null), true);
});
