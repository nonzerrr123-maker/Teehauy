import { createClient } from "npm:@supabase/supabase-js@2.116.0";

type PrizeType = "first" | "adjacent_first" | "second" | "third" | "fourth" | "fifth" | "front_three" | "last_three" | "last_two";
type NormalizedPrize = { prize_type: PrizeType; winning_number: string; prize_amount: number; sequence_number: number };
type UnknownRecord = Record<string, unknown>;

const GLO_LATEST_URL = "https://www.glo.or.th/api/lottery/getLatestLottery";
const GLO_HISTORY_URL = "https://www.glo.or.th/api/checking/getLotteryResult";
const OFFICIAL_SOURCE_URL = "https://www.glo.or.th/mission/awarding/orderby-time";
const HISTORY_TYPES = new Set<PrizeType>(["first", "front_three", "last_three", "last_two"]);
const THAI_MONTHS: Record<string, number> = {
  "มกราคม": 1, "ม.ค.": 1, "มค": 1,
  "กุมภาพันธ์": 2, "ก.พ.": 2, "กพ": 2,
  "มีนาคม": 3, "มี.ค.": 3, "มีค": 3,
  "เมษายน": 4, "เม.ย.": 4, "เมย": 4,
  "พฤษภาคม": 5, "พ.ค.": 5, "พค": 5,
  "มิถุนายน": 6, "มิ.ย.": 6, "มิย": 6,
  "กรกฎาคม": 7, "ก.ค.": 7, "กค": 7,
  "สิงหาคม": 8, "ส.ค.": 8, "สค": 8,
  "กันยายน": 9, "ก.ย.": 9, "กย": 9,
  "ตุลาคม": 10, "ต.ค.": 10, "ตค": 10,
  "พฤศจิกายน": 11, "พ.ย.": 11, "พย": 11,
  "ธันวาคม": 12, "ธ.ค.": 12, "ธค": 12,
};

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const isRecord = (value: unknown): value is UnknownRecord => typeof value === "object" && value !== null && !Array.isArray(value);
const isIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};

function thaiDateToIso(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  const iso = normalized.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const numeric = normalized.match(/(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);
  if (numeric) {
    const year = Number(numeric[3]) > 2400 ? Number(numeric[3]) - 543 : Number(numeric[3]);
    return `${year}-${numeric[2].padStart(2, "0")}-${numeric[1].padStart(2, "0")}`;
  }
  const textual = normalized.match(/(\d{1,2})\s+([^\s]+)\s+(\d{4})/);
  if (!textual) return null;
  const month = THAI_MONTHS[textual[2]];
  if (!month) return null;
  const year = Number(textual[3]) > 2400 ? Number(textual[3]) - 543 : Number(textual[3]);
  return `${year}-${String(month).padStart(2, "0")}-${textual[1].padStart(2, "0")}`;
}

function walkRecords(value: unknown, maxDepth = 8): UnknownRecord[] {
  const records: UnknownRecord[] = [];
  const queue: { value: unknown; depth: number }[] = [{ value, depth: 0 }];
  const seen = new Set<object>();
  while (queue.length) {
    const current = queue.shift();
    if (!current || current.depth > maxDepth || typeof current.value !== "object" || current.value === null || seen.has(current.value)) continue;
    seen.add(current.value);
    if (Array.isArray(current.value)) {
      current.value.forEach((child) => queue.push({ value: child, depth: current.depth + 1 }));
    } else {
      records.push(current.value as UnknownRecord);
      Object.values(current.value).forEach((child) => queue.push({ value: child, depth: current.depth + 1 }));
    }
  }
  return records;
}

function findValue(records: UnknownRecord[], aliases: string[]): unknown {
  const normalizedAliases = new Set(aliases.map((alias) => alias.toLowerCase()));
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (normalizedAliases.has(key.toLowerCase())) return value;
    }
  }
  return undefined;
}

