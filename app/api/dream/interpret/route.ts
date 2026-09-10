import { NextResponse } from "next/server";
import { saveDreamInterpretation } from "@/lib/db";
import { interpretDream, isDreamClarificationResolution } from "@/lib/dream-engine";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  let payload: { dreamText?: unknown; clarification?: unknown };
  try { payload = await request.json(); } catch { return NextResponse.json({ ok: false, message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 }); }
  if (typeof payload.dreamText !== "string" || payload.dreamText.trim().length < 2 || payload.dreamText.trim().length > 300) return NextResponse.json({ ok: false, message: "ความฝันต้องมีความยาว 2-300 ตัวอักษร" }, { status: 422 });
  if (payload.clarification !== undefined && !isDreamClarificationResolution(payload.clarification)) return NextResponse.json({ ok: false, message: "ตัวเลือกคำกำกวมไม่ถูกต้อง" }, { status: 422 });
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "กรุณาเข้าสู่ระบบก่อนตีเลข" }, { status: 401 });
  const limit = await supabase.rpc("check_rate_limit", { p_operation: "dream_interpret", p_limit: 20, p_window_seconds: 60 });
  if (limit.error || limit.data !== true) return NextResponse.json({ ok: false, message: "ตีเลขถี่เกินไป กรุณารอสักครู่" }, { status: 429 });
  try {
    const interpretation = interpretDream(payload.dreamText.trim(), payload.clarification);
    if (interpretation.analysis?.clarification) {
      return NextResponse.json({ ok: true, result: interpretation, persisted: false, authenticated: true }, { headers: { "Cache-Control": "no-store" } });
    }
    const result = await saveDreamInterpretation(interpretation);
    return NextResponse.json({ ok: true, result, persisted: true, authenticated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, message: "ยังบันทึกผลการตีเลขไม่ได้" }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
