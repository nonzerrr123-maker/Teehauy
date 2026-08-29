import { NextResponse } from "next/server";

import { getLotteryStats } from "@/lib/lottery-provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const stats = await getLotteryStats();

  return NextResponse.json(
    { ok: true, stats },
    { headers: { "Cache-Control": "public, max-age=0, s-maxage=900, stale-while-revalidate=3600" } },
  );
}
