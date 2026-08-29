"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

type Tab = "home" | "dictionary" | "history" | "stats" | "profile";
type NumberItem = { label: string; value: string; type: string };
type DreamResult = {
  dreamText: string;
  numbers: NumberItem[];
  meaning: string;
  luckyElement: string;
  date: string;
};
type DreamEntry = {
  emoji: string;
  name: string;
  category: string;
  numbers: string;
  meaning: string;
  luck: "สูง" | "กลาง" | "ต่ำ";
};

const quickCategories = [
  { emoji: "🐍", label: "งู", desc: "งูและสัตว์เลื้อยคลาน" },
  { emoji: "🐟", label: "ปลา", desc: "ปลาและสัตว์น้ำ" },
  { emoji: "🌊", label: "น้ำ", desc: "น้ำ ทะเล แม่น้ำ" },
  { emoji: "🐘", label: "ช้าง", desc: "ช้างและสัตว์ใหญ่" },
  { emoji: "🔥", label: "ไฟ", desc: "ไฟและแสงสว่าง" },
  { emoji: "🌙", label: "ดาว", desc: "ดาวและท้องฟ้า" },
  { emoji: "💰", label: "ทอง", desc: "ทองคำและสมบัติ" },
  { emoji: "🌺", label: "ดอกไม้", desc: "ดอกไม้และสวน" },
];

