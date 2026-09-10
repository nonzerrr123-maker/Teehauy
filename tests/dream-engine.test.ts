import { describe, expect, it } from "vitest";

import { interpretDream } from "../lib/dream-engine";
import { dreamKnowledge, dreamKnowledgeStats } from "../lib/dream-knowledge";

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

  it("does not match short aliases inside longer Thai words", () => {
    const result = interpretDream("ฝันว่าติดตามตารางงานเดือนสิงหาคม");
    const ids = result.analysis?.symbols.map((symbol) => symbol.id);

    expect(ids).not.toContain("maternal_grandfather");
    expect(ids).not.toContain("eye");
    expect(ids).not.toContain("lion");
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
    expect(result.numbers.every((number) => Boolean(number.knowledgeSource) && Boolean(number.knowledgeSourceUrl) && Boolean(number.reviewStatus))).toBe(true);
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

  it("asks only when tiger is genuinely ambiguous", () => {
    const result = interpretDream("ฝันเห็นเสือ");

    expect(result.numbers).toEqual([]);
    expect(result.analysis?.clarification).toMatchObject({
      termId: "tiger",
      options: [{ id: "animal" }, { id: "person" }],
    });
  });

  it("infers an animal tiger from surrounding context", () => {
    const result = interpretDream("โดนเสือตัวใหญ่กัดในป่า");

    expect(result.analysis?.clarification).toBeUndefined();
    expect(result.analysis?.symbols.map((symbol) => symbol.id)).toContain("tiger");
    expect(result.analysis?.contexts).toEqual(expect.arrayContaining(["ขนาดใหญ่", "กัด", "ในป่า"]));
    expect(result.numbers).toHaveLength(12);
  });

  it("recognizes an explicit person called Suea", () => {
    const result = interpretDream("พี่เสือมาหาแม่");

    expect(result.analysis?.clarification).toBeUndefined();
    expect(result.analysis?.symbols.map((symbol) => symbol.id)).toContain("tiger_person");
    expect(result.analysis?.symbols.map((symbol) => symbol.id)).not.toContain("tiger");
  });

  it("resolves a bare tiger using the user's choice before generating numbers", () => {
    const animal = interpretDream("ฝันเห็นเสือ", { termId: "tiger", optionId: "animal" });
    const person = interpretDream("ฝันเห็นเสือ", { termId: "tiger", optionId: "person" });

    expect(animal.analysis?.symbols[0]?.id).toBe("tiger");
    expect(person.analysis?.symbols[0]?.id).toBe("tiger_person");
    expect(animal.numbers).toHaveLength(12);
    expect(person.numbers).toHaveLength(12);
  });
});

describe("dream knowledge production v1", () => {
  it(`keeps the agreed coverage (${dreamKnowledgeStats.symbols} symbols, ${dreamKnowledgeStats.aliases} unique aliases, ${dreamKnowledgeStats.categories} categories)`, () => {
    expect(dreamKnowledgeStats.symbols).toBeGreaterThanOrEqual(300);
    expect(dreamKnowledgeStats.symbols).toBeLessThanOrEqual(500);
    expect(dreamKnowledgeStats.aliases).toBeGreaterThanOrEqual(1500);
    expect(dreamKnowledgeStats.aliases).toBeLessThanOrEqual(3000);
  });

  it("covers every required product category", () => {
    const categories = [...new Set(dreamKnowledge.map((entry) => entry.category))];
    expect(categories).toEqual(expect.arrayContaining([
      "บุคคล", "สัตว์", "สิ่งของ", "ธรรมชาติ", "สถานที่", "เหตุการณ์", "ร่างกาย",
      "ความตายและลี้ลับ", "ศาสนาและความเชื่อ", "ยานพาหนะ", "อารมณ์",
    ]));
  });

  it("requires unique ids, three digits, provenance and review state", () => {
    expect(new Set(dreamKnowledge.map((entry) => entry.id)).size).toBe(dreamKnowledge.length);
    expect(new Set(dreamKnowledge.map((entry) => entry.label)).size).toBe(dreamKnowledge.length);
    for (const entry of dreamKnowledge) {
      expect(entry.aliases.length).toBeGreaterThan(0);
      expect(entry.digits).toHaveLength(3);
      expect(entry.source.length).toBeGreaterThan(0);
      expect(entry.sourceUrl).toMatch(/^https:\/\//u);
      expect(entry.reviewStatus.length).toBeGreaterThan(0);
    }
  });

  it("gives every shared alias a canonical owner", () => {
    const owners = new Map<string, typeof dreamKnowledge[number][]>();
    for (const entry of dreamKnowledge) {
      for (const alias of entry.aliases) {
        const normalized = alias.normalize("NFC").toLocaleLowerCase("th-TH").trim();
        owners.set(normalized, [...(owners.get(normalized) ?? []), entry]);
      }
    }
    const unresolved = [...owners.entries()].filter(([alias, entries]) => entries.length > 1 && !entries.some((entry) => entry.label.normalize("NFC").toLocaleLowerCase("th-TH") === alias));
    expect(unresolved.map(([alias]) => alias)).toEqual([]);
  });
});
