import { parseGoodreadsCsv } from "./import-goodreads.mjs";

const sample = `Book Id,Title,Author,ISBN,ISBN13,My Rating,Publisher,Binding,Number of Pages,Year Published,Original Publication Year,Date Read,Date Added,Bookshelves,Bookshelves with positions,Exclusive Shelf,My Review
1,"Hello, world","A. Author","=""0439554934""","=""9780439554930""",5.0,Scholastic,Hardcover,309,2003,1997,2021/06/17,2021/06/01,favorites,favorites (#1),read,"Line one,<br/>line two."
2,"No ISBN",Someone,"=""""","=""""",0,Pub,Paperback,200,2020,2020,,2022/01/01,to-read,to-read (#2),to-read,
1,"Duplicate should drop","A. Author","=""0439554934""","=""9780439554930""",1.0,X,Paperback,1,2000,2000,,2020/01/01,,,read,
`;

const books = parseGoodreadsCsv(sample);
const fail = (msg) => {
  console.error("FAIL", msg);
  process.exit(1);
};

if (books.length !== 2) fail(`expected 2 unique books, got ${books.length}`);
if (books[0].isbn13 !== "9780439554930") fail(`isbn13 ${books[0].isbn13}`);
if (books[0].isbn !== "0439554934") fail(`isbn ${books[0].isbn}`);
if (!books[0].review.includes("Line one") || !books[0].review.includes("line two")) {
  fail(`review not stripped: ${books[0].review}`);
}
if (books[1].isbn || books[1].isbn13) fail("empty isbn should be blank");
if (books[1].status !== "to-read") fail(`status ${books[1].status}`);
if (books[0].rating !== 5) fail(`rating ${books[0].rating}`);
if (books[1].rating !== 0) fail("unrated should be 0");
console.log("ok", books.length, "parsed");
