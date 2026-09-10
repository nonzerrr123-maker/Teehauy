import { dreamKnowledge, dreamKnowledgeVersion, type DreamElement, type DreamKnowledgeEntry } from "./dream-knowledge";

export type NumberItem = {
  label: string;
  value: string;
  type: "2top" | "2bot" | "2dream" | "3top" | "run";
  source?: string;
  knowledgeSource?: string;
  knowledgeSourceUrl?: string;
  reviewStatus?: DreamKnowledgeEntry["reviewStatus"];
};

export type DreamSymbolMatch = {
  id: string;
  label: string;
  matchedText: string;
  category: string;
  meaning: string;
  contexts: string[];
  importance: "หลัก" | "รอง";
  confidence: "สูง" | "กลาง";
  source: string;
  sourceUrl: string;
  reviewStatus: DreamKnowledgeEntry["reviewStatus"];
};

export type DreamClarificationResolution = {
  termId: "tiger";
  optionId: "animal" | "person";
};

export type DreamClarification = {
  termId: DreamClarificationResolution["termId"];
  term: string;
  question: string;
  options: readonly {
    id: DreamClarificationResolution["optionId"];
    label: string;
    description: string;
  }[];
};

export type DreamAnalysis = {
  engineVersion: "thai-symbol-composer-v2";
  knowledgeVersion: typeof dreamKnowledgeVersion;
  symbols: DreamSymbolMatch[];
  contexts: string[];
  hasUnmatchedContent: boolean;
  needsMoreDetail: boolean;
  clarification?: DreamClarification;
};

export type DreamResult = {
  id?: string;
  dreamText: string;
  numbers: NumberItem[];
  meaning: string;
  luckyElement: DreamElement;
  date: string;
  analysis?: DreamAnalysis;
};

type TextSpan = { start: number; end: number };
type RawSymbolMatch = TextSpan & { entry: DreamKnowledgeEntry; alias: string };
type ContextDefinition = {
  label: string;
  aliases: readonly string[];
  digit: string;
  kind: "สี" | "จำนวน" | "ขนาด" | "เหตุการณ์" | "สถานที่" | "อารมณ์";
  boost: number;
};
type ContextMatch = TextSpan & ContextDefinition & { matchedText: string };
type RankedSymbol = {
  entry: DreamKnowledgeEntry;
  matchedTexts: string[];
  contexts: ContextMatch[];
  occurrences: number;
  firstIndex: number;
  score: number;
  confidence: DreamSymbolMatch["confidence"];
};
type NumberCandidate = { value: string; score: number; sources: Set<string> };

