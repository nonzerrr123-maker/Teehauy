import type { LotteryDraw } from "./lottery-provider";

export type LotterySeries = "top" | "bottom" | "threeDigit";
export type LotteryTimeRange = "1y" | "5y" | "10y" | "all";

export type ExactNumberStat = {
  value: string;
  count: number;
  gap: number;
  lastSeenDate: string;
};

export type PositionFrequency = {
  digit: string;
  hundreds: number;
  tens: number;
  units: number;
};

export type PatternSummary = {
  sampleSize: number;
  evenEndingPercent: number;
  highDigitPercent: number;
  repeatedDigitPercent: number;
  averageDigitSum: number;
};

const RANGE_YEARS: Record<Exclude<LotteryTimeRange, "all">, number> = { "1y": 1, "5y": 5, "10y": 10 };
const DIGITS_ONLY = /^\d+$/;

export function valueForSeries(draw: LotteryDraw, series: LotterySeries): string | null {
  const value = series === "top" ? draw.top : series === "bottom" ? draw.bottom : draw.threeDigit[0];
  const expectedLength = series === "threeDigit" ? 3 : 2;
  return value && value.length === expectedLength && DIGITS_ONLY.test(value) ? value : null;
}

export function filterDrawsByRange(draws: LotteryDraw[], range: LotteryTimeRange): LotteryDraw[] {
  if (range === "all" || draws.length === 0) return draws;
  const latest = draws.reduce((max, draw) => draw.drawDate > max ? draw.drawDate : max, draws[0].drawDate);
  const cutoff = new Date(`${latest}T00:00:00Z`);
  cutoff.setUTCFullYear(cutoff.getUTCFullYear() - RANGE_YEARS[range]);
  const cutoffDate = cutoff.toISOString().slice(0, 10);
  return draws.filter((draw) => draw.drawDate >= cutoffDate);
}

export function buildPositionFrequency(draws: LotteryDraw[], series: LotterySeries): PositionFrequency[] {
  const rows = Array.from({ length: 10 }, (_, digit) => ({ digit: String(digit), hundreds: 0, tens: 0, units: 0 }));
  draws.forEach((draw) => {
    const value = valueForSeries(draw, series);
    if (!value) return;
    if (value.length === 3) rows[Number(value[0])].hundreds += 1;
    rows[Number(value.at(-2))].tens += 1;
    rows[Number(value.at(-1))].units += 1;
  });
  return rows;
}

export function buildExactNumberStats(draws: LotteryDraw[], series: LotterySeries): { hot: ExactNumberStat[]; overdue: ExactNumberStat[] } {
  const ordered = [...draws].sort((a, b) => b.drawDate.localeCompare(a.drawDate));
  const entries = new Map<string, ExactNumberStat>();
  ordered.forEach((draw, gap) => {
    const value = valueForSeries(draw, series);
    if (!value) return;
    const current = entries.get(value);
    if (current) current.count += 1;
    else entries.set(value, { value, count: 1, gap, lastSeenDate: draw.drawDate });
  });
  const stats = [...entries.values()];
  const hot = [...stats].sort((a, b) => b.count - a.count || a.gap - b.gap || a.value.localeCompare(b.value)).slice(0, 6);
  const overdue = [...stats].sort((a, b) => b.gap - a.gap || b.count - a.count || a.value.localeCompare(b.value)).slice(0, 6);
  return { hot, overdue };
}

export function buildPatternSummary(draws: LotteryDraw[], series: LotterySeries): PatternSummary {
  const values = draws.flatMap((draw) => {
    const value = valueForSeries(draw, series);
    return value ? [value] : [];
  });
  if (values.length === 0) return { sampleSize: 0, evenEndingPercent: 0, highDigitPercent: 0, repeatedDigitPercent: 0, averageDigitSum: 0 };
  const digits = values.flatMap((value) => value.split("").map(Number));
  const percent = (count: number, total: number) => Number(((count / total) * 100).toFixed(1));
  return {
    sampleSize: values.length,
    evenEndingPercent: percent(values.filter((value) => Number(value.at(-1)) % 2 === 0).length, values.length),
    highDigitPercent: percent(digits.filter((digit) => digit >= 5).length, digits.length),
    repeatedDigitPercent: percent(values.filter((value) => new Set(value).size < value.length).length, values.length),
    averageDigitSum: Number((digits.reduce((sum, digit) => sum + digit, 0) / values.length).toFixed(1)),
  };
}

export function buildRollingTrend(draws: LotteryDraw[], series: LotterySeries, selectedValue: string, windowSize: number) {
  const ordered = [...draws].sort((a, b) => a.drawDate.localeCompare(b.drawDate));
  const hits: number[] = [];
  let rollingCount = 0;
  return ordered.flatMap((draw, index) => {
    const hit = valueForSeries(draw, series) === selectedValue ? 1 : 0;
    hits.push(hit);
    rollingCount += hit;
    if (index >= windowSize) rollingCount -= hits[index - windowSize];
    if (index < windowSize - 1) return [];
    return [{ date: draw.drawDate, count: rollingCount, rate: Number(((rollingCount / windowSize) * 100).toFixed(1)) }];
  });
}
