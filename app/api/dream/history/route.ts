import { NextResponse } from "next/server";
import { listDreamFavorites, listDreamHistory } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: "กรุณาเข้าสู่ระบบ" }, { status: 401 });
  try {
    const [history, favorites] = await Promise.all([listDreamHistory(30), listDreamFavorites(100)]);
    return NextResponse.json({ ok: true, history, favorites, authenticated: true }, { headers: { "Cache-Control": "no-store" } });
  } catch { return NextResponse.json({ ok: false, message: "ยังโหลดประวัติไม่ได้" }, { status: 503 }); }
}
