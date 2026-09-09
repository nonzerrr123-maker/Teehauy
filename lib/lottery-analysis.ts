export type AnalysisDraw = { date: string; top: string; bottom: string };
export type RankedNumber = { value: string; score: number; frequency: number; gap: number };
export function analyzeTwoDigitNumbers(draws: AnalysisDraw[], limit = 10): RankedNumber[] {
  if (!draws.length) return [];
  const pairs = [...draws].sort((a, b) => b.date.localeCompare(a.date)).flatMap((draw) => [draw.top, draw.bottom]);
  const counts = new Map<string, number>(); const lastSeen = new Map<string, number>(); const positions = [new Map<string, number>(), new Map<string, number>()];
  pairs.forEach((value, index) => { counts.set(value, (counts.get(value) ?? 0) + 1); if (!lastSeen.has(value)) lastSeen.set(value, index); value.split("").forEach((digit, position) => positions[position].set(digit, (positions[position].get(digit) ?? 0) + 1)); });
  return Array.from({ length: 100 }, (_, number) => String(number).padStart(2, "0")).map((value) => {
    const frequency = counts.get(value) ?? 0; const gap = lastSeen.get(value) ?? pairs.length; const positionFrequency = value.split("").reduce((sum, digit, position) => sum + (positions[position].get(digit) ?? 0), 0); const recency = lastSeen.has(value) ? 1 / (1 + gap) : 0;
    return { value, score: Number(((frequency / pairs.length) * .5 + (positionFrequency / (pairs.length * 2)) * .3 + recency * .2).toFixed(8)), frequency, gap };
  }).sort((a, b) => b.score - a.score || a.value.localeCompare(b.value)).slice(0, Math.max(1, Math.min(100, limit)));
}