function collectNumbers(value: unknown, length: number): string[] {
  if (value == null) return [];
  if (typeof value === "string" || typeof value === "number") {
    const digits = String(value).replace(/\D/g, "");
    return digits.length === length ? [digits] : [];
  }
  if (Array.isArray(value)) return value.flatMap((item) => collectNumbers(item, length));
  if (!isRecord(value)) return [];
  const preferred = ["number", "numbers", "value", "lotteryNumber", "rewardNumber", "runningNumber"];
  for (const key of preferred) {
    const entry = Object.entries(value).find(([candidate]) => candidate.toLowerCase() === key.toLowerCase());
    if (entry) return collectNumbers(entry[1], length);
  }
  return [];
}

function findDrawDate(records: UnknownRecord[]): string | null {
  const aliases = new Set(["displaydate", "date", "drawdate", "draw_date", "period_date", "lotterydate"]);
  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (!aliases.has(key.toLowerCase())) continue;
      const parsed = thaiDateToIso(value);
      if (parsed) return parsed;
    }
  }
  return null;
}

function normalizeGloPayload(payload: unknown, options: { expectedDate?: string; subsetOnly?: boolean } = {}) {
  if (!isRecord(payload)) throw new Error("GLO response is not an object");
  const records = walkRecords(payload);
  const groups: { type: PrizeType; aliases: string[]; amount: number; count: number; length: number }[] = [
    { type: "first", aliases: ["first", "prizeFirst", "prize_first"], amount: 6000000, count: 1, length: 6 },
    { type: "adjacent_first", aliases: ["near1", "nearFirst", "prizeFirstNear", "adjacent_first"], amount: 100000, count: 2, length: 6 },
    { type: "second", aliases: ["second", "prizeSecond"], amount: 200000, count: 5, length: 6 },
    { type: "third", aliases: ["third", "prizeThird"], amount: 80000, count: 10, length: 6 },
    { type: "fourth", aliases: ["fourth", "prizeForth", "prizeFourth"], amount: 40000, count: 50, length: 6 },
    { type: "fifth", aliases: ["fifth", "prizeFifth"], amount: 20000, count: 100, length: 6 },
    { type: "front_three", aliases: ["last3f", "front3", "frontThree", "runningNumberFrontThree"], amount: 4000, count: 2, length: 3 },
    { type: "last_three", aliases: ["last3b", "last3", "lastThree", "runningNumberBackThree"], amount: 4000, count: 2, length: 3 },
    { type: "last_two", aliases: ["last2", "lastTwo", "runningNumberBackTwo"], amount: 2000, count: 1, length: 2 },
  ];

  const normalized: NormalizedPrize[] = [];
  for (const group of groups) {
    if (options.subsetOnly && !HISTORY_TYPES.has(group.type)) continue;
    const numbers = collectNumbers(findValue(records, group.aliases), group.length);
    if (numbers.length !== group.count) throw new Error(`Invalid ${group.type} prize group`);
    numbers.forEach((winning_number, index) => normalized.push({ prize_type: group.type, winning_number, prize_amount: group.amount, sequence_number: index + 1 }));
  }

  const detectedDate = findDrawDate(records);
  if (options.expectedDate && detectedDate && detectedDate !== options.expectedDate) throw new Error(`GLO returned ${detectedDate} for requested draw ${options.expectedDate}`);
  const drawDate = detectedDate ?? options.expectedDate ?? null;
  const expectedCount = options.subsetOnly ? 6 : 173;
  if (!drawDate || !isIsoDate(drawDate) || normalized.length !== expectedCount) throw new Error("GLO payload failed date or prize-count validation");
  return { draw_date: drawDate, source_url: OFFICIAL_SOURCE_URL, prizes: normalized };
}

async function fetchOfficial(url: string, body?: UnknownRecord) {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json", "User-Agent": "Teehuay-Lottery-Importer/1.0" },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (!response.ok) throw new Error(`GLO returned HTTP ${response.status}`);
  return await response.json() as unknown;
}

