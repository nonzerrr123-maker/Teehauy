import type { LotteryDraw } from "./lottery-provider";
import { valueForSeries, type LotterySeries } from "./lottery-statistics";

export type DependencyDiagnostic = {
  series: LotterySeries;
  position: number;
  mutualInformation: number;
  pValue: number;
  adjustedPValue: number;
  transitions: number;
};

export type BenchmarkResult = {
  model: "uniform" | "frequency" | "decayed_frequency" | "adaptive_decay" | "current" | "digit_markov";
  label: string;
  hits: number | null;
  predictions: number;
  hitRate: number;
  expected: boolean;
  confidenceLow: number | null;
  confidenceHigh: number | null;
};

export type PairedModelComparison = {
  challenger: "adaptive_decay";
  baseline: "current";
  differencePoints: number;
  confidenceLow: number;
  confidenceHigh: number;
  pValue: number;
  significant: boolean;
  seriesImproved: number;
};

export type HalfLifeSelection = {
  series: LotterySeries;
  halfLife: number;
  hits: number;
  predictions: number;
};

export type MarkovEvaluation = {
  diagnostics: DependencyDiagnostic[];
  benchmark: BenchmarkResult[];
  markovEligible: boolean;
  adaptiveDecayEligible: boolean;
  adaptiveDecayComparison: PairedModelComparison | null;
  halfLifeSelections: HalfLifeSelection[];
  conclusion: string;
  decayConclusion: string;
  validationDraws: number;
};

const SERIES: LotterySeries[] = ["top", "bottom", "threeDigit"];
const MODEL_LABELS: Record<BenchmarkResult["model"], string> = {
  uniform: "สุ่มเท่ากัน",
  frequency: "ความถี่สะสม",
  decayed_frequency: "ถ่วงน้ำหนัก 24 งวด",
  adaptive_decay: "ถ่วงน้ำหนักแบบเลือกช่วง",
  current: "โมเดล Teehauy ปัจจุบัน",
  digit_markov: "Markov รายหลัก",
};

// Keep the current experimental default first so tied validation scores choose the less surprising setting.
const HALF_LIFE_OPTIONS = [24, 48, 12, 96, 6] as const;

function sequencesForDraws(draws: LotteryDraw[]) {
  const ordered = [...draws].sort((a, b) => a.drawDate.localeCompare(b.drawDate));
  return SERIES.map((series) => ({ series, values: ordered.flatMap((draw) => {
    const value = valueForSeries(draw, series);
    return value ? [value] : [];
  }) }));
}

function mutualInformation(previous: number[], next: number[]) {
  if (previous.length === 0 || previous.length !== next.length) return 0;
  const joint = Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => 0));
  const previousCounts = Array.from({ length: 10 }, () => 0);
  const nextCounts = Array.from({ length: 10 }, () => 0);
  previous.forEach((value, index) => {
    joint[value][next[index]] += 1;
    previousCounts[value] += 1;
    nextCounts[next[index]] += 1;
  });
  const total = previous.length;
  let information = 0;
  for (let from = 0; from < 10; from += 1) {
    for (let to = 0; to < 10; to += 1) {
      const count = joint[from][to];
      if (count === 0) continue;
      const jointProbability = count / total;
      information += jointProbability * Math.log2(jointProbability / ((previousCounts[from] / total) * (nextCounts[to] / total)));
    }
  }
  return information;
}

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function permutationPValue(previous: number[], next: number[], observed: number, seed: number, permutations = 199) {
  const random = seededRandom(seed);
  let atLeastObserved = 0;
  for (let run = 0; run < permutations; run += 1) {
    const shuffled = [...next];
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    if (mutualInformation(previous, shuffled) >= observed) atLeastObserved += 1;
  }
  return (atLeastObserved + 1) / (permutations + 1);
}