const dictionaryEntries: DreamEntry[] = [
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

const sampleLotteryData = [
  { date: "01 ส.ค.", first: "593174", top: "74", bottom: "47" },
  { date: "16 ส.ค.", first: "827459", top: "59", bottom: "95" },
  { date: "01 ก.ค.", first: "341862", top: "62", bottom: "26" },
  { date: "16 ก.ค.", first: "905237", top: "37", bottom: "73" },
  { date: "01 มิ.ย.", first: "764823", top: "23", bottom: "32" },
  { date: "16 มิ.ย.", first: "128456", top: "56", bottom: "65" },
];

const digitFrequency = [
  { digit: "0", count: 18 }, { digit: "1", count: 22 }, { digit: "2", count: 19 },
  { digit: "3", count: 25 }, { digit: "4", count: 21 }, { digit: "5", count: 30 },
  { digit: "6", count: 17 }, { digit: "7", count: 28 }, { digit: "8", count: 23 },
  { digit: "9", count: 15 },
];

const defaultHistory: DreamResult[] = [
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

const interpretations: { key: string; numbers: NumberItem[]; meaning: string; element: string }[] = [
  { key: "งู", numbers: nums("74", "47", "749", "7, 4, 9"), meaning: "งูในฝันบ่งชี้ถึงการเปลี่ยนแปลงและโชคลาภที่ซ่อนอยู่ เลข 7 เป็นตัวนำโชค", element: "ทอง" },
  { key: "ปลา", numbers: nums("56", "65", "566", "5, 6, 1"), meaning: "ปลาในฝันสื่อถึงความอุดมสมบูรณ์ ความสำเร็จ และเงินทองที่ไหลมาเทมา", element: "น้ำ" },
  { key: "น้ำ", numbers: nums("19", "91", "196", "1, 9, 6"), meaning: "น้ำในฝันเป็นสัญลักษณ์ของการชำระล้าง การเริ่มต้นใหม่ และโอกาสที่กำลังมาถึง", element: "น้ำ" },
  { key: "ช้าง", numbers: nums("35", "53", "350", "3, 5, 0"), meaning: "ช้างแทนความยิ่งใหญ่ ความมั่นคง และโชคดีที่ยั่งยืน", element: "ดิน" },
  { key: "วัว", numbers: nums("20", "02", "205", "2, 0, 5"), meaning: "วัวในฝันหมายถึงความขยันและผลตอบแทนจากความพยายาม", element: "ดิน" },
  { key: "ไฟ", numbers: nums("67", "76", "673", "6, 7, 3"), meaning: "ไฟในฝันบ่งบอกถึงพลัง ความกล้า และการเปลี่ยนแปลงครั้งสำคัญ", element: "ไฟ" },
  { key: "ทอง", numbers: nums("25", "52", "253", "2, 5, 3"), meaning: "ทองคำสื่อถึงคุณค่า โอกาสทางการเงิน และสิ่งดีที่กำลังเข้ามา", element: "ทอง" },
  { key: "ดอกไม้", numbers: nums("82", "28", "829", "8, 2, 9"), meaning: "ดอกไม้สื่อถึงความสุข ความสัมพันธ์ที่เบ่งบาน และข่าวดี", element: "ลม" },
  { key: "ดาว", numbers: nums("07", "70", "077", "0, 7, 9"), meaning: "ดาวสื่อถึงความหวัง เป้าหมาย และเส้นทางใหม่ที่กำลังเปิดขึ้น", element: "ลม" },
];

function nums(top: string, bottom: string, three: string, run: string): NumberItem[] {
  return [
    { label: "สองตัวบน", value: top, type: "2top" },
    { label: "สองตัวล่าง", value: bottom, type: "2bot" },
    { label: "สามตัวบน", value: three, type: "3top" },
    { label: "วิ่งบน", value: run, type: "run" },
  ];
}

function interpretDream(dreamText: string): DreamResult {
  const matched = interpretations.find((item) => dreamText.includes(item.key));
  const fallback = {
    numbers: nums("89", "98", "893", "8, 9, 3"),
    meaning: "ความฝันของคุณสื่อถึงจังหวะของการเปลี่ยนแปลงและโอกาสใหม่ ลองใช้ผลนี้เป็นแรงบันดาลใจอย่างมีสติ",
    element: "ไฟ",
  };
  const data = matched ?? fallback;
  return {
    dreamText,
    numbers: data.numbers,
    meaning: data.meaning,
    luckyElement: data.element,
    date: new Date().toISOString().slice(0, 10),
  };
}

const navItems: { id: Tab; icon: string; label: string }[] = [
  { id: "home", icon: "✦", label: "หน้าหลัก" },
  { id: "dictionary", icon: "☽", label: "คลังฝัน" },
  { id: "history", icon: "◈", label: "ประวัติ" },
  { id: "stats", icon: "◎", label: "สถิติ" },
  { id: "profile", icon: "◉", label: "โปรไฟล์" },
];

export default function DreamApp() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [showResults, setShowResults] = useState(false);
  const [currentResult, setCurrentResult] = useState<DreamResult | null>(null);
  const [savedResults, setSavedResults] = useState<DreamResult[]>(defaultHistory);
  const [favorites, setFavorites] = useState<DreamResult[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const history = localStorage.getItem("teehauy:history");
      const favs = localStorage.getItem("teehauy:favorites");
      if (history) setSavedResults(JSON.parse(history) as DreamResult[]);
      if (favs) setFavorites(JSON.parse(favs) as DreamResult[]);
    } catch {
      // Ignore invalid local prototype data and keep defaults.
    } finally {
      setHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("teehauy:history", JSON.stringify(savedResults));
  }, [hydrated, savedResults]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("teehauy:favorites", JSON.stringify(favorites));
  }, [favorites, hydrated]);

  const handleInterpret = useCallback((dreamText: string) => {
    const result = interpretDream(dreamText);
    setCurrentResult(result);
    setShowResults(true);
    setSavedResults((prev) => [result, ...prev].slice(0, 30));
  }, []);

  const toggleFavorite = useCallback((result: DreamResult) => {
    setFavorites((prev) => {
      const exists = prev.some((item) => item.dreamText === result.dreamText && item.date === result.date);
      return exists
        ? prev.filter((item) => !(item.dreamText === result.dreamText && item.date === result.date))
        : [result, ...prev];
    });
  }, []);

  const isFavorite = useCallback(
    (result: DreamResult) => favorites.some((item) => item.dreamText === result.dreamText && item.date === result.date),
    [favorites],
  );

  return (
    <div className="app-shell">
      <StarsBackground />
      <div className="relative z-10 min-h-0 flex-1 overflow-hidden">
        {activeTab === "home" && !showResults && <HomePage onInterpret={handleInterpret} />}
        {activeTab === "home" && showResults && currentResult && (
          <ResultsPage
            result={currentResult}
            favorite={isFavorite(currentResult)}
            onFavorite={() => toggleFavorite(currentResult)}
            onBack={() => setShowResults(false)}
          />
        )}
        {activeTab === "dictionary" && <DictionaryPage onInterpret={(text) => { setActiveTab("home"); handleInterpret(text); }} />}
        {activeTab === "history" && (
          <HistoryPage
            results={savedResults}
            favorites={favorites}
            isFavorite={isFavorite}
            onFavorite={toggleFavorite}
            onInterpret={(text) => { setActiveTab("home"); handleInterpret(text); }}
          />
        )}
        {activeTab === "stats" && <StatsPage />}
        {activeTab === "profile" && <ProfilePage historyCount={savedResults.length} favoriteCount={favorites.length} />}
      </div>

      <nav className="bottom-nav">
        <div className="flex items-center justify-around px-2 py-2.5">
          {navItems.map((item) => {
            const active = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                data-active={active}
                className="nav-item relative flex min-w-[58px] flex-col items-center gap-1 rounded-xl px-1 py-1.5"
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id !== "home") setShowResults(false);
                }}
              >
                <span className="text-xl leading-none">{item.icon}</span>
                <span className="text-[10px] font-medium">{item.label}</span>
                <span className="h-1">{active ? <span className="nav-dot block" /> : null}</span>
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function StarsBackground() {
  const stars = useMemo(
    () => Array.from({ length: 54 }, (_, i) => ({
      id: i,
      x: (i * 37 + 11) % 100,
      y: (i * 61 + 7) % 100,
      size: i % 8 === 0 ? 2.2 : i % 3 === 0 ? 1.5 : 1,
      delay: `${(i % 10) * 0.42}s`,
      duration: `${3 + (i % 5) * 0.65}s`,
    })),
    [],
  );

  return (
    <div className="stars-bg" aria-hidden="true">
      {stars.map((star) => (
        <span
          key={star.id}
          className="star"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: star.size,
            height: star.size,
            background: star.size > 2 ? "rgba(240,192,64,.75)" : "rgba(212,224,238,.5)",
            ["--delay" as string]: star.delay,
            ["--duration" as string]: star.duration,
          }}
        />
      ))}
    </div>
  );
}

