import { createClient } from "@/lib/supabase/server";
export type LotteryDraw = { date: string; drawDate: string; first: string; top: string; bottom: string };
export type LotteryStats = { source: "official" | "unavailable"; sourceLabel: string; draws: LotteryDraw[]; digitFrequency: { digit: string; count: number }[]; hotNumbers: string[]; coldNumbers: string[]; updatedAt: string };
type Prize = { prize_type: string; winning_number: string };
type Draw = { draw_date: string; lottery_prizes: Prize[] };
export async function getLotteryStats(): Promise<LotteryStats> {
  const supabase = await createClient();
  const response = await supabase.from("lottery_draws").select("draw_date, lottery_prizes(prize_type, winning_number)").in("status", ["published", "verified"]).order("draw_date", { ascending: false }).limit(24);
  if (response.error) throw response.error;
  const draws = ((response.data ?? []) as unknown as Draw[]).flatMap((row) => { const first = row.lottery_prizes.find((p) => p.prize_type === "first")?.winning_number; const bottom = row.lottery_prizes.find((p) => p.prize_type === "last_two")?.winning_number; return first && bottom ? [{ date: new Date(row.draw_date + "T12:00:00+07:00").toLocaleDateString("th-TH"), drawDate: row.draw_date, first, top: first.slice(-2), bottom }] : []; });
  const counts = Array.from({ length: 10 }, () => 0); draws.forEach((draw) => (draw.first + draw.bottom).split("").forEach((digit) => { counts[Number(digit)] += 1; }));
  const pairCounts = new Map<string, number>(); draws.flatMap((draw) => [draw.top, draw.bottom]).forEach((value) => pairCounts.set(value, (pairCounts.get(value) ?? 0) + 1)); const ranked = [...pairCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  return { source: draws.length ? "official" : "unavailable", sourceLabel: draws.length ? "สำนักงานสลากกินแบ่งรัฐบาล · ข้อมูลที่ผ่านการนำเข้า" : "ยังไม่มีผลรางวัลทางการที่ผ่านการตรวจสอบ", draws, digitFrequency: counts.map((count, digit) => ({ digit: String(digit), count })), hotNumbers: ranked.slice(0, 6).map(([value]) => value), coldNumbers: ranked.slice(-6).reverse().map(([value]) => value), updatedAt: new Date().toISOString() };
}
