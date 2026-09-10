export type AnalysisDraw = { date: string; top: string; bottom: string; threeDigit?: string[] };
export type RankedNumber = { value: string; score: number; frequency: number; gap: number };
const digitsOnly = /^\d+$/;

function rankNumbers(draws: AnalysisDraw[], digits: 2 | 3, valuesForDraw: (draw: AnalysisDraw) => string[], limit: number): RankedNumber[] {
  const orderedDraws = [...draws].sort((a, b) => b.date.localeCompare(a.date));
  const valuesByDraw = orderedDraws.map((draw) => valuesForDraw(draw).filter((value) => value.length === digits && digitsOnly.test(value)));
  const samples = valuesByDraw.flat();
  if (!samples.length) return [];

  const counts = new Map<string, number>();
  const lastSeen = new Map<string, number>();
  const positions = Array.from({ length: digits }, () => new Map<string, number>());
  valuesByDraw.forEach((values, drawIndex) => values.forEach((value) => {
    counts.set(value, (counts.get(value) ?? 0) + 1);
    if (!lastSeen.has(value)) lastSeen.set(value, drawIndex);
    value.split("").forEach((digit, position) => positions[position].set(digit, (positions[position].get(digit) ?? 0) + 1));
  }));

  const candidateCount = 10 ** digits;
  return Array.from({ length: candidateCount }, (_, number) => String(number).padStart(digits, "0")).map((value) => {
    const frequency = counts.get(value) ?? 0;
    const gap = lastSeen.get(value) ?? orderedDraws.length;
    const exactFrequency = frequency / samples.length;
    const positionFrequency = value.split("").reduce((sum, digit, position) => sum + (positions[position].get(digit) ?? 0) / samples.length, 0) / digits;
    const recency = lastSeen.has(value) ? 1 / (1 + gap) : 0;
    const score = exactFrequency * .5 + positionFrequency * .3 + recency * .2;
    return { value, score: Number(score.toFixed(8)), frequency, gap };
  }).sort((a, b) => b.score - a.score || a.value.localeCompare(b.value)).slice(0, Math.max(1, Math.min(candidateCount, limit)));
}

export function analyzeTwoDigitNumbers(draws: AnalysisDraw[], limit = 6): RankedNumber[] {
  return rankNumbers(draws, 2, (draw) => [draw.top, draw.bottom], limit);
}

export function analyzeThreeDigitNumbers(draws: AnalysisDraw[], limit = 6): RankedNumber[] {
  return rankNumbers(draws, 3, (draw) => draw.threeDigit ?? [], limit);
}
