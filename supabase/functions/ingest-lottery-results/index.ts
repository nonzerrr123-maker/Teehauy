import { createClient } from "npm:@supabase/supabase-js@2.116.0";

type PrizeType = "first" | "adjacent_first" | "second" | "third" | "fourth" | "fifth" | "front_three" | "last_three" | "last_two";
type NormalizedPrize = { prize_type: PrizeType; winning_number: string; prize_amount: number; sequence_number: number };
type NormalizedDraw = {
  draw_date: string;
  record_id: string;
  verification_status: ProviderVerificationStatus;
  result_scope: "full" | "analysis_subset";
  prizes: NormalizedPrize[];
  raw_payload: unknown;
};
type ProviderVerificationStatus = "issuer_verified" | "partial_verified" | "legacy_published" | "ranlotto_published" | "unverified" | "disputed";
type UnknownRecord = Record<string, unknown>;

const RANLOTTO_API_BASE = "https://api.ranlotto.com/api/public/v1";
const OFFICIAL_SOURCE_URL = "https://www.glo.or.th/mission/awarding/orderby-time";
const PROVIDER_STATUSES = new Set<ProviderVerificationStatus>(["issuer_verified", "partial_verified", "legacy_published", "ranlotto_published", "unverified", "disputed"]);
const RANLOTTO_GROUPS: { key: string; type: PrizeType; count: number; length: number }[] = [
  { key: "firstPrize", type: "first", count: 1, length: 6 },
  { key: "adjacentFirstPrize", type: "adjacent_first", count: 2, length: 6 },
  { key: "secondPrize", type: "second", count: 5, length: 6 },
  { key: "thirdPrize", type: "third", count: 10, length: 6 },
  { key: "fourthPrize", type: "fourth", count: 50, length: 6 },
  { key: "fifthPrize", type: "fifth", count: 100, length: 6 },
  { key: "frontThreeDigits", type: "front_three", count: 2, length: 3 },
  { key: "lastThreeDigits", type: "last_three", count: 2, length: 3 },
  { key: "lastTwoDigits", type: "last_two", count: 1, length: 2 },
];
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const isRecord = (value: unknown): value is UnknownRecord => typeof value === "object" && value !== null && !Array.isArray(value);
const isIsoDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.valueOf()) && parsed.toISOString().slice(0, 10) === value;
};

async function checksum(payload: unknown) {
  const raw = JSON.stringify(payload);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  return Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function requiredRecord(value: unknown, label: string): UnknownRecord {
  if (!isRecord(value)) throw new Error(`RANLOTTO ${label} is invalid`);
  return value;
}

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || !value.trim()) throw new Error(`RANLOTTO ${label} is invalid`);
  return value.trim();
}

function providerStatus(value: unknown): ProviderVerificationStatus {
  return typeof value === "string" && PROVIDER_STATUSES.has(value as ProviderVerificationStatus)
    ? value as ProviderVerificationStatus
    : "unverified";
}

async function fetchRanlotto(path: string) {
  const apiKey = Deno.env.get("RANLOTTO_API_KEY");
  const response = await fetch(`${RANLOTTO_API_BASE}${path}`, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "Teehuay-Lottery-Importer/2.0",
      ...(apiKey ? { "Authorization": `Bearer ${apiKey}` } : {}),
    },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`RANLOTTO returned HTTP ${response.status}`);
  return await response.json() as unknown;
}

function normalizeRanlottoFull(compatibility: unknown, provenancePayload: unknown): NormalizedDraw {
  const envelope = requiredRecord(compatibility, "response");
  if (envelope.status !== "success") throw new Error("RANLOTTO full result was not successful");
  const data = requiredRecord(envelope.data, "draw");
  const drawDate = requiredString(data.drawDate, "draw date");
  if (!isIsoDate(drawDate)) throw new Error("RANLOTTO draw date is invalid");
  const groups = requiredRecord(data.prizes, "prize groups");
  const legacySchema = drawDate < "2015-09-01";
  const prizes: NormalizedPrize[] = [];

  for (const definition of RANLOTTO_GROUPS) {
    const expectedCount = definition.type === "front_three" && legacySchema
      ? 0
      : definition.type === "last_three" && legacySchema
        ? 4
        : definition.count;
    const groupValue = groups[definition.key];
    if (expectedCount === 0) continue;
    const group = requiredRecord(groupValue, `${definition.key} group`);
    const numbers = Array.isArray(group.numbers) ? group.numbers : [];
    const amount = group.rewardAmount;
    if (numbers.length !== expectedCount || typeof amount !== "number" || !Number.isFinite(amount) || amount < 0) {
      throw new Error(`RANLOTTO ${definition.key} group is incomplete`);
    }
    numbers.forEach((value, index) => {
      const winningNumber = requiredString(value, `${definition.key} number`);
      if (!new RegExp(`^\\d{${definition.length}}$`).test(winningNumber)) throw new Error(`RANLOTTO ${definition.key} number is invalid`);
      prizes.push({ prize_type: definition.type, winning_number: winningNumber, prize_amount: amount, sequence_number: index + 1 });
    });
  }
  if (prizes.length !== 173) throw new Error("RANLOTTO full result must contain 173 prize entries");

  const provenanceEnvelope = requiredRecord(provenancePayload, "provenance response");
  const provenanceData = requiredRecord(provenanceEnvelope.data, "provenance data");
  if (requiredString(provenanceData.date, "provenance date") !== drawDate) throw new Error("RANLOTTO result and provenance dates differ");
  const provenance = requiredRecord(provenanceData.provenance, "provenance");

  return {
    draw_date: drawDate,
    record_id: requiredString(data.recordId, "record id"),
    verification_status: providerStatus(provenance.verification_status),
    result_scope: "full",
    prizes,
    raw_payload: { compatibility, provenance: provenancePayload },
  };
}

