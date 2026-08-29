export type NumberItem = {
  label: string;
  value: string;
  type: "2top" | "2bot" | "3top" | "run";
};

export type DreamResult = {
  dreamText: string;
  numbers: NumberItem[];
  meaning: string;
  luckyElement: "ทอง" | "น้ำ" | "ไฟ" | "ดิน" | "ลม";
  date: string;
};

type InterpretationRule = {
  key: string;
  numbers: NumberItem[];
  meaning: string;
  element: DreamResult["luckyElement"];
};

function nums(top: string, bottom: string, three: string, run: string): NumberItem[] {
  return [
    { label: "สองตัวบน", value: top, type: "2top" },
    { label: "สองตัวล่าง", value: bottom, type: "2bot" },
    { label: "สามตัวบน", value: three, type: "3top" },
    { label: "วิ่งบน", value: run, type: "run" },
  ];
}

const rules: InterpretationRule[] = [
  {
    key: "งู",
    numbers: nums("74", "47", "749", "7, 4, 9"),
    meaning: "งูในฝันบ่งชี้ถึงการเปลี่ยนแปลงและโชคลาภที่ซ่อนอยู่ เลข 7 เป็นตัวนำโชค",
    element: "ทอง",
  },
  {
    key: "ปลา",
    numbers: nums("56", "65", "566", "5, 6, 1"),
    meaning: "ปลาในฝันสื่อถึงความอุดมสมบูรณ์ ความสำเร็จ และเงินทองที่ไหลมาเทมา",
    element: "น้ำ",
  },
  {
    key: "น้ำ",
    numbers: nums("19", "91", "196", "1, 9, 6"),
    meaning: "น้ำในฝันเป็นสัญลักษณ์ของการชำระล้าง การเริ่มต้นใหม่ และโอกาสที่กำลังมาถึง",
    element: "น้ำ",
  },
  {
    key: "ช้าง",
    numbers: nums("35", "53", "350", "3, 5, 0"),
    meaning: "ช้างแทนความยิ่งใหญ่ ความมั่นคง และโชคดีที่ยั่งยืน",
    element: "ดิน",
  },
  {
    key: "วัว",
    numbers: nums("20", "02", "205", "2, 0, 5"),
    meaning: "วัวในฝันหมายถึงความขยันและผลตอบแทนจากความพยายาม",
    element: "ดิน",
  },
  {
    key: "ไฟ",
    numbers: nums("67", "76", "673", "6, 7, 3"),
    meaning: "ไฟในฝันบ่งบอกถึงพลัง ความกล้า และการเปลี่ยนแปลงครั้งสำคัญ",
    element: "ไฟ",
  },
  {
    key: "ทอง",
    numbers: nums("25", "52", "253", "2, 5, 3"),
    meaning: "ทองคำสื่อถึงคุณค่า โอกาสทางการเงิน และสิ่งดีที่กำลังเข้ามา",
    element: "ทอง",
  },
  {
    key: "ดอกไม้",
    numbers: nums("82", "28", "829", "8, 2, 9"),
    meaning: "ดอกไม้สื่อถึงความสุข ความสัมพันธ์ที่เบ่งบาน และข่าวดี",
    element: "ลม",
  },
  {
    key: "ดาว",
    numbers: nums("07", "70", "077", "0, 7, 9"),
    meaning: "ดาวสื่อถึงความหวัง เป้าหมาย และเส้นทางใหม่ที่กำลังเปิดขึ้น",
    element: "ลม",
  },
];

const fallbackMeanings = [
  "ความฝันของคุณสื่อถึงจังหวะของการเปลี่ยนแปลงและโอกาสใหม่ ลองใช้ผลนี้เป็นแรงบันดาลใจอย่างมีสติ",
  "รายละเอียดในความฝันสะท้อนการเคลื่อนไหวของชีวิตและการตัดสินใจที่กำลังใกล้เข้ามา",
  "ความฝันนี้ชวนให้มองหาโอกาสเล็ก ๆ รอบตัวและเลือกสิ่งที่เหมาะกับจังหวะของคุณ",
  "ภาพในความฝันสื่อถึงการเริ่มต้นใหม่ การปรับตัว และการเปิดรับสิ่งที่คาดไม่ถึง",
];

const fallbackElements: DreamResult["luckyElement"][] = ["ทอง", "น้ำ", "ไฟ", "ดิน", "ลม"];

function hashText(text: string): number {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function deterministicFallback(dreamText: string) {
  const hash = hashText(dreamText.trim());
  const digitA = hash % 10;
  const digitB = Math.floor(hash / 10) % 10;
  const digitC = Math.floor(hash / 100) % 10;
  const top = `${digitA}${digitB}`;
  const bottom = `${digitB}${digitA}`;
  const three = `${digitA}${digitB}${digitC}`;

  return {
    numbers: nums(top, bottom, three, `${digitA}, ${digitB}, ${digitC}`),
    meaning: fallbackMeanings[hash % fallbackMeanings.length],
    element: fallbackElements[Math.floor(hash / 7) % fallbackElements.length],
  };
}

export function interpretDream(dreamText: string): DreamResult {
  const normalized = dreamText.trim();
  const matched = rules.find((item) => normalized.includes(item.key));
  const data = matched ?? deterministicFallback(normalized);

  return {
    dreamText: normalized,
    numbers: data.numbers,
    meaning: data.meaning,
    luckyElement: data.element,
    date: new Date().toISOString().slice(0, 10),
  };
}
