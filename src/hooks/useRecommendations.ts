"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { Book } from "@/data/books";

const STORAGE_KEY = "virtual-library:recommendations";
const EMPTY: Book[] = [];
const listeners = new Set<() => void>();
let memory: Book[] | null = null;
let justAdded: string | null = null;
let justAddedTimer: number | null = null;

function emit() {
  for (const listener of listeners) listener();
}

function readStored(): Book[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Book[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Book[] {
  if (memory) return memory;
  memory = readStored();
  return memory;
}

function getJustAddedSnapshot() {
  return justAdded;
}

export function useRecommendations() {
  const recommendations = useSyncExternalStore(
    subscribe,
    getSnapshot,
    () => EMPTY
  );
  const added = useSyncExternalStore(
    subscribe,
    getJustAddedSnapshot,
    () => null
  );

  const recommend = useCallback(async (book: Book) => {
    const prev = memory ?? readStored();
    memory = [book, ...prev.filter((item) => item.id !== book.id)].slice(0, 200);
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch {
      /* ignore quota */
    }
    justAdded = book.id;
    if (justAddedTimer) window.clearTimeout(justAddedTimer);
    justAddedTimer = window.setTimeout(() => {
      justAdded = null;
      emit();
    }, 1400);
    emit();
    return book;
  }, []);

  return { recommendations, justAdded: added, recommend, ready: true };
}