export function buildDependencyDiagnostics(draws: LotteryDraw[]): DependencyDiagnostic[] {
  const raw = sequencesForDraws(draws).flatMap(({ series, values }, seriesIndex) => {
    const digits = series === "threeDigit" ? 3 : 2;
    return Array.from({ length: digits }, (_, position) => {
      const stream = values.map((value) => Number(value[position]));
      const previous = stream.slice(0, -1);
      const next = stream.slice(1);
      const information = mutualInformation(previous, next);
      return {
        series,
        position,
        mutualInformation: Number(information.toFixed(5)),
        pValue: permutationPValue(previous, next, information, 1729 + seriesIndex * 101 + position * 17),
        adjustedPValue: 1,
        transitions: previous.length,
      };
    });
  });

  const ordered = raw.map((item, index) => ({ item, index })).sort((a, b) => a.item.pValue - b.item.pValue);
  let nextAdjusted = 1;
  for (let rank = ordered.length; rank >= 1; rank -= 1) {
    const entry = ordered[rank - 1];
    nextAdjusted = Math.min(nextAdjusted, (entry.item.pValue * ordered.length) / rank);
    raw[entry.index].adjustedPValue = Number(Math.min(1, nextAdjusted).toFixed(4));
    raw[entry.index].pValue = Number(entry.item.pValue.toFixed(4));
  }
  return raw;
}

function candidates(digits: number) {
  return Array.from({ length: 10 ** digits }, (_, value) => String(value).padStart(digits, "0"));
}

function topValues(candidateValues: string[], score: (value: string) => number, limit = 6) {
  const best: { value: string; score: number }[] = [];
  candidateValues.forEach((value) => {
    const item = { value, score: score(value) };
    const insertion = best.findIndex((current) => item.score > current.score || (item.score === current.score && item.value < current.value));
    if (insertion === -1) {
      if (best.length < limit) best.push(item);
    } else best.splice(insertion, 0, item);
    if (best.length > limit) best.pop();
  });
  return new Set(best.map((item) => item.value));
}

function exactCounts(training: string[]) {
  const counts = new Map<string, number>();
  training.forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1));
  return counts;
}

function rankFrequency(training: string[], candidateValues: string[]) {
  const counts = exactCounts(training);
  return topValues(candidateValues, (value) => counts.get(value) ?? 0);
}

function rankDecayedFrequency(training: string[], candidateValues: string[], halfLife = 24) {
  const scores = new Map<string, number>();
  const newestIndex = training.length - 1;
  training.forEach((value, index) => {
    const weight = 0.5 ** ((newestIndex - index) / halfLife);
    scores.set(value, (scores.get(value) ?? 0) + weight);
  });
  return topValues(candidateValues, (value) => scores.get(value) ?? 0);
}

function rankDigitMarkov(training: string[], candidateValues: string[]) {
  const digits = training[0]?.length ?? 2;
  const transitionCounts = Array.from({ length: digits }, () => Array.from({ length: 10 }, () => Array.from({ length: 10 }, () => 0)));
  const rowTotals = Array.from({ length: digits }, () => Array.from({ length: 10 }, () => 0));
  for (let index = 1; index < training.length; index += 1) {
    for (let position = 0; position < digits; position += 1) {
      const from = Number(training[index - 1][position]);
      const to = Number(training[index][position]);
      transitionCounts[position][from][to] += 1;
      rowTotals[position][from] += 1;
    }
  }
  const previous = training.at(-1) ?? "0".repeat(digits);
  const alpha = 0.5;
  return topValues(candidateValues, (value) => value.split("").reduce((probability, digit, position) => {
    const from = Number(previous[position]);
    const to = Number(digit);
    return probability * ((transitionCounts[position][from][to] + alpha) / (rowTotals[position][from] + alpha * 10));
  }, 1));
}

type SequenceOutcome = {
  key: string;
  drawIndex: number;
  series: LotterySeries;
  hits: { frequency: boolean; decayed_frequency: boolean; adaptive_decay: boolean; digit_markov: boolean };
};

function bestHalfLife(hitHistory: Map<number, boolean[]>, windowSize: number) {
  return HALF_LIFE_OPTIONS.reduce((best, halfLife) => {
    const hits = (hitHistory.get(halfLife) ?? []).slice(-windowSize).filter(Boolean).length;
    return hits > best.hits ? { halfLife, hits } : best;
  }, { halfLife: HALF_LIFE_OPTIONS[0] as number, hits: -1 });
}

