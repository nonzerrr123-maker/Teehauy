export type LotteryDraw = {
  date: string;
  first: string;
  top: string;
  bottom: string;
};

export type DigitFrequency = {
  digit: string;
  count: number;
};

export type LotteryStats = {
  source: "sample" | "external";
  sourceLabel: string;
  draws: LotteryDraw[];
  digitFrequency: DigitFrequency[];
  hotNumbers: string[];
  coldNumbers: string[];
  updatedAt: string;
};

const sampleDraws: LotteryDraw[] = [
  { date: "01 ส.ค.", first: "593174", top: "74", bottom: "47" },
  { date: "16 ส.ค.", first: "827459", top: "59", bottom: "95" },
  { date: "01 ก.ค.", first: "341862", top: "62", bottom: "26" },
  { date: "16 ก.ค.", first: "905237", top: "37", bottom: "73" },
  { date: "01 มิ.ย.", first: "764823", top: "23", bottom: "32" },
  { date: "16 มิ.ย.", first: "128456", top: "56", bottom: "65" },
];

type ExternalPayload = {
  draws?: unknown;
};

function isDigits(value: unknown, length: number): value is string {
  return typeof value === "string" && new RegExp(`^\\d{${length}}$`).test(value);
}

function normalizeDraw(value: unknown): LotteryDraw | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  if (typeof row.date !== "string" || !isDigits(row.first, 6) || !isDigits(row.bottom, 2)) return null;

  return {
    date: row.date,
    first: row.first,
    top: isDigits(row.top, 2) ? row.top : row.first.slice(-2),
    bottom: row.bottom,
  };
}

function buildDigitFrequency(draws: LotteryDraw[]): DigitFrequency[] {
  const counts = Array.from({ length: 10 }, () => 0);

  for (const draw of draws) {
    for (const digit of `${draw.first}${draw.bottom}`) {
      counts[Number(digit)] += 1;
    }
  }

  return counts.map((count, digit) => ({ digit: String(digit), count }));
}

function rankTwoDigitNumbers(draws: LotteryDraw[]) {
  const counts = new Map<string, number>();

  for (const draw of draws) {
    for (const value of [draw.top, draw.bottom]) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
  }

  const ranked = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  const hotNumbers = ranked.slice(0, 6).map(([value]) => value);
  const coldNumbers = ranked.slice(-6).reverse().map(([value]) => value);

  return { hotNumbers, coldNumbers };
}

function buildStats(draws: LotteryDraw[], source: LotteryStats["source"], sourceLabel: string): LotteryStats {
  const { hotNumbers, coldNumbers } = rankTwoDigitNumbers(draws);
  return {
    source,
    sourceLabel,
    draws,
    digitFrequency: buildDigitFrequency(draws),
    hotNumbers,
    coldNumbers,
    updatedAt: new Date().toISOString(),
  };
}

async function loadExternalDraws(url: string): Promise<LotteryDraw[] | null> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
    signal: AbortSignal.timeout(6_000),
  });

  if (!response.ok) return null;
  const payload = (await response.json()) as ExternalPayload | unknown[];
  const candidates = Array.isArray(payload)
    ? payload
    : payload && typeof payload === "object" && Array.isArray((payload as ExternalPayload).draws)
      ? ((payload as ExternalPayload).draws as unknown[])
      : [];

  const draws = candidates.map(normalizeDraw).filter((item): item is LotteryDraw => Boolean(item));
  return draws.length ? draws.slice(0, 24) : null;
}

export async function getLotteryStats(): Promise<LotteryStats> {
  const externalUrl = process.env.LOTTERY_RESULTS_JSON_URL?.trim();

  if (externalUrl) {
    try {
      const draws = await loadExternalDraws(externalUrl);
      if (draws) return buildStats(draws, "external", "External lottery data provider");
    } catch {
      // Fall through to clearly-labelled sample data.
    }
  }

  return buildStats(sampleDraws, "sample", "ข้อมูลตัวอย่างสำหรับทดสอบ UI");
}
