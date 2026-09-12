import { describe, expect, it } from "vitest";

import type { LotteryDraw } from "../lib/lottery-provider";
import { buildDependencyDiagnostics, buildMarkovEvaluation } from "../lib/lottery-markov";
import { buildExactNumberStats, buildPatternSummary, buildPositionFrequency, buildRollingTrend, filterDrawsByRange } from "../lib/lottery-statistics";

function draw(drawDate: string, first: string, bottom: string): LotteryDraw {
  return { date: drawDate, drawDate, first, top: first.slice(-2), bottom, threeDigit: [first.slice(-3)] };
}

describe("lottery statistics", () => {
  const draws = [
    draw("2026-09-01", "123407", "18"),
    draw("2025-09-01", "999907", "19"),
    draw("2021-09-01", "555542", "18"),
    draw("2016-08-16", "111142", "77"),
  ];

  it("uses the latest draw date as the exact range anchor", () => {
    expect(filterDrawsByRange(draws, "1y").map((item) => item.drawDate)).toEqual(["2026-09-01", "2025-09-01"]);
    expect(filterDrawsByRange(draws, "5y")).toHaveLength(3);
    expect(filterDrawsByRange(draws, "10y")).toHaveLength(3);
    expect(filterDrawsByRange(draws, "all")).toBe(draws);
  });

  it("keeps prize series and digit positions separate", () => {
    const top = buildPositionFrequency(draws, "top");
    const bottom = buildPositionFrequency(draws, "bottom");
    const threeDigit = buildPositionFrequency(draws, "threeDigit");
    expect(top.find((item) => item.digit === "0")?.tens).toBe(2);
    expect(bottom.find((item) => item.digit === "1")?.tens).toBe(3);
    expect(threeDigit.find((item) => item.digit === "4")?.hundreds).toBe(1);
  });

  it("summarizes exact numbers, patterns, and rolling hits", () => {
    const exact = buildExactNumberStats(draws, "top");
    expect(exact.hot[0]).toMatchObject({ value: "07", count: 2, gap: 0 });
    expect(exact.overdue[0].value).toBe("42");
    expect(buildPatternSummary(draws, "top")).toMatchObject({ sampleSize: 4, repeatedDigitPercent: 0 });
    expect(buildRollingTrend(draws, "top", "07", 2).map((item) => item.count)).toEqual([0, 1, 2]);
  });
});

describe("Markov diagnostics", () => {
  const draws = Array.from({ length: 40 }, (_, index) => {
    const digit = index % 2;
    const date = `2026-${String(Math.floor(index / 28) + 1).padStart(2, "0")}-${String((index % 28) + 1).padStart(2, "0")}`;
    return draw(date, `123${digit}${digit}${digit}`, `${digit}${digit}`);
  });

  it("never interleaves top and bottom transitions", () => {
    const diagnostics = buildDependencyDiagnostics(draws);
    expect(diagnostics).toHaveLength(7);
    expect(diagnostics.every((item) => item.transitions === draws.length - 1)).toBe(true);
    expect(diagnostics).toEqual(buildDependencyDiagnostics(draws));
  });

  it("runs a deterministic walk-forward comparison", () => {
    const evaluation = buildMarkovEvaluation(draws, 20);
    expect(evaluation.validationDraws).toBe(60);
    expect(evaluation.benchmark.map((item) => item.model)).toEqual(["uniform", "frequency", "decayed_frequency", "current", "digit_markov"]);
    expect(evaluation.benchmark.find((item) => item.model === "digit_markov")?.hits).toBeTypeOf("number");
  });

  it("handles the production-sized archive", () => {
    let state = 123456789;
    const archive = Array.from({ length: 741 }, (_, index) => {
      state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
      const first = String(state % 1_000_000).padStart(6, "0");
      const date = new Date(Date.UTC(1995, 1, 1 + index * 16)).toISOString().slice(0, 10);
      return draw(date, first, String((state >>> 8) % 100).padStart(2, "0"));
    });
    const evaluation = buildMarkovEvaluation(archive);
    expect(evaluation.validationDraws).toBe((741 - 120) * 3);
    expect(evaluation.diagnostics.every((item) => item.transitions === 740)).toBe(true);
  });
});