function normalizeRanlottoSubset(value: unknown): NormalizedDraw {
  const draw = requiredRecord(value, "year draw");
  const drawDate = requiredString(draw.date, "draw date");
  const firstPrize = requiredString(draw.first_prize, "first prize");
  const lastTwo = requiredString(draw.last_two, "last two");
  const frontThree = Array.isArray(draw.front_three) ? draw.front_three.map((number) => requiredString(number, "front three")) : [];
  const lastThree = Array.isArray(draw.last_three) ? draw.last_three.map((number) => requiredString(number, "last three")) : [];
  if (!isIsoDate(drawDate) || !/^\d{6}$/.test(firstPrize) || !/^\d{2}$/.test(lastTwo)) throw new Error("RANLOTTO year draw has invalid core prizes");
  if (frontThree.length + lastThree.length !== 4 || [...frontThree, ...lastThree].some((number) => !/^\d{3}$/.test(number))) {
    throw new Error("RANLOTTO year draw has incomplete three-digit prizes");
  }
  const prizes: NormalizedPrize[] = [
    { prize_type: "first", winning_number: firstPrize, prize_amount: 0, sequence_number: 1 },
    ...frontThree.map((winning_number, index) => ({ prize_type: "front_three" as const, winning_number, prize_amount: 0, sequence_number: index + 1 })),
    ...lastThree.map((winning_number, index) => ({ prize_type: "last_three" as const, winning_number, prize_amount: 0, sequence_number: index + 1 })),
    { prize_type: "last_two", winning_number: lastTwo, prize_amount: 0, sequence_number: 1 },
  ];
  return {
    draw_date: drawDate,
    record_id: typeof draw.canonical_draw_id === "string" ? draw.canonical_draw_id : `L6:${drawDate}`,
    verification_status: "ranlotto_published",
    result_scope: "analysis_subset",
    prizes,
    raw_payload: draw,
  };
}

async function fetchFullFromRanlotto(date: string | "latest") {
  const [compatibility, provenance] = await Promise.all([
    fetchRanlotto(date === "latest" ? "/lottery/latest" : `/lottery/draws/${date}`),
    fetchRanlotto(date === "latest" ? "/lottery/result/latest" : `/lottery/result/${date}`),
  ]);
  const normalized = normalizeRanlottoFull(compatibility, provenance);
  if (date !== "latest" && normalized.draw_date !== date) throw new Error(`RANLOTTO returned ${normalized.draw_date} for requested draw ${date}`);
  return normalized;
}

async function fetchYearFromRanlotto(year: number) {
  const payload = await fetchRanlotto(`/lottery/results?year=${year}`);
  const envelope = requiredRecord(payload, "year response");
  if (envelope.success !== true) throw new Error(`RANLOTTO year ${year} was not successful`);
  const data = requiredRecord(envelope.data, "year data");
  if (!Array.isArray(data.draws)) throw new Error(`RANLOTTO year ${year} has no draws`);
  return data.draws.map(normalizeRanlottoSubset);
}

