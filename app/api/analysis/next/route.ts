import { NextResponse } from "next/server";
import { analyzeTwoDigitNumbers } from "@/lib/lottery-analysis";
import { getLotteryStats } from "@/lib/lottery-provider";
export const dynamic = "force-dynamic";
export async function GET() {
  try { const stats = await getLotteryStats(); const results = analyzeTwoDigitNumbers(stats.draws.map((draw) => ({ date: draw.drawDate, top: draw.top, bottom: draw.bottom })), 12); return NextResponse.json({ ok: true, status: stats.draws.length >= 6 ? "ready" : "insufficient_data", sampleSize: stats.draws.length, model: "frequency_recency_gap_ensemble@1.0.0", results, disclaimer: "การวิเคราะห์ใช้รูปแบบทางคณิตศาสตร์จากข้อมูลย้อนหลัง ไม่สามารถรับประกันผลรางวัลได้" }); }
  catch { return NextResponse.json({ ok: false, message: "ยังวิเคราะห์ข้อมูลไม่ได้" }, { status: 503 }); }
}
