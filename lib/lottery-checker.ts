export type LotteryPrizeType =
  | "first"
  | "adjacent_first"
  | "second"
  | "third"
  | "fourth"
  | "fifth"
  | "front_three"
  | "last_three"
  | "last_two";

export type LotteryWinning = {
  prizeType: LotteryPrizeType;
  name: string;
  matchedNumber: string;
  amount: number;
};

export type LotteryCheckResult = {
  number: string;
  drawDate: string;
  isWinner: boolean;
  winnings: LotteryWinning[];
  totalPrize: number;
  source: "ranlotto" | "local_verified_fallback";
  sourceUrl: string;
};

export type LotteryPrizeRow = {
  prize_type: string;
  winning_number: string;
  prize_amount: number | string;
};

type UnknownRecord = Record<string, unknown>;

const prizeNames: Record<LotteryPrizeType, string> = {
  first: "รางวัลที่ 1",
  adjacent_first: "รางวัลข้างเคียงรางวัลที่ 1",
  second: "รางวัลที่ 2",
  third: "รางวัลที่ 3",
  fourth: "รางวัลที่ 4",
  fifth: "รางวัลที่ 5",
  front_three: "รางวัลเลขหน้า 3 ตัว",
  last_three: "รางวัลเลขท้าย 3 ตัว",
  last_two: "รางวัลเลขท้าย 2 ตัว",
};

const ranlottoCategories: Record<string, LotteryPrizeType> = {
  first_prize: "first",
  first_prize_neighbors: "adjacent_first",
  second_prize: "second",
  third_prize: "third",
  fourth_prize: "fourth",
  fifth_prize: "fifth",
  first_three_digits: "front_three",
  last_three_digits: "last_three",
  last_two_digits: "last_two",
};

const sixDigitPrizeTypes = new Set<LotteryPrizeType>(["first", "adjacent_first", "second", "third", "fourth", "fifth"]);
const validPrizeTypes = new Set<LotteryPrizeType>(Object.keys(prizeNames) as LotteryPrizeType[]);

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAmount(value: unknown): number {
  const amount = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(amount) || amount < 0) throw new Error("INVALID_PRIZE_AMOUNT");
  return amount;
}

function result(number: string, drawDate: string, winnings: LotteryWinning[], source: LotteryCheckResult["source"]): LotteryCheckResult {
  return {
    number,
    drawDate,
    isWinner: winnings.length > 0,
    winnings,
    totalPrize: winnings.reduce((total, winning) => total + winning.amount, 0),
    source,
    sourceUrl: `https://www.ranlotto.com/lottery/${drawDate}`,
  };
}

export function parseRanlottoCheckResponse(payload: unknown, expectedNumber: string, requestedDate: string): LotteryCheckResult {
  if (!/^\d{6}$/.test(expectedNumber) || !isRecord(payload) || payload.status !== "success" || !isRecord(payload.data)) {
    throw new Error("INVALID_RANLOTTO_RESPONSE");
  }
  const data = payload.data;
  if (data.number !== expectedNumber || typeof data.drawDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(data.drawDate)) {
    throw new Error("INVALID_RANLOTTO_RESPONSE");
  }
  if (requestedDate !== "latest" && data.drawDate !== requestedDate) throw new Error("RANLOTTO_DATE_MISMATCH");
  if (!Array.isArray(data.winnings)) throw new Error("INVALID_RANLOTTO_RESPONSE");

  const winnings = data.winnings.map((value): LotteryWinning => {
    if (!isRecord(value) || typeof value.category !== "string" || typeof value.matchedNumber !== "string") {
      throw new Error("INVALID_RANLOTTO_WINNING");
    }
    const prizeType = ranlottoCategories[value.category];
    if (!prizeType) throw new Error("UNKNOWN_RANLOTTO_PRIZE");
    return {
      prizeType,
      name: prizeNames[prizeType],
      matchedNumber: value.matchedNumber,
      amount: normalizeAmount(value.amount ?? value.prize),
    };
  });
  return result(expectedNumber, data.drawDate, winnings, "ranlotto");
}

export function matchLocalLotteryPrizes(number: string, drawDate: string, prizes: LotteryPrizeRow[]): LotteryCheckResult {
  if (!/^\d{6}$/.test(number) || !/^\d{4}-\d{2}-\d{2}$/.test(drawDate)) throw new Error("INVALID_LOTTERY_INPUT");
  const winnings = prizes.flatMap((prize): LotteryWinning[] => {
    const prizeType = prize.prize_type as LotteryPrizeType;
    if (!validPrizeTypes.has(prizeType)) return [];
    const matches = sixDigitPrizeTypes.has(prizeType)
      ? number === prize.winning_number
      : prizeType === "front_three"
        ? number.startsWith(prize.winning_number)
        : prizeType === "last_three"
          ? number.endsWith(prize.winning_number)
          : number.endsWith(prize.winning_number);
    return matches ? [{ prizeType, name: prizeNames[prizeType], matchedNumber: prize.winning_number, amount: normalizeAmount(prize.prize_amount) }] : [];
  });
  return result(number, drawDate, winnings, "local_verified_fallback");
}
