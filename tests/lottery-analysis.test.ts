import { describe, expect, it } from "vitest";
import { analyzeThreeDigitNumbers, analyzeTwoDigitNumbers } from "../lib/lottery-analysis";
describe("analyzeTwoDigitNumbers", () => {
  it("is deterministic and ranks repeats", () => { const draws = [{ date: "2026-08-16", top: "42", bottom: "19" }, { date: "2026-08-01", top: "42", bottom: "10" }, { date: "2026-07-16", top: "42", bottom: "77" }]; const result = analyzeTwoDigitNumbers(draws, 10); expect(result).toEqual(analyzeTwoDigitNumbers(draws, 10)); expect(result[0].value).toBe("42"); });
  it("preserves leading zeroes", () => expect(analyzeTwoDigitNumbers([{ date: "2026-08-01", top: "07", bottom: "07" }], 1)[0].value).toBe("07"));
  it("returns empty without history", () => expect(analyzeTwoDigitNumbers([])).toEqual([]));
  it("ranks three-digit repeats and preserves leading zeroes", () => {
    const draws = [
      { date: "2026-08-16", top: "42", bottom: "19", threeDigit: ["007", "123", "456", "789"] },
      { date: "2026-08-01", top: "40", bottom: "10", threeDigit: ["007", "234", "567", "890"] },
      { date: "2026-07-16", top: "41", bottom: "77", threeDigit: ["007", "345", "678", "901"] },
    ];
    const result = analyzeThreeDigitNumbers(draws, 6);
    expect(result).toHaveLength(6);
    expect(result[0].value).toBe("007");
  });
  it("returns no three-digit ranking when prizes are unavailable", () => expect(analyzeThreeDigitNumbers([{ date: "2026-08-01", top: "07", bottom: "19" }])).toEqual([]));
});