const contextDefinitions: readonly ContextDefinition[] = [
  { label: "สีขาว", aliases: ["สีขาว", "ขาว", "เผือก"], digit: "0", kind: "สี", boost: 0.12 },
  { label: "สีดำ", aliases: ["สีดำ", "ดำ"], digit: "9", kind: "สี", boost: 0.12 },
  { label: "สีแดง", aliases: ["สีแดง", "แดง"], digit: "6", kind: "สี", boost: 0.12 },
  { label: "สีทอง", aliases: ["สีทอง", "ทองอร่าม"], digit: "8", kind: "สี", boost: 0.15 },
  { label: "สีเขียว", aliases: ["สีเขียว", "เขียว"], digit: "5", kind: "สี", boost: 0.1 },
  { label: "สีน้ำเงิน", aliases: ["สีน้ำเงิน", "สีฟ้า"], digit: "4", kind: "สี", boost: 0.1 },
  { label: "หนึ่ง", aliases: ["หนึ่งตัว", "หนึ่งคน", "หนึ่งองค์", "หนึ่งหลัง", "หนึ่งคัน", "หนึ่งเชือก", "ตัวเดียว", "คนเดียว"], digit: "1", kind: "จำนวน", boost: 0.08 },
  { label: "สอง", aliases: ["สองตัว", "สองคน", "สององค์", "สองหลัง", "สองคัน", "สองเชือก", "คู่หนึ่ง"], digit: "2", kind: "จำนวน", boost: 0.08 },
  { label: "สาม", aliases: ["สามตัว", "สามคน", "สามองค์", "สามหลัง", "สามคัน", "สามเชือก"], digit: "3", kind: "จำนวน", boost: 0.08 },
  { label: "สี่", aliases: ["สี่ตัว", "สี่คน", "สี่องค์", "สี่หลัง", "สี่คัน", "สี่เชือก"], digit: "4", kind: "จำนวน", boost: 0.08 },
  { label: "ห้า", aliases: ["ห้าตัว", "ห้าคน", "ห้าองค์", "ห้าหลัง", "ห้าคัน", "ห้าเชือก"], digit: "5", kind: "จำนวน", boost: 0.08 },
  { label: "ขนาดใหญ่", aliases: ["ตัวใหญ่มาก", "ขนาดใหญ่", "ตัวใหญ่", "ใหญ่มาก"], digit: "8", kind: "ขนาด", boost: 0.14 },
  { label: "ขนาดเล็ก", aliases: ["ตัวเล็กมาก", "ขนาดเล็ก", "ตัวเล็ก", "เล็กมาก"], digit: "1", kind: "ขนาด", boost: 0.12 },
  { label: "กัด", aliases: ["กัด", "ฉก"], digit: "4", kind: "เหตุการณ์", boost: 0.3 },
  { label: "คำราม", aliases: ["แยกเขี้ยว", "คำราม"], digit: "7", kind: "เหตุการณ์", boost: 0.24 },
  { label: "ไล่ตาม", aliases: ["วิ่งไล่", "ไล่ตาม", "ไล่"], digit: "7", kind: "เหตุการณ์", boost: 0.24 },
  { label: "ตก", aliases: ["ตกจาก", "พลัดตก", "ตก"], digit: "6", kind: "เหตุการณ์", boost: 0.22 },
  { label: "บิน", aliases: ["ลอยขึ้น", "เหาะ", "บิน"], digit: "9", kind: "เหตุการณ์", boost: 0.18 },
  { label: "ตาย", aliases: ["เสียชีวิต", "ตาย"], digit: "0", kind: "เหตุการณ์", boost: 0.28 },
  { label: "ในป่า", aliases: ["กลางป่า", "ในป่า"], digit: "5", kind: "สถานที่", boost: 0.1 },
  { label: "ในบ้าน", aliases: ["ข้างในบ้าน", "ในบ้าน"], digit: "3", kind: "สถานที่", boost: 0.1 },
  { label: "ในน้ำ", aliases: ["ใต้น้ำ", "กลางน้ำ", "ในน้ำ"], digit: "1", kind: "สถานที่", boost: 0.1 },
  { label: "บนถนน", aliases: ["กลางถนน", "บนถนน"], digit: "4", kind: "สถานที่", boost: 0.1 },
  { label: "ร้องไห้", aliases: ["ร้องไห้", "น้ำตาไหล", "น้ำตา"], digit: "2", kind: "อารมณ์", boost: 0.2 },
  { label: "กลัว", aliases: ["หวาดกลัว", "ตกใจ", "กลัว"], digit: "5", kind: "อารมณ์", boost: 0.18 },
  { label: "ดีใจ", aliases: ["มีความสุข", "หัวเราะ", "ดีใจ"], digit: "8", kind: "อารมณ์", boost: 0.14 },
];

const twoDigitOrders = [[0, 1], [1, 0], [0, 2], [2, 0], [1, 2], [2, 1]] as const;
const threeDigitOrders = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]] as const;
const ignoredCoverageWords = /ฝัน(?:ว่า|เห็น)?|เมื่อคืน|เห็น|พบ|อยู่|แล้ว|และ|กับ|เข้า|ใน|ที่|ของ|ฉัน|ผม|เรา|ก็|มี|มาก|ตัว|คน|แห่ง|หนึ่ง/gu;

function normalizeText(text: string) {
  return text.normalize("NFC").toLocaleLowerCase("th-TH").replace(/\s+/gu, " ").trim();
}

const normalizedKnowledgeAliases = dreamKnowledge
  .flatMap((entry) => entry.aliases.map((alias) => ({ entry, alias: normalizeText(alias), canonical: normalizeText(alias) === normalizeText(entry.label) })))
  .sort((a, b) => b.alias.length - a.alias.length || Number(b.canonical) - Number(a.canonical) || a.entry.id.localeCompare(b.entry.id));