function evaluateSequence(series: LotterySeries, values: string[], minimumTraining: number) {
  if (values.length <= minimumTraining) return null;
  const candidateValues = candidates(values[0].length);
  const innerMinimum = Math.max(12, Math.floor(minimumTraining / 2));
  const halfLifeHistory = new Map<number, boolean[]>(HALF_LIFE_OPTIONS.map((halfLife) => [halfLife, []]));
  const outcomes: SequenceOutcome[] = [];
  for (let index = innerMinimum; index < values.length; index += 1) {
    const training = values.slice(0, index);
    const target = values[index];
    const halfLifePredictions = new Map<number, Set<string>>(HALF_LIFE_OPTIONS.map((halfLife) => [halfLife, rankDecayedFrequency(training, candidateValues, halfLife)]));
    if (index >= minimumTraining) {
      const adaptiveHalfLife = bestHalfLife(halfLifeHistory, minimumTraining).halfLife;
      outcomes.push({
        key: `${series}:${index}`,
        drawIndex: index,
        series,
        hits: {
          frequency: rankFrequency(training, candidateValues).has(target),
          decayed_frequency: halfLifePredictions.get(24)?.has(target) ?? false,
          adaptive_decay: halfLifePredictions.get(adaptiveHalfLife)?.has(target) ?? false,
          digit_markov: rankDigitMarkov(training, candidateValues).has(target),
        },
      });
    }
    HALF_LIFE_OPTIONS.forEach((halfLife) => halfLifeHistory.get(halfLife)?.push(halfLifePredictions.get(halfLife)?.has(target) ?? false));
  }
  const selected = bestHalfLife(halfLifeHistory, minimumTraining);
  return {
    outcomes,
    candidateCount: candidateValues.length,
    selection: { series, halfLife: selected.halfLife, hits: selected.hits, predictions: Math.min(minimumTraining, halfLifeHistory.get(selected.halfLife)?.length ?? 0) } satisfies HalfLifeSelection,
  };
}

function evaluateCurrentModel(draws: LotteryDraw[], minimumTraining: number) {
  const ordered = [...draws].sort((a, b) => a.drawDate.localeCompare(b.drawDate));
  type ModelState = { counts: Map<string, number>; positions: Map<string, number>[]; lastSeen: Map<string, number>; sampleCount: number };
  const createState = (digits: number): ModelState => ({ counts: new Map(), positions: Array.from({ length: digits }, () => new Map()), lastSeen: new Map(), sampleCount: 0 });
  const twoDigitState = createState(2);
  const threeDigitState = createState(3);
  const addValues = (state: ModelState, values: string[], drawIndex: number) => values.forEach((value) => {
    state.counts.set(value, (state.counts.get(value) ?? 0) + 1);
    state.lastSeen.set(value, drawIndex);
    state.sampleCount += 1;
    value.split("").forEach((digit, position) => state.positions[position].set(digit, (state.positions[position].get(digit) ?? 0) + 1));
  });
  const rank = (state: ModelState, candidateValues: string[], digits: number, latestTrainingIndex: number) => topValues(candidateValues, (value) => {
    const exactFrequency = (state.counts.get(value) ?? 0) / state.sampleCount;
    const positionFrequency = value.split("").reduce((sum, digit, position) => sum + (state.positions[position].get(digit) ?? 0) / state.sampleCount, 0) / digits;
    const seenAt = state.lastSeen.get(value);
    const recency = seenAt === undefined ? 0 : 1 / (1 + latestTrainingIndex - seenAt);
    return exactFrequency * 0.5 + positionFrequency * 0.3 + recency * 0.2;
  });
  ordered.slice(0, minimumTraining).forEach((draw, index) => {
    addValues(twoDigitState, [draw.top, draw.bottom], index);
    addValues(threeDigitState, draw.threeDigit, index);
  });
  const twoDigitCandidates = candidates(2);
  const threeDigitCandidates = candidates(3);
  let hits = 0;
  let predictions = 0;
  const outcomes = new Map<string, boolean>();
  for (let index = minimumTraining; index < ordered.length; index += 1) {
    const twoDigit = rank(twoDigitState, twoDigitCandidates, 2, index - 1);
    const threeDigit = rank(threeDigitState, threeDigitCandidates, 3, index - 1);
    const topHit = twoDigit.has(ordered[index].top);
    const bottomHit = twoDigit.has(ordered[index].bottom);
    const threeDigitHit = threeDigit.has(ordered[index].threeDigit[0]);
    outcomes.set(`top:${index}`, topHit);
    outcomes.set(`bottom:${index}`, bottomHit);
    outcomes.set(`threeDigit:${index}`, threeDigitHit);
    hits += Number(topHit) + Number(bottomHit) + Number(threeDigitHit);
    predictions += 3;
    addValues(twoDigitState, [ordered[index].top, ordered[index].bottom], index);
    addValues(threeDigitState, ordered[index].threeDigit, index);
  }
  return { hits, predictions, outcomes };
}

