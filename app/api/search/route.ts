import { NextResponse } from "next/server";
import { suggestTerms } from "@/lib/search";

export const dynamic = "force-dynamic";

/**
 * Type-ahead suggestions (GET /api/search?q=...).
 * Backed by product_search_terms (FTS + trigram + prefix).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").slice(0, 80);
  if (!q.trim()) {
    return NextResponse.json({ suggestions: [] });
  }
  try {
    const suggestions = await suggestTerms(q, 8);
    return NextResponse.json({ suggestions });
  } catch {
    return NextResponse.json({ suggestions: [] }, { status: 503 });
  }
}