import { NextResponse } from "next/server";

import { getLotteryStats } from "@/lib/lottery-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const stats = await getLotteryStats();
    return NextResponse.json(
      { ok: true, stats },
      { headers: { "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message: "ยังโหลดสถิติไม่ได้" },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }
}
