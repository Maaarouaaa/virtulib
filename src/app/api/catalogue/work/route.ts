import { NextResponse } from "next/server";
import { readWork } from "@/lib/openLibraryServer";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key") ?? "";
  if (!key.includes("/works/") && !/^OL\d+W$/i.test(key)) {
    return NextResponse.json({ description: "", subjects: [] });
  }
  const result = await readWork(key, request.signal);
  return NextResponse.json(result);
}
