import { describe, expect, it } from "vitest";

import { interpretDream } from "../lib/dream-engine";

describe("interpretDream", () => {
  it("composes several symbols and their nearby context", () => {
    const result = interpretDream("ฝันเห็นงูสีขาวกัดแม่ในบ้าน แล้วน้ำท่วม");

    expect(result.analysis?.symbols.map((symbol) => symbol.label)).toEqual(expect.arrayContaining(["งู", "แม่", "บ้าน", "น้ำท่วม"]));
    expect(result.analysis?.symbols[0]).toMatchObject({ label: "งู", importance: "หลัก", confidence: "สูง" });
    expect(result.analysis?.contexts).toEqual(expect.arrayContaining(["สีขาว", "กัด"]));
    expect(result.meaning).toContain("ภาพประกอบที่พบ");
  });

  it("uses the longest phrase without double counting an overlapping symbol", () => {
    const result = interpretDream("ฝันเห็นน้ำท่วมบ้าน");
    const labels = result.analysis?.symbols.map((symbol) => symbol.label);

    expect(labels).toContain("น้ำท่วม");
    expect(labels).toContain("บ้าน");
    expect(labels).not.toContain("น้ำ");
  });

  it("treats gold as a color modifier when used in a color phrase", () => {
    const result = interpretDream("ฝันเห็นงูสีทองเลื้อยเข้าบ้าน");
    const labels = result.analysis?.symbols.map((symbol) => symbol.label);

    expect(labels).toContain("งู");
    expect(labels).toContain("บ้าน");
    expect(labels).not.toContain("ทอง");
    expect(result.analysis?.contexts).toContain("สีทอง");
  });

  it("does not turn common embedded words into unrelated symbols", () => {
    const result = interpretDream("ฝันว่าเดินทางไปจังหวัดหนึ่งด้วยรถไฟ มองท้องฟ้าสีน้ำเงินจนน้ำตาไหล");
    const labels = result.analysis?.symbols.map((symbol) => symbol.label);

    expect(labels).toContain("รถไฟ");
    expect(labels).not.toContain("วัด");
    expect(labels).not.toContain("ไฟ");
    expect(labels).not.toContain("น้ำ");
  });

  it("normalizes aliases to one canonical symbol", () => {
    const result = interpretDream("เมื่อคืนเห็นหมากับสุนัขวิ่งเล่น");
    const dogs = result.analysis?.symbols.filter((symbol) => symbol.id === "dog");

    expect(dogs).toHaveLength(1);
    expect(dogs?.[0].matchedText).toContain("หมา");
    expect(dogs?.[0].matchedText).toContain("สุนัข");
  });

  it("returns six ranked two-digit and six ranked three-digit values", () => {
    const result = interpretDream("ฝันเห็นช้างเผือกสามเชือกในทุ่งดอกไม้");
    const twoDigit = result.numbers.filter((number) => number.type === "2dream");
    const threeDigit = result.numbers.filter((number) => number.type === "3top");

    expect(twoDigit).toHaveLength(6);
    expect(threeDigit).toHaveLength(6);
    expect(new Set(twoDigit.map((number) => number.value)).size).toBe(6);
    expect(new Set(threeDigit.map((number) => number.value)).size).toBe(6);
    expect(twoDigit.every((number) => /^\d{2}$/u.test(number.value) && Boolean(number.source))).toBe(true);
    expect(threeDigit.every((number) => /^\d{3}$/u.test(number.value) && Boolean(number.source))).toBe(true);
  });

  it("is deterministic for the same details", () => {
    const first = interpretDream("ฝันเห็นปลาสองตัวในแม่น้ำ");
    const second = interpretDream("ฝันเห็นปลาสองตัวในแม่น้ำ");

    expect(first.numbers).toEqual(second.numbers);
    expect(first.analysis).toEqual(second.analysis);
  });

  it("asks for detail instead of generating numbers from an unknown-text hash", () => {
    const result = interpretDream("ฝันแปลกมากจำอะไรไม่ได้เลย");

    expect(result.numbers).toEqual([]);
    expect(result.analysis?.needsMoreDetail).toBe(true);
    expect(result.meaning).toContain("ลองเพิ่ม");
  });

  it("makes an ambiguous interpretation explicit", () => {
    const result = interpretDream("ฝันเห็นเสือ");

    expect(result.analysis?.assumption).toContain("เป็นสัตว์");
  });
});
