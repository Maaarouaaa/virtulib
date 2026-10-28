import { NextResponse } from "next/server";
import { searchCatalogue } from "@/lib/openLibraryServer";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q") ?? "";
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const result = await searchCatalogue(query, page, request.signal);
  const status = result.error?.includes("slow down") ? 429 : result.error ? 502 : 200;
  return NextResponse.json(result, { status: status === 200 ? 200 : 200 });
}

export async function POST(request: Request) {
  let query = "";
  let page = 1;
  try {
    const body = (await request.json()) as { query?: unknown; q?: unknown; page?: unknown };
    query = typeof body.query === "string" ? body.query : typeof body.q === "string" ? body.q : "";
    page = Math.max(1, Number(body.page ?? 1) || 1);
  } catch {
    return NextResponse.json(
      { docs: [], numFound: 0, page: 1, error: "Missing search." },
      { status: 400 }
    );
  }
  const result = await searchCatalogue(query, page, request.signal);
  return NextResponse.json(result);
}
