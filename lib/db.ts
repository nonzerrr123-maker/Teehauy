import type { DreamResult, NumberItem } from "@/lib/dream-engine";
import { createClient } from "@/lib/supabase/server";
type DreamJoin = { dream_text?: string; occurred_on?: string | null; created_at?: string };
type Row = { id: string; meaning: string; lucky_element: DreamResult["luckyElement"]; numbers: NumberItem[]; created_at: string; dreams?: DreamJoin | DreamJoin[] | null };
const dreamOf = (value: Row["dreams"]): DreamJoin => (Array.isArray(value) ? value[0] : value) ?? {};
const mapRow = (row: Row): DreamResult & { id: string } => { const dream = dreamOf(row.dreams); return { id: row.id, dreamText: dream.dream_text ?? "ความฝันที่บันทึกไว้", numbers: Array.isArray(row.numbers) ? row.numbers : [], meaning: row.meaning, luckyElement: row.lucky_element, date: (dream.occurred_on ?? dream.created_at ?? row.created_at).slice(0, 10) }; };

export async function saveDreamInterpretation(result: DreamResult) {
  const supabase = await createClient();
  const response = await supabase.rpc("save_dream_result", { p_dream_text: result.dreamText, p_meaning: result.meaning, p_lucky_element: result.luckyElement, p_engine_version: result.analysis?.engineVersion ?? "rule-engine-v2", p_numbers: result.numbers });
  if (response.error || typeof response.data !== "string") throw response.error ?? new Error("Dream result was not saved");
  return { ...result, id: response.data };
}
export async function listDreamHistory(limit = 30) {
  const supabase = await createClient();
  const response = await supabase.from("dream_interpretations").select("id, meaning, lucky_element, numbers, created_at, dreams!inner(dream_text, occurred_on, created_at)").order("created_at", { ascending: false }).limit(limit);
  if (response.error) throw response.error;
  return ((response.data ?? []) as unknown as Row[]).map(mapRow);
}
export async function listDreamFavorites(limit = 100) {
  const supabase = await createClient();
  const response = await supabase.from("dream_favorites").select("created_at, dream_interpretations!inner(id, meaning, lucky_element, numbers, created_at, dreams!inner(dream_text, occurred_on, created_at))").order("created_at", { ascending: false }).limit(limit);
  if (response.error) throw response.error;
  return (response.data ?? []).flatMap((favorite) => { const value = (favorite as Record<string, unknown>).dream_interpretations; const row = (Array.isArray(value) ? value[0] : value) as Row | undefined; return row ? [mapRow(row)] : []; });
}
export async function setDreamFavorite(userId: string, interpretationId: string, favorite: boolean) {
  const supabase = await createClient();
  const response = favorite ? await supabase.from("dream_favorites").upsert({ user_id: userId, interpretation_id: interpretationId }) : await supabase.from("dream_favorites").delete().eq("interpretation_id", interpretationId).eq("user_id", userId);
  if (response.error) throw response.error;
  return favorite;
}
