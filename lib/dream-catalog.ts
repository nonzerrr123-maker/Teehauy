import type { DreamResult } from "@/lib/dream-engine";
import { dreamKnowledge } from "@/lib/dream-knowledge";

export type DreamEntry = {
  emoji: string;
  name: string;
  category: string;
  numbers: string;
  meaning: string;
  luck: "สูง" | "กลาง" | "ต่ำ";
};

export const quickCategories = [
  { emoji: "🐍", label: "งู", desc: "งูและสัตว์เลื้อยคลาน" },
  { emoji: "🐟", label: "ปลา", desc: "ปลาและสัตว์น้ำ" },
  { emoji: "🌊", label: "น้ำ", desc: "น้ำ ทะเล แม่น้ำ" },
  { emoji: "🐘", label: "ช้าง", desc: "ช้างและสัตว์ใหญ่" },
  { emoji: "🔥", label: "ไฟ", desc: "ไฟและแสงสว่าง" },
  { emoji: "🌙", label: "ดาว", desc: "ดาวและท้องฟ้า" },
  { emoji: "💰", label: "ทอง", desc: "ทองคำและสมบัติ" },
  { emoji: "🌺", label: "ดอกไม้", desc: "ดอกไม้และสวน" },
];

export const dictionaryEntries: DreamEntry[] = dreamKnowledge.map((entry) => ({
  emoji: entry.emoji,
  name: entry.label,
  category: entry.category,
  numbers: `${entry.digits[0]}${entry.digits[1]}, ${entry.digits[1]}${entry.digits[0]}, ${entry.digits.join("")}`,
  meaning: entry.meaning,
  luck: entry.luck,
}));

export const defaultHistory: DreamResult[] = [
  {
    dreamText: "ฝันเห็นงูใหญ่สีทองขดอยู่ในบ้าน",
    numbers: [
      { label: "สองตัวบน", value: "74", type: "2top" },
      { label: "สองตัวล่าง", value: "47", type: "2bot" },
      { label: "สามตัวบน", value: "749", type: "3top" },
      { label: "วิ่งบน", value: "7, 4, 9", type: "run" },
    ],
    meaning: "งูทองในฝันสื่อถึงการเปลี่ยนแปลง โชคลาภ และสิ่งมีค่าที่กำลังถูกค้นพบ",
    luckyElement: "ทอง",
    date: "2026-08-28",
  },
  {
    dreamText: "ฝันเห็นช้างเผือกสามเชือกในทุ่งดอกไม้",
    numbers: [
      { label: "สองตัวบน", value: "35", type: "2top" },
      { label: "สองตัวล่าง", value: "53", type: "2bot" },
      { label: "สามตัวบน", value: "350", type: "3top" },
      { label: "วิ่งบน", value: "3, 5, 0", type: "run" },
    ],
    meaning: "ช้างเผือกเป็นสัญลักษณ์ของความเป็นสิริมงคล ความยิ่งใหญ่ และความมั่นคง",
    luckyElement: "ดิน",
    date: "2026-08-25",
  },
];