const dreamKnowledgeById = new Map(dreamKnowledge.map((entry) => [entry.id, entry]));

function overlaps(span: TextSpan, accepted: readonly TextSpan[]) {
  return accepted.some((item) => span.start < item.end && span.end > item.start);
}

function findAll(text: string, value: string) {
  const indexes: number[] = [];
  let from = 0;
  while (from < text.length) {
    const index = text.indexOf(value, from);
    if (index < 0) break;
    indexes.push(index);
    from = index + Math.max(value.length, 1);
  }
  return indexes;
}

function thaiWordBoundaries(text: string) {
  const boundaries = new Set<number>([0, text.length]);
  for (const segment of new Intl.Segmenter("th", { granularity: "word" }).segment(text)) {
    boundaries.add(segment.index);
    boundaries.add(segment.index + segment.segment.length);
  }
  return boundaries;
}

function collectSymbolMatches(text: string, contexts: ContextMatch[]): RawSymbolMatch[] {
  const accepted: RawSymbolMatch[] = [];
  const wordBoundaries = thaiWordBoundaries(text);

  for (const item of normalizedKnowledgeAliases) {
    for (const start of findAll(text, item.alias)) {
      const span = { start, end: start + item.alias.length };
      if (!wordBoundaries.has(span.start) || !wordBoundaries.has(span.end)) continue;
      const isColorOnly = (item.entry.id === "gold" || item.entry.id === "money") && contexts.some((context) => context.kind === "สี" && overlaps(span, [context]));
      const isWaterContext = item.entry.id === "water" && contexts.some((context) => (context.kind === "สี" || context.kind === "อารมณ์") && overlaps(span, [context]));
      const isEmbeddedShortWord = (item.entry.id === "temple" && text.slice(Math.max(0, start - 1), span.end) === "หวัด")
        || (item.entry.id === "fish" && item.alias === "ปลา" && text.slice(span.end, span.end + 1) === "ย")
        || (item.entry.id === "star" && item.alias === "ดาว" && text.slice(span.end, span.end + 2).startsWith("น์"));
      if (isColorOnly || isWaterContext || isEmbeddedShortWord) continue;
      if (!overlaps(span, accepted)) accepted.push({ ...span, ...item });
    }
  }
  return accepted.sort((a, b) => a.start - b.start || b.alias.length - a.alias.length);
}

function collectContextMatches(text: string): ContextMatch[] {
  const aliases = contextDefinitions
    .flatMap((definition) => definition.aliases.map((alias) => ({ definition, alias: normalizeText(alias) })))
    .sort((a, b) => b.alias.length - a.alias.length);
  const accepted: ContextMatch[] = [];

  for (const item of aliases) {
    for (const start of findAll(text, item.alias)) {
      const span = { start, end: start + item.alias.length };
      if (!overlaps(span, accepted)) accepted.push({ ...span, ...item.definition, matchedText: item.alias });
    }
  }
  return accepted.sort((a, b) => a.start - b.start);
}

function distanceBetween(a: TextSpan, b: TextSpan) {
  if (a.end < b.start) return b.start - a.end;
  if (b.end < a.start) return a.start - b.end;
  return 0;
}

