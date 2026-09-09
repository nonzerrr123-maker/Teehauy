import { createClient } from "npm:@supabase/supabase-js@2.116.0";

type PrizeType = "first" | "adjacent_first" | "second" | "third" | "fourth" | "fifth" | "front_three" | "last_three" | "last_two";
type NormalizedPrize = { prize_type: PrizeType; winning_number: string; prize_amount: number; sequence_number: number };
type UnknownRecord = Record<string, unknown>;

const GLO_LATEST_URL = "https://www.glo.or.th/api/lottery/getLatestLottery";
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const isRecord = (value: unknown): value is UnknownRecord => typeof value === "object" && value !== null && !Array.isArray(value);

function thaiDateToIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const iso = value.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const numeric = value.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (!numeric) return null;
  const year = Number(numeric[3]) > 2400 ? Number(numeric[3]) - 543 : Number(numeric[3]);
  return `${year}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
}

function numberList(value: unknown): string[] {
  const source = isRecord(value) ? value.number ?? value.numbers ?? value.value : value;
  const list = Array.isArray(source) ? source : source == null ? [] : [source];
  return list.map(String).map((item) => item.replace(/\D/g, "")).filter(Boolean);
}

function findPrizeGroup(prizes: UnknownRecord, aliases: string[]): unknown {
  for (const alias of aliases) if (alias in prizes) return prizes[alias];
  return undefined;
}

function normalizeGloPayload(payload: unknown) {
  if (!isRecord(payload)) throw new Error("GLO response is not an object");
  const root = isRecord(payload.response) ? payload.response : isRecord(payload.data) ? payload.data : payload;
  const prizes = isRecord(root.prizes) ? root.prizes : isRecord(root.data) && isRecord(root.data.prizes) ? root.data.prizes : null;
  if (!prizes) throw new Error("GLO response does not contain a prizes object");

  const groups: { type: PrizeType; aliases: string[]; amount: number; count: number; length: number }[] = [
    { type: "first", aliases: ["first", "prizeFirst", "prize_first"], amount: 6000000, count: 1, length: 6 },
    { type: "adjacent_first", aliases: ["near1", "nearFirst", "prizeFirstNear", "adjacent_first"], amount: 100000, count: 2, length: 6 },
    { type: "second", aliases: ["second", "prizeSecond"], amount: 200000, count: 5, length: 6 },
    { type: "third", aliases: ["third", "prizeThird"], amount: 80000, count: 10, length: 6 },
    { type: "fourth", aliases: ["fourth", "prizeForth", "prizeFourth"], amount: 40000, count: 50, length: 6 },
    { type: "fifth", aliases: ["fifth", "prizeFifth"], amount: 20000, count: 100, length: 6 },
    { type: "front_three", aliases: ["front3", "frontThree", "runningNumberFrontThree"], amount: 4000, count: 2, length: 3 },
    { type: "last_three", aliases: ["last3", "lastThree", "runningNumberBackThree"], amount: 4000, count: 2, length: 3 },
    { type: "last_two", aliases: ["last2", "lastTwo", "runningNumberBackTwo"], amount: 2000, count: 1, length: 2 },
  ];

  const normalized: NormalizedPrize[] = [];
  for (const group of groups) {
    const numbers = numberList(findPrizeGroup(prizes, group.aliases));
    if (numbers.length !== group.count || numbers.some((number) => number.length !== group.length)) throw new Error(`Invalid ${group.type} prize group`);
    numbers.forEach((winning_number, index) => normalized.push({ prize_type: group.type, winning_number, prize_amount: group.amount, sequence_number: index + 1 }));
  }

  const date = thaiDateToIso(root.date ?? root.draw_date ?? root.period_date ?? (isRecord(root.period) ? root.period.date : null));
  if (!date || normalized.length !== 173) throw new Error("GLO payload failed date or prize-count validation");
  const sourceUrl = typeof root.pdf_url === "string" ? root.pdf_url : GLO_LATEST_URL;
  return { draw_date: date, source_url: sourceUrl, prizes: normalized };
}

async function fetchLatestFromGlo() {
  const response = await fetch(GLO_LATEST_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Teehuay-Lottery-Importer/1.0" },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`GLO returned HTTP ${response.status}`);
  const rawPayload: unknown = await response.json();
  return { rawPayload, normalized: normalizeGloPayload(rawPayload) };
}

Deno.serve(async (request) => {
  if (request.method !== "POST") return json({ ok: false, error: "METHOD_NOT_ALLOWED" }, 405);
  const admin = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "", { auth: { persistSession: false } });
  const token = (request.headers.get("Authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  if (!auth.user) return json({ ok: false, error: "AUTH_REQUIRED" }, 401);
  const role = await admin.from("user_roles").select("role").eq("user_id", auth.user.id).eq("role", "admin").maybeSingle();
  if (!role.data) return json({ ok: false, error: "ADMIN_REQUIRED" }, 403);

  let input: UnknownRecord = {};
  try { const parsed: unknown = await request.json(); input = isRecord(parsed) ? parsed : {}; } catch { input = {}; }

  let rawPayload: unknown = input;
  let normalized: { draw_date: string; source_url: string; prizes: NormalizedPrize[] };
  try {
    if (input.mode === "fetch_latest") {
      const fetched = await fetchLatestFromGlo();
      rawPayload = fetched.rawPayload;
      normalized = fetched.normalized;
    } else {
      const prizes = Array.isArray(input.prizes) ? input.prizes as NormalizedPrize[] : [];
      normalized = { draw_date: String(input.draw_date ?? ""), source_url: String(input.source_url ?? "https://www.glo.or.th/"), prizes };
    }
  } catch (error) {
    return json({ ok: false, error: "OFFICIAL_PROVIDER_UNAVAILABLE", message: error instanceof Error ? error.message : "Unable to fetch official results", fallback: "Upload the official GLO PDF and submit a normalized admin payload after manual verification." }, 502);
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized.draw_date) || normalized.prizes.length !== 173) return json({ ok: false, error: "INVALID_OFFICIAL_PAYLOAD" }, 422);
  const raw = JSON.stringify(rawPayload);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const checksum = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  const result = await admin.rpc("ingest_official_lottery_draw", { p_draw_date: normalized.draw_date, p_source_url: normalized.source_url, p_source_checksum: checksum, p_raw_payload: rawPayload, p_prizes: normalized.prizes, p_actor: auth.user.id });
  return result.error ? json({ ok: false, error: "IMPORT_FAILED", message: result.error.message }, 422) : json({ ok: true, draw_id: result.data, checksum, source: input.mode === "fetch_latest" ? "glo_latest_api" : "admin_verified_payload" });
});
