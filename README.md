# Virtual library

A single-page personal bookshelf: real covers standing as 3D spines on a warm paper shelf. Hover a book to read its card, click to pull it out, and ask the stacks in plain English.

The shelf reads from one file, `src/data/books.ts`. A starter catalogue of real Open Library editions is included so the rail is livable on first run. Replace it with your Goodreads export to make the room yours.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:4521](http://localhost:4521).

Optional natural-language search: copy `.env.example` to `.env.local` and set `OPENAI_API_KEY` (or `GEMINI_API_KEY`). Without a key, the same search bar matches title, author, genres, and blurb on the server.

## Import your Goodreads library

1. On Goodreads: **My Books → Import and export → Export Library**.
2. Drop `goodreads_library_export.csv` in the project root.
3. Ask the assistant (or run the import yourself) to regenerate `src/data/books.ts` from rows whose Exclusive Shelf is `read` or `currently-reading`.

Rules the importer follows:

- Cover art and blurbs from Open Library
- Spine color sampled from the cover’s left edge
- Binding, height, and width derived from page count
- Genres only from: Fiction, Nonfiction, Sci-Fi, Mystery & Thriller, Fantasy, Romance
- Newest finished date first

## What’s on the page

- Typed heading, grain, and a curved horizontal rail
- Hover metadata card and a 900ms cover pull-out
- Genre pills generated from whatever tags exist in `books`
- **Recommend a book** — visitors search Open Library and leave a volume on a second shelf (stored in this browser via `localStorage`; no database required)

## Stack

Next.js, React, TypeScript, Tailwind CSS v4, shadcn/ui.