function rankSymbols(text: string, rawMatches: RawSymbolMatch[], contexts: ContextMatch[]): RankedSymbol[] {
  const grouped = new Map<string, RawSymbolMatch[]>();
  for (const match of rawMatches) grouped.set(match.entry.id, [...(grouped.get(match.entry.id) ?? []), match]);

  return [...grouped.values()].map<RankedSymbol>((matches) => {
    const entry = matches[0].entry;
    const nearbyContexts = contexts.flatMap((context) => {
      const closestMatch = [...matches].sort((a, b) => distanceBetween(a, context) - distanceBetween(b, context))[0];
      const distance = distanceBetween(closestMatch, context);
      const globalDistance = Math.min(...rawMatches.map((match) => distanceBetween(match, context)));
      if (distance > 12 || ((context.kind === "สี" || context.kind === "จำนวน" || context.kind === "ขนาด" || context.kind === "สถานที่" || context.kind === "อารมณ์") && distance > globalDistance)) return [];
      if (context.kind !== "เหตุการณ์") return [context];
      const relationFactor = closestMatch.end <= context.start ? 1.35 : context.end <= closestMatch.start ? 0.55 : 1;
      return [{ ...context, boost: context.boost * relationFactor }];
    });
    const uniqueContexts = [...new Map(nearbyContexts.map((context) => [`${context.kind}:${context.label}`, context])).values()];
    const longestMatch = Math.max(...matches.map((match) => match.alias.length));
    const contextBoost = uniqueContexts.reduce((sum, context) => sum + context.boost, 0);
    const repetitionBoost = Math.min((matches.length - 1) * 0.24, 0.72);
    const roleBoost = entry.category === "บุคคล" || entry.category === "เหตุการณ์" ? 0.16 : entry.category === "สถานที่" ? 0.08 : 0.12;
    const specificityBoost = Math.min(longestMatch * 0.035, 0.45);
    const centralityBoost = text.length ? Math.max(0, 1 - matches[0].start / text.length) * 0.1 : 0;
    const score = 1 + contextBoost + repetitionBoost + roleBoost + specificityBoost + centralityBoost;

    return {
      entry,
      matchedTexts: [...new Set(matches.map((match) => match.alias))],
      contexts: uniqueContexts,
      occurrences: matches.length,
      firstIndex: matches[0].start,
      score,
      confidence: longestMatch > entry.label.length || matches.length > 1 || uniqueContexts.length > 0 ? "สูง" : "กลาง",
    };
  }).sort((a, b) => b.score - a.score || a.firstIndex - b.firstIndex || a.entry.id.localeCompare(b.entry.id));
}

function addCandidate(target: Map<string, NumberCandidate>, value: string, score: number, source: string, length: 2 | 3) {
  if (!new RegExp(`^\\d{${length}}$`, "u").test(value)) return;
  const existing = target.get(value);
  if (existing) {
    existing.score += score * 0.18;
    existing.sources.add(source);
    return;
  }
  target.set(value, { value, score, sources: new Set([source]) });
}

function rankedCandidates(target: Map<string, NumberCandidate>, limit: number) {
  return [...target.values()].sort((a, b) => b.score - a.score || a.value.localeCompare(b.value)).slice(0, limit);
}

