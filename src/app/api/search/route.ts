import { NextResponse } from "next/server";
import { smartSearch } from "@/lib/librarySearch";

export async function POST(request: Request) {
  let query = "";
  try {
    const body = (await request.json()) as { query?: unknown };
    query = typeof body.query === "string" ? body.query : "";
  } catch {
    return NextResponse.json({ ids: [], error: "Missing search." }, { status: 400 });
  }

  const result = await smartSearch(query);
  const status = result.error?.startsWith("Too many")
    ? 429
    : result.error?.startsWith("Search credits")
      ? 402
      : 200;
  return NextResponse.json(result, { status });
}
