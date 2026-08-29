import type { DreamResult } from "@/lib/dream-engine";

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

export const dictionaryEntries: DreamEntry[] = [
  { emoji: "🐍", name: "งู", category: "สัตว์", numbers: "74, 47, 749", meaning: "การเปลี่ยนแปลง โชคลาภ และพลังลึกลับ", luck: "สูง" },
  { emoji: "🐟", name: "ปลา", category: "สัตว์น้ำ", numbers: "56, 65, 566", meaning: "ความอุดมสมบูรณ์ เงินทองไหลมาเทมา", luck: "สูง" },
  { emoji: "🐘", name: "ช้าง", category: "สัตว์", numbers: "35, 53, 350", meaning: "ความยิ่งใหญ่ ความมั่นคง และโชคดี", luck: "สูง" },
  { emoji: "🐯", name: "เสือ", category: "สัตว์", numbers: "32, 23, 321", meaning: "อำนาจ ความกล้า และชัยชนะ", luck: "สูง" },
  { emoji: "🐲", name: "มังกร", category: "ตำนาน", numbers: "98, 89, 985", meaning: "โชคก้อนใหญ่และพลังแห่งการเปลี่ยนแปลง", luck: "สูง" },
  { emoji: "🌊", name: "น้ำท่วม", category: "ธรรมชาติ", numbers: "19, 91, 196", meaning: "การเปลี่ยนแปลงครั้งใหญ่และการเริ่มต้นใหม่", luck: "กลาง" },
  { emoji: "🔥", name: "ไฟ", category: "ธรรมชาติ", numbers: "67, 76, 673", meaning: "พลังงาน ความสำเร็จ และแรงผลักดัน", luck: "กลาง" },
  { emoji: "🌙", name: "พระจันทร์", category: "ท้องฟ้า", numbers: "15, 51, 150", meaning: "ความลึกลับ ความรัก และสัญชาตญาณ", luck: "กลาง" },
  { emoji: "⭐", name: "ดาว", category: "ท้องฟ้า", numbers: "07, 70, 077", meaning: "ความหวังและความสำเร็จในอนาคต", luck: "สูง" },
  { emoji: "💰", name: "เงินทอง", category: "วัตถุ", numbers: "25, 52, 253", meaning: "โชคลาภ ความร่ำรวย และโอกาสด้านการเงิน", luck: "สูง" },
  { emoji: "🌺", name: "ดอกไม้", category: "พืช", numbers: "82, 28, 829", meaning: "ความรัก ความสุข และสิ่งดีงาม", luck: "กลาง" },
  { emoji: "🏠", name: "บ้าน", category: "สถานที่", numbers: "30, 03, 308", meaning: "ความมั่นคง ครอบครัว และที่พักพิง", luck: "กลาง" },
  { emoji: "✈️", name: "เครื่องบิน", category: "พาหนะ", numbers: "16, 61, 163", meaning: "การเดินทาง โอกาสใหม่ และความก้าวหน้า", luck: "กลาง" },
  { emoji: "👰", name: "งานแต่งงาน", category: "เหตุการณ์", numbers: "09, 90, 090", meaning: "ข่าวดี ความสุข และการรวมกัน", luck: "สูง" },
  { emoji: "👻", name: "ผี", category: "ลี้ลับ", numbers: "13, 31, 139", meaning: "การสิ้นสุดที่นำไปสู่การเริ่มต้นใหม่", luck: "กลาง" },
  { emoji: "🐶", name: "สุนัข", category: "สัตว์", numbers: "42, 24, 426", meaning: "ความซื่อสัตย์ มิตรภาพ และความไว้ใจ", luck: "กลาง" },
  { emoji: "🐱", name: "แมว", category: "สัตว์", numbers: "48, 84, 489", meaning: "ความเป็นอิสระ โชคซ่อนเร้น และไหวพริบ", luck: "กลาง" },
  { emoji: "🐄", name: "วัว", category: "สัตว์", numbers: "20, 02, 205", meaning: "ความขยันและผลลัพธ์จากความพยายาม", luck: "กลาง" },
  { emoji: "🌈", name: "รุ้งกินน้ำ", category: "ท้องฟ้า", numbers: "77, 17, 771", meaning: "โชคดีพิเศษและการเปลี่ยนแปลงที่ดี", luck: "สูง" },
];

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
