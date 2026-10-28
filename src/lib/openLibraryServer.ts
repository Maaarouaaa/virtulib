const USER_AGENT =
  "VirtualLibrary/1.0 (personal bookshelf; https://github.com/Maaarouaaa/virtulib)";

const MIN_GAP_MS = 400;
const CACHE_TTL_MS = 10 * 60 * 1000;
const cache = new Map<string, { at: number; status: number; body: unknown }>();

let lastAt = 0;
let chain: Promise<unknown> = Promise.resolve();

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitTurn() {
  const wait = MIN_GAP_MS - (Date.now() - lastAt);
  if (wait > 0) await sleep(wait);
  lastAt = Date.now();
}

export type QueuedJson = {
  status: number;
  body: unknown;
};

export function enqueueOpenLibrary<T>(
  cacheKey: string,
  run: () => Promise<T>
): Promise<T> {
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.at < CACHE_TTL_MS) {
    return Promise.resolve(hit.body as T);
  }

  const job = chain.then(async () => {
    const again = cache.get(cacheKey);
    if (again && Date.now() - again.at < CACHE_TTL_MS) {
      return again.body as T;
    }
    const result = await run();
    const failed =
      result &&
      typeof result === "object" &&
      "error" in result &&
      Boolean((result as { error?: string }).error);
    if (!failed) {
      cache.set(cacheKey, {
        at: Date.now(),
        status: 200,
        body: result,
      });
    }
    return result;
  });
  chain = job.then(
    () => undefined,
    () => undefined
  );
  return job;
}

export async function openLibraryFetch(
  url: string,
  signal?: AbortSignal
): Promise<Response> {
  await waitTurn();
  let attempt = 0;
  let last: Response | null = null;
  while (attempt < 3) {
    const res = await fetch(url, {
      signal,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    last = res;
    if (res.status !== 429) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    const backoff = Number.isFinite(retryAfter)
      ? retryAfter * 1000
      : 800 * 2 ** attempt;
    await sleep(backoff);
    attempt += 1;
    await waitTurn();
  }
  return last as Response;
}

export type CatalogueDoc = {
  key: string;
  title?: string;
  author_name?: string[];
  author_key?: string[];
  first_publish_year?: number;
  cover_i?: number;
  isbn?: string[];
  subject?: string[];
  edition_count?: number;
  ratings_average?: number;
  ratings_count?: number;
  number_of_pages_median?: number;
  publisher?: string[];
};

export type CataloguePayload = {
  docs: CatalogueDoc[];
  numFound: number;
  page: number;
  error?: string;
};

export async function searchCatalogue(
  query: string,
  page = 1,
  signal?: AbortSignal
): Promise<CataloguePayload> {
  const trimmed = query.trim();
  if (trimmed.length < 2) return { docs: [], numFound: 0, page };

  const cacheKey = `search:${trimmed.toLowerCase()}:${page}`;
  return enqueueOpenLibrary(cacheKey, async () => {
    const url = new URL("https://openlibrary.org/search.json");
    url.searchParams.set("q", trimmed);
    url.searchParams.set("page", String(page));
    url.searchParams.set("limit", "20");
    url.searchParams.set(
      "fields",
      "key,title,author_name,author_key,first_publish_year,cover_i,isbn,subject,edition_count,ratings_average,ratings_count,number_of_pages_median,publisher"
    );

    const res = await openLibraryFetch(url.toString(), signal);
    if (res.status === 429) {
      return {
        docs: [],
        numFound: 0,
        page,
        error: "Open Library asked us to slow down. Try again in a moment.",
      };
    }
    if (!res.ok) {
      return {
        docs: [],
        numFound: 0,
        page,
        error: "The catalogue could not be reached. Try again.",
      };
    }
    const data = (await res.json()) as {
      docs?: CatalogueDoc[];
      numFound?: number;
      num_found?: number;
    };
    return {
      docs: (data.docs ?? []).filter((doc) => Boolean(doc.title && doc.key)),
      numFound: data.numFound ?? data.num_found ?? 0,
      page,
    };
  });
}

export async function readWork(
  key: string,
  signal?: AbortSignal
): Promise<{ description: string; subjects: string[] }> {
  const workKey = key.startsWith("/works/") ? key : `/works/${key}`;
  const cacheKey = `work:${workKey}`;
  return enqueueOpenLibrary(cacheKey, async () => {
    const res = await openLibraryFetch(
      `https://openlibrary.org${workKey}.json`,
      signal
    );
    if (!res.ok) return { description: "", subjects: [] };
    const data = (await res.json()) as {
      description?: string | { value?: string };
      subjects?: string[];
    };
    const raw =
      typeof data.description === "string"
        ? data.description
        : data.description?.value ?? "";
    return {
      description: raw.replace(/\s+/g, " ").trim(),
      subjects: Array.isArray(data.subjects) ? data.subjects : [],
    };
  });
}