async function importRanlottoDraw(admin: ReturnType<typeof createClient>, normalized: NormalizedDraw, actor: string | null) {
  const digest = await checksum(normalized.raw_payload);
  const result = await admin.rpc("ingest_ranlotto_lottery_draw", {
    p_draw_date: normalized.draw_date,
    p_source_checksum: digest,
    p_raw_payload: normalized.raw_payload,
    p_prizes: normalized.prizes,
    p_result_scope: normalized.result_scope,
    p_verification_status: normalized.verification_status,
    p_source_record_id: normalized.record_id,
    p_actor: actor,
  });
  if (result.error) throw result.error;
  return { draw_date: normalized.draw_date, draw_id: result.data as string, checksum: digest, verification_status: normalized.verification_status, result_scope: normalized.result_scope };
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

  if (input.mode === "fetch_years") {
    const currentYear = new Date().getUTCFullYear();
    const years = Array.isArray(input.years) ? [...new Set(input.years.map(Number))] : [];
    if (!years.length || years.length > 4 || years.some((year) => !Number.isInteger(year) || year < 1995 || year > currentYear)) {
      return json({ ok: false, error: "INVALID_YEARS", message: "ส่งปี ค.ศ. 1995 ถึงปีปัจจุบันได้ครั้งละไม่เกิน 4 ปี" }, 422);
    }
    const imported: Awaited<ReturnType<typeof importRanlottoDraw>>[] = [];
    const failures: { draw_date: string; message: string }[] = [];
    try {
      const yearlyDraws = (await Promise.all(years.map(fetchYearFromRanlotto))).flat();
      for (let index = 0; index < yearlyDraws.length; index += 12) {
        const batch = await Promise.all(yearlyDraws.slice(index, index + 12).map(async (draw) => {
          try {
            return { ok: true as const, imported: await importRanlottoDraw(admin, draw, auth.user.id) };
          } catch (error) {
            return { ok: false as const, draw_date: draw.draw_date, message: error instanceof Error ? error.message : "Unable to import draw" };
          }
        }));
        batch.forEach((result) => {
          if (result.ok) imported.push(result.imported);
          else failures.push({ draw_date: result.draw_date, message: result.message });
        });
      }
    } catch (error) {
      return json({ ok: false, error: "RANLOTTO_PROVIDER_UNAVAILABLE", message: error instanceof Error ? error.message : "Unable to fetch yearly results" }, 502);
    }
    return json({ ok: failures.length === 0, imported, failures, source: "ranlotto", result_scope: "analysis_subset" }, failures.length ? 207 : 200);
  }

  if (input.mode === "fetch_history") {
    const dates = Array.isArray(input.dates) ? [...new Set(input.dates.map(String))] : [];
    if (!dates.length || dates.length > 12 || dates.some((date) => !isIsoDate(date))) return json({ ok: false, error: "INVALID_HISTORY_DATES" }, 422);
    const imported: Awaited<ReturnType<typeof importRanlottoDraw>>[] = [];
    const failures: { draw_date: string; message: string }[] = [];
    for (let index = 0; index < dates.length; index += 4) {
      const batch = await Promise.all(dates.slice(index, index + 4).map(async (date) => {
        try {
          const draw = await fetchFullFromRanlotto(date);
          return { ok: true as const, imported: await importRanlottoDraw(admin, draw, auth.user.id) };
        } catch (error) {
          return { ok: false as const, draw_date: date, message: error instanceof Error ? error.message : "Unable to import draw" };
        }
      }));
      batch.forEach((result) => {
        if (result.ok) imported.push(result.imported);
        else failures.push({ draw_date: result.draw_date, message: result.message });
      });
    }
    return json({ ok: failures.length === 0, imported, failures, source: "ranlotto", result_scope: "full" }, failures.length ? 207 : 200);
  }

  if (input.mode === "fetch_latest") {
    try {
      const normalized = await fetchFullFromRanlotto("latest");
      const imported = await importRanlottoDraw(admin, normalized, auth.user.id);
      return json({ ok: true, ...imported, source: "ranlotto" });
    } catch (error) {
      return json({ ok: false, error: "RANLOTTO_PROVIDER_UNAVAILABLE", message: error instanceof Error ? error.message : "Unable to fetch latest result" }, 502);
    }
  }

  const rawPayload: unknown = input;
  const prizes = Array.isArray(input.prizes) ? input.prizes as NormalizedPrize[] : [];
  const normalized = { draw_date: String(input.draw_date ?? ""), source_url: String(input.source_url ?? OFFICIAL_SOURCE_URL), prizes };

  if (!isIsoDate(normalized.draw_date) || normalized.prizes.length !== 173) return json({ ok: false, error: "INVALID_OFFICIAL_PAYLOAD" }, 422);
  const digest = await checksum(rawPayload);
  const result = await admin.rpc("ingest_official_lottery_draw", { p_draw_date: normalized.draw_date, p_source_url: normalized.source_url, p_source_checksum: digest, p_raw_payload: rawPayload, p_prizes: normalized.prizes, p_actor: auth.user.id });
  return result.error ? json({ ok: false, error: "IMPORT_FAILED", message: result.error.message }, 422) : json({ ok: true, draw_id: result.data, checksum: digest, source: "admin_verified_glo_payload" });
});