function percentile(sorted: number[], probability: number) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.max(0, Math.floor(probability * (sorted.length - 1))))];
}

function clusteredHitInterval(outcomes: SequenceOutcome[], isHit: (outcome: SequenceOutcome) => boolean, seed: number) {
  if (outcomes.length === 0) return { low: 0, high: 0 };
  const byDraw = new Map<number, { hits: number; samples: number }>();
  outcomes.forEach((outcome) => {
    const cluster = byDraw.get(outcome.drawIndex) ?? { hits: 0, samples: 0 };
    cluster.hits += Number(isHit(outcome));
    cluster.samples += 1;
    byDraw.set(outcome.drawIndex, cluster);
  });
  const clusters = [...byDraw.values()];
  const random = seededRandom(seed);
  const bootstrap: number[] = [];
  for (let run = 0; run < 1999; run += 1) {
    let hits = 0;
    let samples = 0;
    for (let index = 0; index < clusters.length; index += 1) {
      const sampled = clusters[Math.floor(random() * clusters.length)];
      hits += sampled.hits;
      samples += sampled.samples;
    }
    bootstrap.push((hits / samples) * 100);
  }
  bootstrap.sort((a, b) => a - b);
  return { low: Number(percentile(bootstrap, 0.025).toFixed(2)), high: Number(percentile(bootstrap, 0.975).toFixed(2)) };
}

function compareAdaptiveDecay(outcomes: SequenceOutcome[], currentOutcomes: Map<string, boolean>): PairedModelComparison | null {
  if (outcomes.length === 0) return null;
  const byDraw = new Map<number, { difference: number; samples: number }>();
  const bySeries = new Map<LotterySeries, { challenger: number; baseline: number; samples: number }>();
  outcomes.forEach((outcome) => {
    const challenger = Number(outcome.hits.adaptive_decay);
    const baseline = Number(currentOutcomes.get(outcome.key) ?? false);
    const draw = byDraw.get(outcome.drawIndex) ?? { difference: 0, samples: 0 };
    draw.difference += challenger - baseline;
    draw.samples += 1;
    byDraw.set(outcome.drawIndex, draw);
    const series = bySeries.get(outcome.series) ?? { challenger: 0, baseline: 0, samples: 0 };
    series.challenger += challenger;
    series.baseline += baseline;
    series.samples += 1;
    bySeries.set(outcome.series, series);
  });
  const clusters = [...byDraw.values()];
  const totalDifference = clusters.reduce((sum, cluster) => sum + cluster.difference, 0);
  const totalSamples = clusters.reduce((sum, cluster) => sum + cluster.samples, 0);
  const differencePoints = (totalDifference / totalSamples) * 100;
  const random = seededRandom(8675309);
  const bootstrap: number[] = [];
  for (let run = 0; run < 1999; run += 1) {
    let difference = 0;
    let samples = 0;
    for (let index = 0; index < clusters.length; index += 1) {
      const sampled = clusters[Math.floor(random() * clusters.length)];
      difference += sampled.difference;
      samples += sampled.samples;
    }
    bootstrap.push((difference / samples) * 100);
  }
  bootstrap.sort((a, b) => a - b);
  let atLeastObserved = 0;
  const observedMagnitude = Math.abs(totalDifference);
  for (let run = 0; run < 4999; run += 1) {
    const permuted = clusters.reduce((sum, cluster) => sum + (random() < 0.5 ? -cluster.difference : cluster.difference), 0);
    if (Math.abs(permuted) >= observedMagnitude) atLeastObserved += 1;
  }
  const pValue = (atLeastObserved + 1) / 5000;
  const confidenceLow = percentile(bootstrap, 0.025);
  const confidenceHigh = percentile(bootstrap, 0.975);
  const seriesImproved = [...bySeries.values()].filter((series) => series.challenger / series.samples > series.baseline / series.samples).length;
  return {
    challenger: "adaptive_decay",
    baseline: "current",
    differencePoints: Number(differencePoints.toFixed(2)),
    confidenceLow: Number(confidenceLow.toFixed(2)),
    confidenceHigh: Number(confidenceHigh.toFixed(2)),
    pValue: Number(pValue.toFixed(4)),
    significant: pValue < 0.05 && confidenceLow > 0,
    seriesImproved,
  };
}