async function fetchLatestFromGlo() {
  const rawPayload = await fetchOfficial(GLO_LATEST_URL);
  return { rawPayload, normalized: normalizeGloPayload(rawPayload) };
}

async function fetchHistoricalFromGlo(date: string) {
  const [year, month, day] = date.split("-");
  const rawPayload = await fetchOfficial(GLO_HISTORY_URL, { date: day, month, year });
  return { rawPayload, normalized: normalizeGloPayload(rawPayload, { expectedDate: date, subsetOnly: true }) };
}

async function checksum(payload: unknown) {
  const raw = JSON.stringify(payload);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
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

  if (input.mode === "fetch_history") {
    const dates = Array.isArray(input.dates) ? [...new Set(input.dates.map(String))] : [];
    if (!dates.length || dates.length > 48 || dates.some((date) => !isIsoDate(date))) return json({ ok: false, error: "INVALID_HISTORY_DATES" }, 422);
    const imported: { draw_date: string; draw_id: string; checksum: string }[] = [];
    const failures: { draw_date: string; message: string }[] = [];
    for (let index = 0; index < dates.length; index += 4) {
      const batch = await Promise.all(dates.slice(index, index + 4).map(async (date) => {
        try {
          const fetched = await fetchHistoricalFromGlo(date);
          const digest = await checksum(fetched.rawPayload);
          const result = await admin.rpc("ingest_official_lottery_subset", { p_draw_date: date, p_source_url: fetched.normalized.source_url, p_source_checksum: digest, p_raw_payload: fetched.rawPayload, p_prizes: fetched.normalized.prizes, p_actor: auth.user.id });
          if (result.error) throw result.error;
          return { ok: true as const, draw_date: date, draw_id: result.data, checksum: digest };
        } catch (error) {
          return { ok: false as const, draw_date: date, message: error instanceof Error ? error.message : "Unable to import draw" };
        }
      }));
      batch.forEach((result) => {
        if (result.ok) imported.push({ draw_date: result.draw_date, draw_id: result.draw_id, checksum: result.checksum });
        else failures.push({ draw_date: result.draw_date, message: result.message });
      });
    }
    return json({ ok: failures.length === 0, imported, failures, source: "glo_history_api", result_scope: "analysis_subset" }, failures.length ? 207 : 200);
  }

  let rawPayload: unknown = input;
  let normalized: { draw_date: string; source_url: string; prizes: NormalizedPrize[] };
  try {
    if (input.mode === "fetch_latest") {
      const fetched = await fetchLatestFromGlo();
      rawPayload = fetched.rawPayload;
      normalized = fetched.normalized;
    } else {
      const prizes = Array.isArray(input.prizes) ? input.prizes as NormalizedPrize[] : [];
      normalized = { draw_date: String(input.draw_date ?? ""), source_url: String(input.source_url ?? OFFICIAL_SOURCE_URL), prizes };
    }
  } catch (error) {
    return json({ ok: false, error: "OFFICIAL_PROVIDER_UNAVAILABLE", message: error instanceof Error ? error.message : "Unable to fetch official results", fallback: "Upload the official GLO PDF and submit a normalized admin payload after manual verification." }, 502);
  }

  if (!isIsoDate(normalized.draw_date) || normalized.prizes.length !== 173) return json({ ok: false, error: "INVALID_OFFICIAL_PAYLOAD" }, 422);
  const digest = await checksum(rawPayload);
  const result = await admin.rpc("ingest_official_lottery_draw", { p_draw_date: normalized.draw_date, p_source_url: normalized.source_url, p_source_checksum: digest, p_raw_payload: rawPayload, p_prizes: normalized.prizes, p_actor: auth.user.id });
  return result.error ? json({ ok: false, error: "IMPORT_FAILED", message: result.error.message }, 422) : json({ ok: true, draw_id: result.data, checksum: digest, source: input.mode === "fetch_latest" ? "glo_latest_api" : "admin_verified_payload" });
});
