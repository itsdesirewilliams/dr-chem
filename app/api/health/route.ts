import { NextResponse } from "next/server";
import { ping } from "@/lib/db";

export const dynamic = "force-dynamic";

/** Health probe — database reachability for ops dashboards. */
export async function GET() {
  try {
    await ping();
    return NextResponse.json({ ok: true, db: "up" });
  } catch {
    return NextResponse.json({ ok: false, db: "down" }, { status: 503 });
  }
}