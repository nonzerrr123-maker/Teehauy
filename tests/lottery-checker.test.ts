import { describe, expect, it } from "vitest";

import { matchLocalLotteryPrizes, parseRanlottoCheckResponse } from "../lib/lottery-checker";

describe("parseRanlottoCheckResponse", () => {
  it("normalizes every winning category and totals overlapping prizes", () => {
    const checked = parseRanlottoCheckResponse({
      status: "success",
      data: {
        number: "417204",
        drawDate: "2026-09-01",
        isWinner: true,
        winnings: [
          { category: "fourth_prize", matchedNumber: "417204", amount: 40000 },
          { category: "last_two_digits", matchedNumber: "04", amount: 2000 },
        ],
      },
    }, "417204", "latest");

    expect(checked.isWinner).toBe(true);
    expect(checked.winnings.map((winning) => winning.prizeType)).toEqual(["fourth", "last_two"]);
    expect(checked.totalPrize).toBe(42000);
  });

  it("preserves a leading-zero ticket and returns a non-winning result", () => {
    const checked = parseRanlottoCheckResponse({ status: "success", data: { number: "003249", drawDate: "2026-09-01", isWinner: false, winnings: [] } }, "003249", "2026-09-01");
    expect(checked.number).toBe("003249");
    expect(checked.isWinner).toBe(false);
    expect(checked.totalPrize).toBe(0);
  });

  it("rejects an unexpected prize category", () => {
    expect(() => parseRanlottoCheckResponse({ status: "success", data: { number: "123456", drawDate: "2026-09-01", winnings: [{ category: "mystery", matchedNumber: "123456", amount: 1 }] } }, "123456", "latest")).toThrow("UNKNOWN_RANLOTTO_PRIZE");
  });
});

describe("matchLocalLotteryPrizes", () => {
  it("matches full-number and suffix prizes in a verified local fallback", () => {
    const checked = matchLocalLotteryPrizes("123404", "2026-09-01", [
      { prize_type: "second", winning_number: "123404", prize_amount: 200000 },
      { prize_type: "last_two", winning_number: "04", prize_amount: 2000 },
      { prize_type: "last_three", winning_number: "404", prize_amount: 4000 },
      { prize_type: "front_three", winning_number: "123", prize_amount: 4000 },
    ]);
    expect(checked.winnings).toHaveLength(4);
    expect(checked.totalPrize).toBe(210000);
    expect(checked.source).toBe("local_verified_fallback");
  });
});
