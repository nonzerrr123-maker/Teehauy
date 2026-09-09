import { NextResponse } from "next/server";
import { setDreamFavorite } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  let payload: { interpretationId?: unknown; favorite?: unknown };
  try { payload = await request.json(); } catch { return NextResponse.json({ ok: false, message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 }); }
  if (typeof payload.interpretationId !== "string" || typeof payload.favorite !== "boolean") return NextResponse.json({ ok: false, message: "ข้อมูลรายการโปรดไม่ถูกต้อง" }, { status: 422 });
  try { const favorite = await setDreamFavorite(user.id, payload.interpretationId, payload.favorite); return NextResponse.json({ ok: true, favorite }); }
  catch { return NextResponse.json({ ok: false, message: "ยังบันทึกรายการโปรดไม่ได้" }, { status: 503 }); }
}