function PageHeader({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return (
    <header className="shrink-0 px-5 pb-4 pt-10 text-center">
      {eyebrow ? <p className="mb-1 font-[Cinzel] text-[10px] uppercase tracking-[.3em] text-[#6b7585]">{eyebrow}</p> : null}
      <h1 className="gold-text font-[Cinzel] text-2xl font-bold">{title}</h1>
      {subtitle ? <p className="mt-1 text-xs text-[#6b7585]">{subtitle}</p> : null}
    </header>
  );
}

function HomePage({ onInterpret }: { onInterpret: (text: string) => void }) {
  const [dreamText, setDreamText] = useState("");
  const valid = dreamText.trim().length >= 2;

  return (
    <section className="fade-up flex h-full flex-col">
      <PageHeader eyebrow="เปิดเผยโชคชะตา" title="ตีเลขฝัน" subtitle="เล่าความฝันของคุณ · เราจะตีเลขให้" />
      <div className="scroll-area flex-1 px-5 pb-5">
        <div className="mb-5 flex items-center gap-3">
          <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#c9a84c44]" />
          <span className="text-[9px] text-[#c9a84c99]">◆ ◆ ◆</span>
          <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#c9a84c44]" />
        </div>

        <label className="mb-2.5 block font-[Cinzel] text-[11px] font-semibold uppercase tracking-[.18em] text-[#a8b8cc]">เล่าความฝันของคุณ</label>
        <div className="glass-card mb-4 overflow-hidden rounded-2xl focus-within:border-[#c9a84c77] focus-within:shadow-[0_0_28px_rgba(201,168,76,.1)]">
          <textarea
            value={dreamText}
            maxLength={300}
            rows={5}
            onChange={(event) => setDreamText(event.target.value)}
            placeholder="เช่น ฝันเห็นงูใหญ่สีทองขดอยู่ในบ้าน บินได้สูงมาก..."
            className="w-full resize-none bg-transparent px-4 pb-3 pt-4 text-[15px] leading-relaxed text-[#d4e0ee] outline-none placeholder:text-[#4a5060]"
          />
          <div className="flex items-center justify-between px-4 pb-3 text-xs text-[#4a5060]">
            <span>{dreamText.length} / 300 ตัวอักษร</span>
            {dreamText ? (
              <button type="button" onClick={() => setDreamText("")} className="rounded-full border border-[#6b758544] px-2 py-0.5 text-[#6b7585]">ล้าง</button>
            ) : null}
          </div>
        </div>

        <button type="button" disabled={!valid} onClick={() => onInterpret(dreamText.trim())} className="gold-button mb-6 w-full rounded-2xl py-4 font-[Cinzel] text-lg font-bold tracking-[.12em]">
          ✦ ตีเลขเดี๋ยวนี้ ✦
        </button>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[Cinzel] text-[11px] font-semibold uppercase tracking-[.18em] text-[#a8b8cc]">หมวดฝันยอดนิยม</h2>
          <span className="text-[11px] text-[#5c6474]">แตะเพื่อตีเลข</span>
        </div>
        <div className="grid grid-cols-4 gap-2.5">
          {quickCategories.map((item) => (
            <button
              key={item.label}
              type="button"
              title={item.desc}
              onClick={() => onInterpret(`ฝันเห็น${item.label}`)}
              className="category-card flex flex-col items-center gap-1.5 rounded-xl py-3"
            >
              <span className="text-xl">{item.emoji}</span>
              <span className="text-xs font-medium text-[#a8b8cc]">{item.label}</span>
            </button>
          ))}
        </div>
        <p className="mt-7 text-center font-[Cinzel] text-[9px] uppercase tracking-[.22em] text-[#292a38]">◆ เส้นทางแห่งโชคชะตา ◆</p>
      </div>
    </section>
  );
}

function ResultsPage({ result, favorite, onFavorite, onBack }: { result: DreamResult; favorite: boolean; onFavorite: () => void; onBack: () => void }) {
  const elementStyle: Record<string, string> = {
    ทอง: "border-[#c9a84c66] bg-[#c9a84c18] text-[#f0c040]",
    น้ำ: "border-[#58a6ff66] bg-[#58a6ff18] text-[#80c0ff]",
    ไฟ: "border-[#ff806066] bg-[#ff806018] text-[#ff8060]",
    ดิน: "border-[#c0906066] bg-[#c0906018] text-[#c09060]",
    ลม: "border-[#80d0c066] bg-[#80d0c018] text-[#80d0c0]",
  };

  const share = async () => {
    const text = `🔮 ตีเลขจากความฝัน\n“${result.dreamText}”\n\n${result.numbers.map((item) => `${item.label}: ${item.value}`).join(" · ")}\n\n#ตีเลขฝัน`;
    try {
      if (navigator.share) await navigator.share({ text });
      else await navigator.clipboard.writeText(text);
    } catch {
      // Sharing can be cancelled by the user.
    }
  };

  return (
    <section className="fade-up flex h-full flex-col">
      <div className="flex shrink-0 items-center justify-between px-5 pb-4 pt-10">
        <button type="button" onClick={onBack} className="glass-card rounded-xl px-3 py-2 text-sm text-[#a8b8cc]">← กลับ</button>
        <h1 className="gold-text font-[Cinzel] text-sm font-semibold">ผลการตีเลข</h1>
        <button type="button" onClick={onFavorite} aria-label="favorite" className="glass-card flex h-10 w-10 items-center justify-center rounded-xl text-lg text-[#f0c040]">{favorite ? "★" : "☆"}</button>
      </div>
      <div className="scroll-area flex-1 px-5 pb-5">
        <div className="glass-card mb-5 rounded-2xl p-4">
          <p className="mb-2 font-[Cinzel] text-[10px] uppercase tracking-[.18em] text-[#6b7585]">ความฝันของคุณ</p>
          <p className="text-sm leading-relaxed text-[#c8d4e0]">“{result.dreamText}”</p>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[Cinzel] text-[11px] font-semibold uppercase tracking-[.18em] text-[#a8b8cc]">เลขมงคล</h2>
          <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${elementStyle[result.luckyElement] ?? elementStyle.ทอง}`}>ธาตุ{result.luckyElement}</span>
        </div>
        <div className="mb-3 grid grid-cols-2 gap-3">
          {result.numbers.slice(0, 2).map((item) => (
            <div key={item.type} className="gold-card number-reveal rounded-2xl p-4 text-center">
              <p className="mb-1 text-[10px] uppercase tracking-[.16em] text-[#8c96a7]">{item.label}</p>
              <p className="gold-text font-[Cinzel] text-4xl font-black tracking-[.12em]">{item.value}</p>
            </div>
          ))}
        </div>
        <div className="mb-5 grid grid-cols-2 gap-3">
          {result.numbers.slice(2).map((item) => (
            <div key={item.type} className="glass-card rounded-2xl px-4 py-3 text-center">
              <p className="text-[10px] text-[#6b7585]">{item.label}</p>
              <p className="mt-1 font-[Cinzel] text-xl font-bold text-[#d9c678]">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="glass-card mb-4 rounded-2xl p-4">
          <p className="mb-2 text-xs font-semibold text-[#c9a84c]">✦ คำตีความ</p>
          <p className="text-sm leading-6 text-[#aebaca]">{result.meaning}</p>
        </div>
        <button type="button" onClick={share} className="w-full rounded-2xl border border-[#c9a84c44] bg-[#c9a84c10] py-3.5 text-sm font-semibold text-[#d9c678]">↗ แชร์ผลการตีเลข</button>
        <p className="mt-4 text-center text-[10px] leading-4 text-[#464c5b]">ผลการตีเลขเป็นคอนเทนต์เพื่อความบันเทิง ไม่ใช่การรับประกันผลรางวัล</p>
      </div>
    </section>
  );
}

function DictionaryPage({ onInterpret }: { onInterpret: (text: string) => void }) {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("ทั้งหมด");
  const [expanded, setExpanded] = useState<string | null>(null);
  const categories = useMemo(() => ["ทั้งหมด", ...Array.from(new Set(dictionaryEntries.map((item) => item.category)))], []);
  const filtered = useMemo(
    () => dictionaryEntries.filter((item) =>
      (category === "ทั้งหมด" || item.category === category) &&
      (!search || `${item.name} ${item.meaning} ${item.numbers}`.includes(search.trim())),
    ),
    [category, search],
  );

  return (
    <section className="fade-up flex h-full flex-col">
      <PageHeader title="คลังฝัน" subtitle="ค้นหาความหมายและเลขจากสัญลักษณ์ในฝัน" />
      <div className="scroll-area flex-1 px-5 pb-5">
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="ค้นหา เช่น งู, น้ำ, 74..." className="glass-card mb-3 w-full rounded-2xl px-4 py-3 text-sm text-[#d4e0ee] outline-none placeholder:text-[#4a5060]" />
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <button key={item} type="button" data-active={category === item} onClick={() => setCategory(item)} className="chip shrink-0 rounded-full px-3 py-1.5 text-xs">{item}</button>
          ))}
        </div>
        <div className="flex flex-col gap-2.5">
          {filtered.map((item) => {
            const open = expanded === item.name;
            const luckClass = item.luck === "สูง" ? "text-[#f0c040]" : item.luck === "กลาง" ? "text-[#a8b8cc]" : "text-[#6b7585]";
            return (
              <div key={item.name} className="glass-card overflow-hidden rounded-2xl">
                <button type="button" onClick={() => setExpanded(open ? null : item.name)} className="flex w-full items-center gap-3 p-3.5 text-left">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#222235] text-xl">{item.emoji}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <strong className="text-sm text-[#d4e0ee]">{item.name}</strong>
                      <span className={`text-[10px] ${luckClass}`}>โชค{item.luck}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-[#6b7585]">{item.meaning}</span>
                  </span>
                  <span className="text-xs text-[#4a5060]">{open ? "⌃" : "⌄"}</span>
                </button>
                {open ? (
                  <div className="border-t border-[#a8b8cc12] px-4 pb-4 pt-3">
                    <p className="text-xs leading-5 text-[#a8b8cc]">{item.meaning}</p>
                    <div className="mt-3 flex items-center justify-between rounded-xl bg-[#06060c66] px-3 py-2.5">
                      <span className="font-[Cinzel] text-base font-bold text-[#f0c040]">{item.numbers}</span>
                      <button type="button" onClick={() => onInterpret(`ฝันเห็น${item.name}`)} className="rounded-lg border border-[#c9a84c44] px-2.5 py-1.5 text-[11px] text-[#d9c678]">ตีเลขนี้</button>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
          {!filtered.length ? <div className="py-16 text-center text-sm text-[#596071]">ไม่พบคำในคลังฝัน</div> : null}
        </div>
      </div>
    </section>
  );
}

function HistoryPage({ results, favorites, isFavorite, onFavorite, onInterpret }: {
  results: DreamResult[];
  favorites: DreamResult[];
  isFavorite: (result: DreamResult) => boolean;
  onFavorite: (result: DreamResult) => void;
  onInterpret: (text: string) => void;
}) {
  const [view, setView] = useState<"history" | "favorites">("history");
  const list = view === "history" ? results : favorites;

  return (
    <section className="fade-up flex h-full flex-col">
      <header className="shrink-0 px-5 pb-4 pt-10">
        <h1 className="gold-text mb-4 font-[Cinzel] text-xl font-bold">{view === "history" ? "ประวัติของฉัน" : "รายการโปรด"}</h1>
        <div className="segmented flex rounded-xl p-1">
          <button type="button" data-active={view === "history"} onClick={() => setView("history")} className="flex-1 rounded-lg border border-transparent py-2 text-sm text-[#6b7585]">⏱ ประวัติ</button>
          <button type="button" data-active={view === "favorites"} onClick={() => setView("favorites")} className="flex-1 rounded-lg border border-transparent py-2 text-sm text-[#6b7585]">★ รายการโปรด</button>
        </div>
      </header>
      <div className="scroll-area flex-1 px-5 pb-5">
        {!list.length ? (
          <div className="flex flex-col items-center py-20 text-center">
            <span className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[#1a1a2a] text-2xl">{view === "history" ? "📖" : "★"}</span>
            <p className="text-sm text-[#a8b8cc]">{view === "history" ? "ยังไม่มีประวัติ" : "ยังไม่มีรายการโปรด"}</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {list.map((result, index) => (
              <div key={`${result.dreamText}-${result.date}-${index}`} className="glass-card overflow-hidden rounded-2xl">
                <div className="p-4 pb-3">
                  <div className="flex items-start gap-2">
                    <button type="button" onClick={() => onInterpret(result.dreamText)} className="min-w-0 flex-1 text-left">
                      <p className="line-clamp-2 text-sm leading-5 text-[#c8d4e0]">“{result.dreamText}”</p>
                      <p className="mt-1 text-[10px] text-[#4a5060]">{new Date(result.date).toLocaleDateString("th-TH", { day: "numeric", month: "short", year: "numeric" })}</p>
                    </button>
                    <button type="button" onClick={() => onFavorite(result)} className="text-lg text-[#f0c040]">{isFavorite(result) ? "★" : "☆"}</button>
                  </div>
                </div>
                <div className="flex gap-2 border-t border-[#a8b8cc12] bg-[#06060c55] px-4 py-2.5">
                  {result.numbers.slice(0, 3).map((number) => (
                    <span key={number.type} className="rounded-lg bg-[#1a1a2a] px-2.5 py-1 font-[Cinzel] text-xs font-bold text-[#d9c678]">{number.value}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function StatsPage() {
  const [view, setView] = useState<"table" | "chart">("table");
  return (
    <section className="fade-up flex h-full flex-col">
      <header className="shrink-0 px-5 pb-4 pt-10">
        <h1 className="gold-text font-[Cinzel] text-xl font-bold">สถิติหวยย้อนหลัง</h1>
        <p className="mb-4 mt-1 text-xs text-[#6b7585]">ข้อมูลตัวอย่าง 6 งวด · รอเชื่อม API จริง</p>
        <div className="segmented flex rounded-xl p-1">
          <button type="button" data-active={view === "table"} onClick={() => setView("table")} className="flex-1 rounded-lg border border-transparent py-2 text-sm text-[#6b7585]">⊞ ตาราง</button>
          <button type="button" data-active={view === "chart"} onClick={() => setView("chart")} className="flex-1 rounded-lg border border-transparent py-2 text-sm text-[#6b7585]">◎ กราฟ</button>
        </div>
      </header>
      <div className="scroll-area flex-1 px-5 pb-5">
        {view === "table" ? (
          <div className="glass-card mb-5 overflow-hidden rounded-2xl">
            <div className="grid grid-cols-4 border-b border-[#c9a84c22] bg-[#1a1a2acc] px-3 py-2.5 text-center text-[9px] text-[#a8b8cc]">
              <span>งวด</span><span>รางวัลที่ 1</span><span>2 ตัวบน</span><span>2 ตัวล่าง</span>
            </div>
            {sampleLotteryData.map((row) => (
              <div key={row.date} className="grid grid-cols-4 items-center border-b border-[#a8b8cc0d] px-3 py-3 text-center text-xs last:border-0">
                <span className="text-[#6b7585]">{row.date}</span>
                <span className="font-[Cinzel] text-[11px] text-[#c8d4e0]">{row.first}</span>
                <span className="font-[Cinzel] font-bold text-[#f0c040]">{row.top}</span>
                <span className="font-[Cinzel] font-bold text-[#a8b8cc]">{row.bottom}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card mb-5 rounded-2xl p-3 pt-5">
            <p className="mb-4 px-1 text-xs text-[#a8b8cc]">ความถี่ตัวเลขจากชุดข้อมูลตัวอย่าง</p>
            <div className="h-56 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={digitFrequency} margin={{ top: 8, right: 2, left: -25, bottom: 0 }}>
                  <XAxis dataKey="digit" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip cursor={{ fill: "rgba(201,168,76,.06)" }} contentStyle={{ background: "#13131f", border: "1px solid rgba(201,168,76,.3)", borderRadius: 12, color: "#d4e0ee", fontSize: 12 }} />
                  <Bar dataKey="count" fill="#c9a84c" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <StatNumbers title="เลขร้อน" icon="🔥" values={["74", "56", "35", "89", "27", "91"]} />
          <StatNumbers title="เลขเย็น" icon="❄️" values={["03", "68", "14", "50", "82", "37"]} muted />
        </div>
        <p className="mt-4 text-[10px] leading-4 text-[#454b5a]">หมายเหตุ: หน้านี้พอร์ตจาก Figma reference และใช้ข้อมูลตัวอย่างเพื่อทดสอบ UI เท่านั้น ก่อนใช้งานจริงควรเชื่อมแหล่งข้อมูลผลรางวัลที่ตรวจสอบได้</p>
      </div>
    </section>
  );
}

function StatNumbers({ title, icon, values, muted = false }: { title: string; icon: string; values: string[]; muted?: boolean }) {
  return (
    <div className="glass-card rounded-2xl p-3.5">
      <p className="mb-3 text-xs font-semibold text-[#a8b8cc]">{icon} {title}</p>
      <div className="grid grid-cols-3 gap-1.5">
        {values.map((value) => <span key={value} className={`rounded-lg bg-[#06060c66] py-1.5 text-center font-[Cinzel] text-xs font-bold ${muted ? "text-[#7f8999]" : "text-[#f0c040]"}`}>{value}</span>)}
      </div>
    </div>
  );
}

function ProfilePage({ historyCount, favoriteCount }: { historyCount: number; favoriteCount: number }) {
  const [name, setName] = useState("นักตีเลข");
  const [editing, setEditing] = useState(false);
  const [notifications, setNotifications] = useState<Record<string, boolean>>({
    lottery_day: true,
    result: true,
    lucky_tip: false,
    dream_remind: true,
    hot_numbers: false,
  });

  useEffect(() => {
    const savedName = localStorage.getItem("teehauy:name");
    const savedNotifications = localStorage.getItem("teehauy:notifications");
    if (savedName) setName(savedName);
    if (savedNotifications) {
      try { setNotifications(JSON.parse(savedNotifications) as Record<string, boolean>); } catch { /* keep defaults */ }
    }
  }, []);

  const updateNotification = (id: string) => {
    setNotifications((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem("teehauy:notifications", JSON.stringify(next));
      return next;
    });
  };

  const saveName = () => {
    const next = name.trim() || "นักตีเลข";
    setName(next);
    localStorage.setItem("teehauy:name", next);
    setEditing(false);
  };

  const notificationItems = [
    { id: "lottery_day", icon: "🔔", label: "แจ้งเตือนวันงวดหวย", desc: "ก่อนวันออกรางวัล 1 วัน" },
    { id: "result", icon: "🎯", label: "ผลรางวัลออกแล้ว", desc: "เตรียมไว้สำหรับเชื่อมข้อมูลจริง" },
    { id: "lucky_tip", icon: "✨", label: "เคล็ดลับโชคดีรายวัน", desc: "ทุกวันเวลา 07:00 น." },
    { id: "dream_remind", icon: "🌙", label: "เตือนบันทึกความฝัน", desc: "ทุกเช้าเวลา 06:30 น." },
    { id: "hot_numbers", icon: "🔥", label: "เลขร้อนประจำงวด", desc: "7 วันก่อนออกรางวัล" },
  ];

  return (
    <section className="fade-up flex h-full flex-col">
      <header className="shrink-0 px-5 pb-4 pt-10"><h1 className="gold-text font-[Cinzel] text-xl font-bold">โปรไฟล์</h1></header>
      <div className="scroll-area flex-1 px-5 pb-5">
        <div className="mb-5 flex flex-col items-center pt-1">
          <div className="gold-card mb-3 flex h-20 w-20 items-center justify-center rounded-full text-4xl">🔮</div>
          {editing ? (
            <input autoFocus value={name} onChange={(event) => setName(event.target.value)} onBlur={saveName} onKeyDown={(event) => event.key === "Enter" && saveName()} className="w-44 border-b border-[#c9a84c66] bg-transparent pb-1 text-center text-lg font-bold text-[#d4e0ee] outline-none" />
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#d4e0ee]">{name}</h2>
              <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-[#a8b8cc22] px-2 py-0.5 text-xs text-[#6b7585]">แก้ไข</button>
            </div>
          )}
          <p className="mt-1 text-xs text-[#4a5060]">นักทำนายแห่งโชคชะตา</p>
        </div>

        <div className="glass-card mb-5 grid grid-cols-3 gap-2 rounded-2xl p-3 text-center">
          <ProfileStat label="ตีเลขแล้ว" value={historyCount} unit="ครั้ง" />
          <ProfileStat label="รายการโปรด" value={favoriteCount} unit="รายการ" />
          <ProfileStat label="เวอร์ชัน" value="1.0" unit="MVP" />
        </div>

        <h2 className="mb-3 font-[Cinzel] text-[11px] font-semibold uppercase tracking-[.18em] text-[#a8b8cc]">การแจ้งเตือน</h2>
        <div className="mb-6 flex flex-col gap-2">
          {notificationItems.map((item) => (
            <div key={item.id} className="glass-card flex items-center justify-between gap-3 rounded-2xl p-3.5">
              <div className="flex min-w-0 items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#222235]">{item.icon}</span>
                <span className="min-w-0">
                  <strong className="block text-sm font-medium text-[#c8d4e0]">{item.label}</strong>
                  <span className="block truncate text-[11px] text-[#4a5060]">{item.desc}</span>
                </span>
              </div>
              <button type="button" aria-label={item.label} data-on={notifications[item.id]} onClick={() => updateNotification(item.id)} className="toggle"><span className="toggle-knob block" /></button>
            </div>
          ))}
        </div>

        <h2 className="mb-2 font-[Cinzel] text-[11px] font-semibold uppercase tracking-[.18em] text-[#a8b8cc]">ตั้งค่า</h2>
        <div className="divide-y divide-[#a8b8cc0f]">
          {["🌙  ธีมกลางคืน · เปิดใช้งาน", "🗣️  ภาษา · ไทย", "📋  แหล่งผลสถิติ · รอเชื่อม", "🔒  นโยบายความเป็นส่วนตัว", "ℹ️  เกี่ยวกับ Teehauy · 1.0.0"].map((item) => (
            <div key={item} className="flex items-center justify-between px-1 py-3 text-sm text-[#a8b8cc]"><span>{item}</span><span className="text-[#333847]">›</span></div>
          ))}
        </div>
        <p className="mt-6 text-center text-[10px] leading-4 text-[#3f4554]">ตีเลขฝันเป็นเครื่องมือเพื่อความบันเทิง โปรดใช้วิจารณญาณและไม่ใช้ผลลัพธ์เป็นการรับประกันการถูกรางวัล</p>
      </div>
    </section>
  );
}

function ProfileStat({ label, value, unit }: { label: string; value: string | number; unit: string }) {
  return (
    <div>
      <p className="gold-text font-[Cinzel] text-xl font-bold">{value}</p>
      <p className="mt-0.5 text-[9px] text-[#4a5060]">{unit}</p>
      <p className="text-[9px] text-[#6b7585]">{label}</p>
    </div>
  );
}
