# Virtual library

A single-page personal bookshelf: your Goodreads volumes standing as 3D spines on a warm paper shelf. Hover a book to read its card, click to pull it out, and search the whole Open Library catalogue.

The shelf reads from one file, `src/data/books.ts`. Do not commit the raw Goodreads CSV.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:4521](http://localhost:4521).

The main search bar queries Open Library (`/api/search`). No AI key is required.

## Refresh your Goodreads library

1. On Goodreads: **My Books → Import and export → Export Library**.
2. Keep the CSV off git (it is gitignored).
3. Regenerate the shelf:

```bash
node scripts/import-goodreads.mjs /path/to/goodreads_library_export.csv
```

The importer:

- Parses quoted commas, multiline reviews, and Goodreads ISBN values such as `="978…"`
- Imports every exclusive shelf (`read`, `currently-reading`, `to-read`) plus custom shelf names
- Deduplicates by Goodreads Book Id
- Matches Open Library by ISBN first, then title and author
- Samples spine color from the cover’s left edge
- Sorts by Date Read, then Date Added
- Leaves unmatched books on the shelf with a typeset cover

## What’s on the page

- Personal 3D shelf of imported Goodreads books
- Catalogue search results in a separate Open Library list (does not add to your shelf)
- “In my library” when ISBN or work key matches
- Your rating shown as **Not rated** when empty; Open Library averages are labeled separately
- Your written reviews, rendered as plain text
- Visitor recommendations on a second shelf (`localStorage`)

## Ship

Import the GitHub repo on [Vercel](https://vercel.com/new). Framework: Next.js.

## Stack

Next.js, React, TypeScript, Tailwind CSS v4, shadcn/ui.
