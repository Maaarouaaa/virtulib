"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { docToResult, type CatalogueResult } from "@/lib/catalogue";
import type { CatalogueDoc } from "@/lib/openLibraryServer";

type Payload = {
  docs?: CatalogueDoc[];
  numFound?: number;
  page?: number;
  error?: string;
};

export function useCatalogueSearch(query: string) {
  const [results, setResults] = useState<CatalogueResult[]>([]);
  const [numFound, setNumFound] = useState(0);
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [error, setError] = useState("");
  const reqId = useRef(0);
  const q = query.trim();
  const active = q.length >= 2;

  const load = useCallback(async (q: string, nextPage: number, append: boolean) => {
    const id = ++reqId.current;
    if (!append) {
      setResults([]);
      setNumFound(0);
      setPage(1);
    }
    setStatus("loading");
    setError("");
    try {
      const params = new URLSearchParams({
        q,
        page: String(nextPage),
      });
      const res = await fetch(`/api/search?${params.toString()}`);
      const data = (await res.json()) as Payload;
      if (id !== reqId.current) return;
      if (data.error) {
        setStatus("error");
        setError(data.error);
        if (!append) setResults([]);
        return;
      }
      const mapped = (data.docs ?? [])
        .map(docToResult)
        .filter((item): item is CatalogueResult => Boolean(item));
      setResults((prev) => (append ? [...prev, ...mapped] : mapped));
      setNumFound(data.numFound ?? mapped.length);
      setPage(nextPage);
      setStatus("idle");
    } catch {
      if (id !== reqId.current) return;
      setStatus("error");
      setError("The catalogue could not be reached. Try again.");
      if (!append) setResults([]);
    }
  }, []);

  useEffect(() => {
    if (q.length < 2) {
      reqId.current += 1;
      return;
    }
    const handle = window.setTimeout(() => {
      void load(q, 1, false);
    }, 400);
    return () => window.clearTimeout(handle);
  }, [q, load]);

  const loadMore = useCallback(() => {
    const q = query.trim();
    if (q.length < 2 || status === "loading") return;
    void load(q, page + 1, true);
  }, [query, page, status, load]);

  const retry = useCallback(() => {
    const q = query.trim();
    if (q.length < 2) return;
    void load(q, results.length ? page : 1, results.length > 0);
  }, [query, page, results.length, load]);

  return {
    active,
    results: active ? results : [],
    numFound: active ? numFound : 0,
    status: active ? status : "idle",
    error: active ? error : "",
    loadMore,
    retry,
    hasMore: active && results.length < numFound,
  };
}
