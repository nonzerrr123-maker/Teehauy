import { createClient } from "@/lib/supabase/server";

export type LotteryDraw = { date: string; drawDate: string; first: string; top: string; bottom: string; threeDigit: string[] };
export type LotteryStats = {
  source: "ranlotto" | "mixed" | "official" | "unavailable";
  sourceLabel: string;
  resultScope: "full" | "analysis_subset" | "mixed" | "unavailable";
  verifiedDraws: number;
  archiveDraws: number;
  draws: LotteryDraw[];
  digitFrequency: { digit: string; count: number }[];
  hotNumbers: string[];
  coldNumbers: string[];
  updatedAt: string;
};

type Prize = { prize_type: string; winning_number: string };
type Draw = {
  draw_date: string;
  status: "published" | "verified";
  source_name: string;
  result_scope: "full" | "analysis_subset";
  lottery_prizes: Prize[];
};

export async function getLotteryStats(): Promise<LotteryStats> {
  const supabase = await createClient();
  const response = await supabase
    .from("lottery_draws")
    .select("draw_date, status, source_name, result_scope, lottery_prizes(prize_type, winning_number)")
    .in("status", ["published", "verified"])
    .order("draw_date", { ascending: false })
    .limit(1000);
  if (response.error) throw response.error;

  const rows = (response.data ?? []) as unknown as Draw[];
  const draws = rows.flatMap((row) => {
    const first = row.lottery_prizes.find((prize) => prize.prize_type === "first")?.winning_number;
    const bottom = row.lottery_prizes.find((prize) => prize.prize_type === "last_two")?.winning_number;
    return first && bottom ? [{
      date: new Date(`${row.draw_date}T12:00:00+07:00`).toLocaleDateString("th-TH"),
      drawDate: row.draw_date,
      first,
      top: first.slice(-2),
      bottom,
      threeDigit: [first.slice(-3)],
    }] : [];
  });

  const counts = Array.from({ length: 10 }, () => 0);
  draws.forEach((draw) => (draw.first + draw.bottom).split("").forEach((digit) => { counts[Number(digit)] += 1; }));
  const pairCounts = new Map<string, number>();
  draws.flatMap((draw) => [draw.top, draw.bottom]).forEach((value) => pairCounts.set(value, (pairCounts.get(value) ?? 0) + 1));
  const ranked = [...pairCounts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const scopes = new Set(rows.map((row) => row.result_scope));
  const sources = new Set(rows.map((row) => row.source_name));
  const resultScope = !draws.length ? "unavailable" : scopes.size > 1 ? "mixed" : scopes.has("analysis_subset") ? "analysis_subset" : "full";
  const source = !draws.length ? "unavailable" : sources.size > 1 ? "mixed" : sources.has("RANLOTTO") ? "ranlotto" : "official";
  const verifiedDraws = rows.filter((row) => row.status === "verified").length;
  const archiveDraws = rows.filter((row) => row.status === "published").length;
  const sourceLabel = !draws.length
    ? "ยังไม่มีผลรางวัลย้อนหลังที่พร้อมแสดง"
    : source === "ranlotto"
      ? "RANLOTTO · ฐานผลรางวัลที่เผยแพร่ต่อสาธารณะ"
      : source === "mixed"
        ? "RANLOTTO เป็นแหล่งนำเข้าหลัก ร่วมกับงวดที่ตรวจสอบไว้เดิม"
        : "งวดที่ตรวจสอบไว้เดิมจากสำนักงานสลากกินแบ่งรัฐบาล";

  return {
    source,
    sourceLabel,
    resultScope,
    verifiedDraws,
    archiveDraws,
    draws,
    digitFrequency: counts.map((count, digit) => ({ digit: String(digit), count })),
    hotNumbers: ranked.slice(0, 6).map(([value]) => value),
    coldNumbers: ranked.slice(-6).reverse().map(([value]) => value),
    updatedAt: new Date().toISOString(),
  };
}