function generateNumbers(symbols: RankedSymbol[]): NumberItem[] {
  if (!symbols.length) return [];
  const two = new Map<string, NumberCandidate>();
  const three = new Map<string, NumberCandidate>();

  symbols.slice(0, 5).forEach((symbol, symbolIndex) => {
    twoDigitOrders.forEach((order, orderIndex) => {
      addCandidate(two, order.map((index) => symbol.entry.digits[index]).join(""), symbol.score * 100 - symbolIndex * 9 - orderIndex * 1.5, symbol.entry.label, 2);
    });
    threeDigitOrders.forEach((order, orderIndex) => {
      addCandidate(three, order.map((index) => symbol.entry.digits[index]).join(""), symbol.score * 100 - symbolIndex * 9 - orderIndex * 1.5, symbol.entry.label, 3);
    });

    symbol.contexts.forEach((context, contextIndex) => {
      const [first, second] = symbol.entry.digits;
      addCandidate(two, `${first}${context.digit}`, symbol.score * 112 + context.boost * 100 - contextIndex, `${symbol.entry.label} + ${context.label}`, 2);
      addCandidate(two, `${context.digit}${first}`, symbol.score * 108 + context.boost * 100 - contextIndex, `${context.label} + ${symbol.entry.label}`, 2);
      addCandidate(three, `${first}${second}${context.digit}`, symbol.score * 112 + context.boost * 100 - contextIndex, `${symbol.entry.label} + ${context.label}`, 3);
      addCandidate(three, `${context.digit}${first}${second}`, symbol.score * 108 + context.boost * 100 - contextIndex, `${context.label} + ${symbol.entry.label}`, 3);
    });
  });

  for (let firstIndex = 0; firstIndex < Math.min(symbols.length, 4); firstIndex += 1) {
    for (let secondIndex = firstIndex + 1; secondIndex < Math.min(symbols.length, 4); secondIndex += 1) {
      const first = symbols[firstIndex];
      const second = symbols[secondIndex];
      const source = `${first.entry.label} + ${second.entry.label}`;
      const combinedScore = (first.score + second.score) * 78 - firstIndex * 3 - secondIndex;
      addCandidate(two, `${first.entry.digits[0]}${second.entry.digits[0]}`, combinedScore, source, 2);
      addCandidate(two, `${second.entry.digits[0]}${first.entry.digits[0]}`, combinedScore - 2, source, 2);
      addCandidate(three, `${first.entry.digits[0]}${first.entry.digits[1]}${second.entry.digits[0]}`, combinedScore + 4, source, 3);
      addCandidate(three, `${first.entry.digits[0]}${second.entry.digits[0]}${second.entry.digits[1]}`, combinedScore + 2, source, 3);
      addCandidate(three, `${second.entry.digits[0]}${first.entry.digits[0]}${first.entry.digits[1]}`, combinedScore, source, 3);
    }
  }

  const provenance = symbols[0].entry;
  const twoResults = rankedCandidates(two, 6).map<NumberItem>((candidate, index) => ({
    label: `เลข 2 ตัว · ${index + 1}`,
    value: candidate.value,
    type: "2dream",
    source: [...candidate.sources].slice(0, 2).join(" · "),
    knowledgeSource: provenance.source,
    knowledgeSourceUrl: provenance.sourceUrl,
    reviewStatus: provenance.reviewStatus,
  }));
  const threeResults = rankedCandidates(three, 6).map<NumberItem>((candidate, index) => ({
    label: `เลข 3 ตัว · ${index + 1}`,
    value: candidate.value,
    type: "3top",
    source: [...candidate.sources].slice(0, 2).join(" · "),
    knowledgeSource: provenance.source,
    knowledgeSourceUrl: provenance.sourceUrl,
    reviewStatus: provenance.reviewStatus,
  }));
  return [...twoResults, ...threeResults];
}

