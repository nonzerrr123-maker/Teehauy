import { NextResponse } from "next/server";

import { matchLocalLotteryPrizes, parseRanlottoCheckResponse, type LotteryPrizeRow } from "@/lib/lottery-checker";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type CheckRequest = { number?: unknown; date?: unknown };
type DrawWithPrizes = {
  draw_date: string;
  result_scope: string;
  status: string;
  lottery_prizes: LotteryPrizeRow[];
};

const RANLOTTO_API_BASE = process.env.RANLOTTO_API_BASE_URL ?? "https://api.ranlotto.com/api/public/v1";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "กรุณาเข้าสู่ระบบก่อนตรวจสลาก" }, { status: 401 });

  let input: CheckRequest;
  try {
    input = await request.json() as CheckRequest;
  } catch {
    return NextResponse.json({ ok: false, message: "ข้อมูลที่ส่งมาไม่ถูกต้อง" }, { status: 400 });
  }

  const number = typeof input.number === "string" ? input.number.trim() : "";
  const date = typeof input.date === "string" && input.date !== "" ? input.date : "latest";
  if (!/^\d{6}$/.test(number)) return NextResponse.json({ ok: false, message: "กรอกเลขสลากให้ครบ 6 หลัก" }, { status: 422 });
  if (date !== "latest" && !/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ ok: false, message: "งวดที่เลือกไม่ถูกต้อง" }, { status: 422 });

  try {
    const url = new URL(`${RANLOTTO_API_BASE}/lottery/check`);
    url.searchParams.set("number", number);
    url.searchParams.set("date", date);
    const apiKey = process.env.RANLOTTO_API_KEY;
    const response = await fetch(url, {
      headers: { "Accept": "application/json", ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}) },
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error(`RANLOTTO_HTTP_${response.status}`);
    const checked = parseRanlottoCheckResponse(await response.json() as unknown, number, date);
    return NextResponse.json({ ok: true, result: checked }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    let query = supabase
      .from("lottery_draws")
      .select("draw_date,result_scope,status,lottery_prizes(prize_type,winning_number,prize_amount)")
      .eq("status", "verified")
      .eq("result_scope", "full");
    query = date === "latest" ? query.order("draw_date", { ascending: false }).limit(1) : query.eq("draw_date", date).limit(1);
    const { data, error } = await query.maybeSingle();
    const draw = data as unknown as DrawWithPrizes | null;
    if (error || !draw || !Array.isArray(draw.lottery_prizes) || draw.lottery_prizes.length !== 173) {
      return NextResponse.json({ ok: false, message: "แหล่งผลรางวัลขัดข้องชั่วคราว กรุณาลองใหม่อีกครั้ง" }, { status: 503, headers: { "Cache-Control": "no-store" } });
    }
    const checked = matchLocalLotteryPrizes(number, draw.draw_date, draw.lottery_prizes);
    return NextResponse.json({ ok: true, result: checked }, { headers: { "Cache-Control": "no-store" } });
  }
}