export function buildMarkovEvaluation(draws: LotteryDraw[], minimumTraining = 120): MarkovEvaluation {
  const diagnostics = buildDependencyDiagnostics(draws);
  const evaluations = sequencesForDraws(draws).flatMap(({ series, values }) => {
    const evaluation = evaluateSequence(series, values, minimumTraining);
    return evaluation ? [evaluation] : [];
  });
  const outcomes = evaluations.flatMap((item) => item.outcomes);
  const predictions = outcomes.length;
  const currentEvaluation = evaluateCurrentModel(draws, minimumTraining);
  const models: Exclude<BenchmarkResult["model"], "uniform">[] = ["frequency", "decayed_frequency", "adaptive_decay", "current", "digit_markov"];
  const benchmark: BenchmarkResult[] = models.map((model, modelIndex) => {
    const hits = model === "current" ? currentEvaluation.hits : outcomes.filter((outcome) => outcome.hits[model]).length;
    const confidence = clusteredHitInterval(outcomes, (outcome) => model === "current" ? (currentEvaluation.outcomes.get(outcome.key) ?? false) : outcome.hits[model], 41041 + modelIndex * 997);
    return { model, label: MODEL_LABELS[model], hits, predictions, hitRate: predictions ? Number(((hits / predictions) * 100).toFixed(2)) : 0, expected: false, confidenceLow: confidence.low, confidenceHigh: confidence.high };
  });
  const expectedHits = evaluations.reduce((sum, item) => sum + item.outcomes.length * (6 / item.candidateCount), 0);
  benchmark.unshift({ model: "uniform", label: MODEL_LABELS.uniform, hits: null, predictions, hitRate: predictions ? Number(((expectedHits / predictions) * 100).toFixed(2)) : 0, expected: true, confidenceLow: null, confidenceHigh: null });

  const markov = benchmark.find((item) => item.model === "digit_markov");
  const bestBaseline = Math.max(...benchmark.filter((item) => !["uniform", "digit_markov"].includes(item.model)).map((item) => item.hitRate), 0);
  const hasDependencyEvidence = diagnostics.some((item) => item.adjustedPValue < 0.05);
  const requiredImprovement = Math.max(0.5, bestBaseline * 0.1);
  const markovEligible = Boolean(markov && predictions > 0 && hasDependencyEvidence && markov.hitRate >= bestBaseline + requiredImprovement);
  const adaptiveDecayComparison = compareAdaptiveDecay(outcomes, currentEvaluation.outcomes);
  const adaptiveDecayEligible = Boolean(adaptiveDecayComparison?.significant && adaptiveDecayComparison.seriesImproved >= 2);
  const halfLifeSelections = evaluations.map((item) => item.selection);
  const conclusion = predictions === 0
    ? "ข้อมูลยังไม่พอสำหรับทดสอบแบบเดินหน้า"
    : markovEligible
      ? "Markov รายหลักผ่านทั้งการตรวจความสัมพันธ์และผลทดสอบย้อนหลัง ควรยืนยันซ้ำก่อนเปิดใช้จริง"
      : "ยังไม่มีหลักฐานนอกกลุ่มตัวอย่างเพียงพอให้แทนโมเดลปัจจุบัน จึงคง Markov ไว้เป็นการทดลอง";
  const decayConclusion = !adaptiveDecayComparison
    ? "ข้อมูลยังไม่พอสำหรับเปรียบเทียบโมเดลแบบจับคู่"
    : adaptiveDecayEligible
      ? "โมเดลถ่วงน้ำหนักผ่าน paired test และดีขึ้นอย่างสม่ำเสมอ ควรตรวจ holdout เพิ่มก่อนสลับ production"
      : "ผลของโมเดลถ่วงน้ำหนักยังแยกจากความผันผวนไม่ได้ จึงยังไม่เปลี่ยนโมเดล production";
  return { diagnostics, benchmark, markovEligible, adaptiveDecayEligible, adaptiveDecayComparison, halfLifeSelections, conclusion, decayConclusion, validationDraws: predictions };
}
