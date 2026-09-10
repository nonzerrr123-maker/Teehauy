import { expandedDreamKnowledgeSeeds } from "./dream-knowledge-expanded";

export type DreamElement = "ทอง" | "น้ำ" | "ไฟ" | "ดิน" | "ลม";

export type DreamKnowledgeEntry = {
  id: string;
  label: string;
  aliases: readonly string[];
  category: string;
  meaning: string;
  element: DreamElement;
  digits: readonly [string, string, string];
  emoji: string;
  luck: "สูง" | "กลาง" | "ต่ำ";
  source: string;
  sourceUrl: string;
  reviewStatus: "รอตรวจทานเนื้อหา" | "ตรวจรูปแบบแล้ว" | "ตรวจทานเนื้อหาแล้ว";
};

type DreamKnowledgeSeed = Omit<DreamKnowledgeEntry, "source" | "sourceUrl" | "reviewStatus">;

export const dreamKnowledgeVersion = "thai-editorial-catalog-v1" as const;
export const dreamKnowledgeSource = "Teehauy editorial v1 · อ้างอิงกรอบวัฒนธรรมจากตำราทำนายฝัน กรมศิลปากร" as const;
export const dreamKnowledgeSourceUrl = "https://www.finearts.go.th/" as const;

/**
 * Editorial dream-symbol catalog. Entries are intentionally structured and
 * versioned with the engine instead of being copied from third-party dream
 * prediction sites. Aliases are ordered from the most specific phrase first.
 */
