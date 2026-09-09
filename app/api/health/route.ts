import { NextResponse } from "next/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createClient } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false, database: { configured: false } }, { status: 503 });
  try { const supabase = await createClient(); const { error } = await supabase.from("analysis_model_versions").select("id", { head: true, count: "exact" }).limit(1); if (error) throw error; return NextResponse.json({ ok: true, service: "teehauy", version: 3, persistenceMode: "database", database: { configured: true, reachable: true, schemaReady: true } }); }
  catch { return NextResponse.json({ ok: false, database: { configured: true, reachable: false, schemaReady: false } }, { status: 503 }); }
}