function chooseElement(symbols: RankedSymbol[]): DreamElement {
  if (!symbols.length) return "ดิน";
  const totals = new Map<DreamElement, number>();
  for (const symbol of symbols) totals.set(symbol.entry.element, (totals.get(symbol.entry.element) ?? 0) + symbol.score);
  return [...totals.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? symbols[0].entry.element;
}

function buildMeaning(symbols: RankedSymbol[], contexts: ContextMatch[]) {
  if (!symbols.length) {
    return "ยังไม่พบสัญลักษณ์ที่ชัดเจนในคลัง ลองเพิ่มว่าเห็นใคร สัตว์ สิ่งของ สถานที่ เหตุการณ์ สี หรือจำนวนอะไร เพื่อให้ระบบตีความจากรายละเอียดจริงโดยไม่เดาเกินข้อมูล";
  }
  const [primary, ...secondary] = symbols;
  const secondaryText = secondary.slice(0, 3).map((symbol) => `“${symbol.entry.label}” สื่อถึง${symbol.entry.meaning}`).join("; ");
  const contextText = [...new Set(contexts.map((context) => context.label))].slice(0, 4).join(", ");
  const extraCount = Math.max(0, secondary.length - 3);

  return [
    `ภาพหลักคือ “${primary.entry.label}” ซึ่งสื่อถึง${primary.entry.meaning}`,
    secondaryText ? `ภาพประกอบที่พบคือ ${secondaryText}${extraCount ? ` และอีก ${extraCount} สัญลักษณ์` : ""}` : "",
    contextText ? `ระบบนำบริบท ${contextText} มาช่วยจัดน้ำหนัก โดยไม่ลบความหมายของสัญลักษณ์อื่น` : "",
  ].filter(Boolean).join(" ");
}

function coverageState(text: string, rawMatches: RawSymbolMatch[], contexts: ContextMatch[]) {
  const relevant = text.replace(ignoredCoverageWords, "").replace(/[^\p{L}\p{N}]/gu, "");
  if (!relevant.length) return false;
  const coveredIndexes = new Set<number>();
  for (const span of [...rawMatches, ...contexts]) {
    for (let index = span.start; index < span.end; index += 1) coveredIndexes.add(index);
  }
  return coveredIndexes.size / relevant.length < 0.45;
}

function isBareTigerDream(text: string, rawMatches: RawSymbolMatch[]) {
  if (rawMatches.length !== 1 || rawMatches[0].entry.id !== "tiger" || rawMatches[0].alias !== "เสือ") return false;
  const withoutDreamWrapper = text
    .replace(/เมื่อคืน/gu, "")
    .replace(/ฝัน(?:ว่า)?/gu, "")
    .replace(/เห็น|เจอ|พบ/gu, "")
    .replace(/[\s,.!?"'“”‘’]+/gu, "")
    .trim();
  return withoutDreamWrapper === "เสือ";
}

function tigerClarification(): DreamClarification {
  return {
    termId: "tiger",
    term: "เสือ",
    question: "คำว่า “เสือ” ในฝันนี้หมายถึงอะไร?",
    options: [
      { id: "animal", label: "เสือที่เป็นสัตว์", description: "เช่น เสือโคร่ง เสือในป่า หรือเสือที่เข้ามาทำร้าย" },
      { id: "person", label: "คนชื่อหรือฉายาเสือ", description: "เช่น พี่เสือ เพื่อนชื่อเสือ หรือคนที่เรียกกันว่าเสือ" },
    ],
  };
}

function applyClarification(rawMatches: RawSymbolMatch[], resolution?: DreamClarificationResolution) {
  if (resolution?.termId !== "tiger" || resolution.optionId !== "person") return rawMatches;
  const person = dreamKnowledgeById.get("tiger_person");
  if (!person) return rawMatches;
  return rawMatches.map((match) => match.entry.id === "tiger" && match.alias === "เสือ" ? { ...match, entry: person } : match);
}

export function isDreamClarificationResolution(value: unknown): value is DreamClarificationResolution {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<DreamClarificationResolution>;
  return candidate.termId === "tiger" && (candidate.optionId === "animal" || candidate.optionId === "person");
}

export function interpretDream(dreamText: string, resolution?: DreamClarificationResolution): DreamResult {
  const normalized = normalizeText(dreamText);
  const contexts = collectContextMatches(normalized);
  const collectedMatches = collectSymbolMatches(normalized, contexts);
  const clarification = !resolution && isBareTigerDream(normalized, collectedMatches) ? tigerClarification() : undefined;
  const rawMatches = applyClarification(collectedMatches, resolution);
  const symbols = rankSymbols(normalized, rawMatches, contexts);
  const numbers = clarification ? [] : generateNumbers(symbols);
  const hasUnmatchedContent = coverageState(normalized, rawMatches, contexts);

  return {
    dreamText: normalized,
    numbers,
    meaning: clarification ? "ข้อความนี้ยังแยกไม่ได้ว่า “เสือ” หมายถึงสัตว์หรือบุคคล เลือกความหมายที่ตรงกับฝันก่อน แล้วระบบจึงจะตีความและจัดชุดเลข" : buildMeaning(symbols, contexts),
    luckyElement: chooseElement(symbols),
    date: new Date().toISOString().slice(0, 10),
    analysis: {
      engineVersion: "thai-symbol-composer-v2",
      knowledgeVersion: dreamKnowledgeVersion,
      symbols: symbols.map((symbol, index) => ({
        id: symbol.entry.id,
        label: symbol.entry.label,
        matchedText: symbol.matchedTexts.join(", "),
        category: symbol.entry.category,
        meaning: symbol.entry.meaning,
        contexts: symbol.contexts.map((context) => context.label),
        importance: index === 0 ? "หลัก" : "รอง",
        confidence: symbol.confidence,
        source: symbol.entry.source,
        sourceUrl: symbol.entry.sourceUrl,
        reviewStatus: symbol.entry.reviewStatus,
      })),
      contexts: [...new Set(contexts.map((context) => context.label))],
      hasUnmatchedContent,
      needsMoreDetail: symbols.length === 0 || Boolean(clarification),
      clarification,
    },
  };
}