const dreamKnowledgeSeeds = [
  { id: "snake", label: "งู", aliases: ["งูใหญ่", "งูเห่า", "งูเหลือม", "งู", "อสรพิษ"], category: "สัตว์", meaning: "การเปลี่ยนแปลง ความสัมพันธ์ และสิ่งที่ซ่อนอยู่", element: "ทอง", digits: ["7", "4", "9"], emoji: "🐍", luck: "สูง" },
  { id: "fish", label: "ปลา", aliases: ["ฝูงปลา", "ปลาตัวใหญ่", "ปลา"], category: "สัตว์น้ำ", meaning: "ความอุดมสมบูรณ์ โอกาส และผลตอบแทน", element: "น้ำ", digits: ["5", "6", "1"], emoji: "🐟", luck: "สูง" },
  { id: "elephant", label: "ช้าง", aliases: ["ช้างเผือก", "ช้าง", "ลูกช้าง"], category: "สัตว์", meaning: "ความมั่นคง ผู้ใหญ่สนับสนุน และความสำเร็จระยะยาว", element: "ดิน", digits: ["3", "5", "0"], emoji: "🐘", luck: "สูง" },
  { id: "tiger", label: "เสือ", aliases: ["เสือโคร่ง", "เสือดาว", "เสือ"], category: "สัตว์", meaning: "อำนาจ ความกล้า และการแข่งขัน", element: "ไฟ", digits: ["3", "2", "1"], emoji: "🐯", luck: "สูง" },
  { id: "tiger_person", label: "บุคคลชื่อเสือ", aliases: ["คนชื่อเสือ", "คนฉายาเสือ", "พี่เสือ", "น้องเสือ", "คุณเสือ"], category: "บุคคล", meaning: "บุคคล ความสัมพันธ์ และเรื่องที่เชื่อมโยงกับคนคนนั้น", element: "ดิน", digits: ["3", "8", "2"], emoji: "👤", luck: "กลาง" },
  { id: "dragon", label: "มังกร", aliases: ["พญามังกร", "มังกร"], category: "ตำนาน", meaning: "พลัง การยกระดับ และโอกาสครั้งใหญ่", element: "ไฟ", digits: ["9", "8", "5"], emoji: "🐲", luck: "สูง" },
  { id: "dog", label: "สุนัข", aliases: ["สุนัข", "หมา", "เจ้าตูบ", "ลูกหมา"], category: "สัตว์", meaning: "มิตรภาพ ความซื่อสัตย์ และคนใกล้ตัว", element: "ดิน", digits: ["4", "2", "6"], emoji: "🐶", luck: "กลาง" },
  { id: "cat", label: "แมว", aliases: ["แมวดำ", "แมว", "ลูกแมว"], category: "สัตว์", meaning: "สัญชาตญาณ ความเป็นอิสระ และเรื่องที่ต้องสังเกต", element: "ลม", digits: ["4", "8", "9"], emoji: "🐱", luck: "กลาง" },
  { id: "cow", label: "วัว", aliases: ["ลูกวัว", "วัว"], category: "สัตว์", meaning: "ความขยัน ความอดทน และผลจากการลงมือทำ", element: "ดิน", digits: ["2", "0", "5"], emoji: "🐄", luck: "กลาง" },
  { id: "bird", label: "นก", aliases: ["ฝูงนก", "นก", "ลูกนก"], category: "สัตว์", meaning: "ข่าวสาร อิสรภาพ และการเดินทาง", element: "ลม", digits: ["1", "6", "8"], emoji: "🐦", luck: "กลาง" },
  { id: "turtle", label: "เต่า", aliases: ["เต่ายักษ์", "เต่า", "ตะพาบ"], category: "สัตว์", meaning: "ความมั่นคง ความอดทน และการคุ้มครอง", element: "น้ำ", digits: ["4", "5", "0"], emoji: "🐢", luck: "กลาง" },
  { id: "crocodile", label: "จระเข้", aliases: ["จระเข้", "ตะเข้"], category: "สัตว์", meaning: "อุปสรรคที่ซ่อนอยู่และการตัดสินใจอย่างรอบคอบ", element: "น้ำ", digits: ["3", "8", "7"], emoji: "🐊", luck: "กลาง" },
  { id: "mother", label: "แม่", aliases: ["คุณแม่", "มารดา", "แม่"], category: "บุคคล", meaning: "ความห่วงใย ความผูกพัน และความมั่นคงทางใจ", element: "ดิน", digits: ["2", "4", "8"], emoji: "👩", luck: "กลาง" },
  { id: "father", label: "พ่อ", aliases: ["คุณพ่อ", "บิดา", "พ่อ"], category: "บุคคล", meaning: "หลักยึด คำแนะนำ และความรับผิดชอบ", element: "ดิน", digits: ["1", "4", "7"], emoji: "👨", luck: "กลาง" },
  { id: "baby", label: "ทารก", aliases: ["เด็กทารก", "ทารก", "เด็กอ่อน", "ลูกน้อย"], category: "บุคคล", meaning: "การเริ่มต้นใหม่ สิ่งที่ต้องดูแล และความหวัง", element: "น้ำ", digits: ["0", "1", "3"], emoji: "👶", luck: "สูง" },
  { id: "child", label: "เด็ก", aliases: ["เด็กผู้ชาย", "เด็กผู้หญิง", "ลูกชาย", "ลูกสาว", "เด็ก"], category: "บุคคล", meaning: "ความสดใหม่ ความอยากรู้อยากเห็น และโอกาสเริ่มต้น", element: "ลม", digits: ["1", "2", "5"], emoji: "🧒", luck: "กลาง" },
  { id: "monk", label: "พระ", aliases: ["พระสงฆ์", "พระภิกษุ", "พระ", "เณร"], category: "บุคคล", meaning: "สติ คำชี้แนะ และการทบทวนสิ่งสำคัญ", element: "ทอง", digits: ["8", "4", "2"], emoji: "🙏", luck: "สูง" },
  { id: "deceased", label: "ผู้ล่วงลับ", aliases: ["คนที่เสียไปแล้ว", "ผู้ล่วงลับ", "คนตาย", "ผู้เสียชีวิต"], category: "บุคคล", meaning: "ความทรงจำ เรื่องค้างคา และการยอมรับความเปลี่ยนแปลง", element: "ลม", digits: ["0", "4", "7"], emoji: "🕯️", luck: "กลาง" },
  { id: "flood", label: "น้ำท่วม", aliases: ["น้ำท่วม", "น้ำป่า", "น้ำล้น", "อุทกภัย"], category: "ธรรมชาติ", meaning: "อารมณ์หรือการเปลี่ยนแปลงที่เข้ามาพร้อมกันหลายด้าน", element: "น้ำ", digits: ["1", "9", "6"], emoji: "🌊", luck: "กลาง" },
  { id: "water", label: "น้ำ", aliases: ["มหาสมุทร", "แม่น้ำ", "ทะเล", "ลำคลอง", "คลอง", "น้ำ"], category: "ธรรมชาติ", meaning: "การปรับตัว อารมณ์ และการเริ่มต้นใหม่", element: "น้ำ", digits: ["1", "9", "6"], emoji: "💧", luck: "กลาง" },
  { id: "fire", label: "ไฟ", aliases: ["ไฟไหม้", "เปลวไฟ", "กองไฟ", "ไฟ"], category: "ธรรมชาติ", meaning: "พลัง แรงผลักดัน และการเปลี่ยนแปลงรวดเร็ว", element: "ไฟ", digits: ["6", "7", "3"], emoji: "🔥", luck: "กลาง" },
  { id: "rain", label: "ฝน", aliases: ["ฝนตกหนัก", "สายฝน", "ฝน"], category: "ธรรมชาติ", meaning: "การคลี่คลาย การฟื้นตัว และสิ่งใหม่ที่กำลังก่อตัว", element: "น้ำ", digits: ["1", "5", "8"], emoji: "🌧️", luck: "กลาง" },
  { id: "tree", label: "ต้นไม้", aliases: ["ต้นไม้ใหญ่", "ต้นไม้", "ต้นโพธิ์"], category: "ธรรมชาติ", meaning: "การเติบโต รากฐาน และความสัมพันธ์ระยะยาว", element: "ดิน", digits: ["2", "6", "9"], emoji: "🌳", luck: "กลาง" },
  { id: "flower", label: "ดอกไม้", aliases: ["ทุ่งดอกไม้", "ดอกไม้", "ดอกบัว", "ดอกกุหลาบ"], category: "ธรรมชาติ", meaning: "ความสุข ความสัมพันธ์ที่เติบโต และข่าวดี", element: "ลม", digits: ["8", "2", "9"], emoji: "🌺", luck: "กลาง" },
  { id: "sun", label: "พระอาทิตย์", aliases: ["พระอาทิตย์", "ดวงอาทิตย์", "ตะวัน"], category: "ท้องฟ้า", meaning: "ความชัดเจน พลังใจ และจังหวะเริ่มลงมือ", element: "ไฟ", digits: ["1", "0", "6"], emoji: "☀️", luck: "สูง" },
  { id: "moon", label: "พระจันทร์", aliases: ["พระจันทร์", "ดวงจันทร์", "จันทร์"], category: "ท้องฟ้า", meaning: "สัญชาตญาณ ความรู้สึก และเรื่องที่ยังไม่เปิดเผย", element: "น้ำ", digits: ["1", "5", "0"], emoji: "🌙", luck: "กลาง" },
  { id: "star", label: "ดาว", aliases: ["ดวงดาว", "ดาวตก", "ดาว"], category: "ท้องฟ้า", meaning: "ความหวัง เป้าหมาย และเส้นทางใหม่", element: "ลม", digits: ["0", "7", "9"], emoji: "⭐", luck: "สูง" },
  { id: "rainbow", label: "รุ้งกินน้ำ", aliases: ["รุ้งกินน้ำ", "สายรุ้ง", "รุ้ง"], category: "ท้องฟ้า", meaning: "การผ่านพ้นอุปสรรคและการเปลี่ยนแปลงที่ดีขึ้น", element: "ลม", digits: ["7", "1", "6"], emoji: "🌈", luck: "สูง" },
  { id: "house", label: "บ้าน", aliases: ["บ้านหลังใหญ่", "บ้านเก่า", "บ้าน", "ที่พัก"], category: "สถานที่", meaning: "ครอบครัว ความปลอดภัย และรากฐานชีวิต", element: "ดิน", digits: ["3", "0", "8"], emoji: "🏠", luck: "กลาง" },
  { id: "temple", label: "วัด", aliases: ["โบสถ์", "วิหาร", "วัด"], category: "สถานที่", meaning: "การพักใจ คุณค่าภายใน และการขอคำชี้แนะ", element: "ทอง", digits: ["8", "1", "4"], emoji: "🛕", luck: "สูง" },
  { id: "cemetery", label: "สุสาน", aliases: ["ป่าช้า", "สุสาน", "หลุมศพ"], category: "สถานที่", meaning: "การวางอดีตและการเปลี่ยนผ่านไปสู่ช่วงใหม่", element: "ดิน", digits: ["0", "3", "7"], emoji: "🪦", luck: "ต่ำ" },
  { id: "school", label: "โรงเรียน", aliases: ["โรงเรียน", "มหาวิทยาลัย", "ห้องเรียน"], category: "สถานที่", meaning: "บทเรียน การพัฒนาตัวเอง และเรื่องที่ต้องเรียนรู้", element: "ลม", digits: ["2", "1", "6"], emoji: "🏫", luck: "กลาง" },
  { id: "gold", label: "ทอง", aliases: ["ทองคำ", "ทองแท่ง", "สร้อยทอง", "ทอง"], category: "วัตถุ", meaning: "คุณค่า โอกาสทางการเงิน และสิ่งสำคัญที่ถูกค้นพบ", element: "ทอง", digits: ["2", "5", "3"], emoji: "🪙", luck: "สูง" },
  { id: "money", label: "เงิน", aliases: ["เงินทอง", "ธนบัตร", "เหรียญเงิน", "เงิน"], category: "วัตถุ", meaning: "ทรัพยากร ผลตอบแทน และความมั่นคงทางการเงิน", element: "ทอง", digits: ["2", "4", "9"], emoji: "💰", luck: "สูง" },
  { id: "ring", label: "แหวน", aliases: ["แหวนทอง", "แหวนเพชร", "แหวน"], category: "วัตถุ", meaning: "คำมั่น ความสัมพันธ์ และข้อตกลงสำคัญ", element: "ทอง", digits: ["0", "9", "5"], emoji: "💍", luck: "สูง" },
  { id: "lottery", label: "สลาก", aliases: ["ลอตเตอรี่", "สลากกินแบ่ง", "สลาก", "หวย"], category: "วัตถุ", meaning: "ความหวังต่อโอกาสและการตัดสินใจที่ควรมีขอบเขต", element: "ทอง", digits: ["6", "4", "1"], emoji: "🎟️", luck: "กลาง" },
  { id: "car", label: "รถ", aliases: ["รถยนต์", "รถเก๋ง", "รถกระบะ", "รถ"], category: "ยานพาหนะ", meaning: "ทิศทางชีวิต การควบคุม และการเดินหน้า", element: "ไฟ", digits: ["4", "1", "8"], emoji: "🚗", luck: "กลาง" },
  { id: "train", label: "รถไฟ", aliases: ["ขบวนรถไฟ", "รถไฟ"], category: "พาหนะ", meaning: "เส้นทางที่มีแบบแผน การเดินทาง และเป้าหมายระยะไกล", element: "ไฟ", digits: ["4", "7", "2"], emoji: "🚆", luck: "กลาง" },
  { id: "airplane", label: "เครื่องบิน", aliases: ["เครื่องบิน", "เฮลิคอปเตอร์"], category: "พาหนะ", meaning: "การเดินทางไกล ความก้าวหน้า และมุมมองใหม่", element: "ลม", digits: ["1", "6", "3"], emoji: "✈️", luck: "กลาง" },
  { id: "wedding", label: "งานแต่งงาน", aliases: ["งานแต่งงาน", "งานแต่ง", "แต่งงาน"], category: "เหตุการณ์", meaning: "การรวมกัน ข้อตกลง และบทใหม่ของความสัมพันธ์", element: "ทอง", digits: ["0", "9", "6"], emoji: "💒", luck: "สูง" },
  { id: "ghost", label: "ผี", aliases: ["วิญญาณ", "ผี", "สัมภเวสี"], category: "ลี้ลับ", meaning: "ความกลัว เรื่องค้างคา และสิ่งที่ยังไม่ได้เผชิญ", element: "ลม", digits: ["1", "3", "9"], emoji: "👻", luck: "กลาง" },
  { id: "blood", label: "เลือด", aliases: ["เลือดไหล", "เลือด", "โลหิต"], category: "ร่างกาย", meaning: "พลังชีวิต ความผูกพัน และอารมณ์ที่เข้มข้น", element: "ไฟ", digits: ["5", "6", "2"], emoji: "🩸", luck: "กลาง" },
  { id: "teeth", label: "ฟันหลุด", aliases: ["ฟันหลุด", "ฟันหัก", "ฟันร่วง"], category: "ร่างกาย", meaning: "ความกังวลต่อการเปลี่ยนแปลง คนใกล้ตัว หรือภาพลักษณ์", element: "ดิน", digits: ["3", "1", "0"], emoji: "🦷", luck: "ต่ำ" },
] satisfies readonly DreamKnowledgeSeed[];

export const dreamKnowledge: readonly DreamKnowledgeEntry[] = [...dreamKnowledgeSeeds, ...expandedDreamKnowledgeSeeds].map((entry) => ({
  ...entry,
  source: dreamKnowledgeSource,
  sourceUrl: dreamKnowledgeSourceUrl,
  reviewStatus: "ตรวจรูปแบบแล้ว",
}));

export const dreamKnowledgeStats = {
  symbols: dreamKnowledge.length,
  aliases: new Set(dreamKnowledge.flatMap((entry) => entry.aliases.map((alias) => alias.normalize("NFC").toLocaleLowerCase("th-TH").trim()))).size,
  categories: new Set(dreamKnowledge.map((entry) => entry.category)).size,
} as const;
