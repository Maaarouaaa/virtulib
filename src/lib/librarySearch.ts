import { books } from "@/data/books";

export type SearchResultPayload = {
  ids: string[];
  fallback?: boolean;
  error?: string;
};

function catalogueLines() {
  return books
    .map(
      (book) =>
        `${book.id} :: ${book.title} :: ${book.author} :: ${book.year} :: ${(book.genres ?? []).join(", ")} :: ${book.blurb.slice(0, 160)}`
    )
    .join("\n");
}

export function lexicalSearch(query: string, limit = 20): string[] {
  const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (terms.length === 0) return [];
  return books
    .map((book) => {
      const hay =
        `${book.title} ${book.author} ${(book.genres ?? []).join(" ")} ${book.blurb}`.toLowerCase();
      const score = terms.reduce(
        (sum, term) => sum + (hay.includes(term) ? 1 : 0),
        0
      );
      return { id: book.id, score };
    })
    .filter((row) => row.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((row) => row.id);
}

function knownIds(ids: unknown): string[] {
  const set = new Set(books.map((book) => book.id));
  if (!Array.isArray(ids)) return [];
  return ids.filter((id): id is string => typeof id === "string" && set.has(id));
}

type Provider = {
  url: string;
  key: string;
  model: string;
  headers?: Record<string, string>;
};

function provider(): Provider | null {
  if (process.env.OPENAI_API_KEY) {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      key: process.env.OPENAI_API_KEY,
      model: "gpt-4o-mini",
    };
  }
  if (process.env.GEMINI_API_KEY) {
    return {
      url: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
      key: process.env.GEMINI_API_KEY,
      model: "gemini-2.5-flash",
    };
  }
  if (process.env.LOVABLE_API_KEY) {
    return {
      url: "https://ai.gateway.lovable.dev/v1/chat/completions",
      key: process.env.LOVABLE_API_KEY,
      model: "google/gemini-2.5-flash",
    };
  }
  return null;
}

const SYSTEM = `You match a reader's natural-language request against a personal library catalogue.
Each line is: id :: title :: author :: year :: genres :: blurb
Return ONLY JSON of the form {"ids":["id1","id2"]} with the best matches first, at most 20 ids.
If nothing fits, return {"ids":[]}. Use only ids that appear in the catalogue.`;

export async function smartSearch(query: string): Promise<SearchResultPayload> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { ids: [] };

  const chosen = provider();
  if (!chosen) {
    return { ids: lexicalSearch(trimmed), fallback: true };
  }

  const res = await fetch(chosen.url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${chosen.key}`,
      ...chosen.headers,
    },
    body: JSON.stringify({
      model: chosen.model,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM },
        {
          role: "user",
          content: `Request: ${trimmed}\n\nCatalogue:\n${catalogueLines()}`,
        },
      ],
    }),
  });

  if (res.status === 429) {
    return { ids: [], error: "Too many searches. Give the stacks a moment." };
  }
  if (res.status === 402) {
    return { ids: [], error: "Search credits exhausted." };
  }
  if (!res.ok) {
    return { ids: lexicalSearch(trimmed), fallback: true };
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content ?? '{"ids":[]}';
  try {
    const parsed = JSON.parse(content) as { ids?: unknown };
    return { ids: knownIds(parsed.ids) };
  } catch {
    return { ids: lexicalSearch(trimmed), fallback: true };
  }
}
