import { NextResponse } from "next/server";
import { analyzeThreeDigitNumbers, analyzeTwoDigitNumbers } from "@/lib/lottery-analysis";
import { getLotteryStats } from "@/lib/lottery-provider";
export const dynamic = "force-dynamic";
export async function GET() {
  try { const stats = await getLotteryStats(); const history = stats.draws.map((draw) => ({ date: draw.drawDate, top: draw.top, bottom: draw.bottom, threeDigit: draw.threeDigit })); return NextResponse.json({ ok: true, status: stats.draws.length >= 6 ? "ready" : "insufficient_data", sampleSize: stats.draws.length, model: "weighted_frequency_position_recency@2.0.0", method: { markovChain: false, exactFrequency: .5, positionFrequency: .3, recency: .2 }, twoDigitResults: analyzeTwoDigitNumbers(history, 6), threeDigitResults: analyzeThreeDigitNumbers(history, 6), disclaimer: "การจัดอันดับมาจากรูปแบบในผลย้อนหลังเพื่อความบันเทิง ไม่ใช่ความน่าจะเป็นของการถูกรางวัล และไม่สามารถรับประกันผลได้" }); }
  catch { return NextResponse.json({ ok: false, message: "ยังวิเคราะห์ข้อมูลไม่ได้" }, { status: 503 }); }
}
