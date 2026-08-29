"use client";

import { useEffect, useState } from "react";

export function ProfilePage({ historyCount, favoriteCount }: { historyCount: number; favoriteCount: number }) {
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
    const timer = window.setTimeout(() => {
      const savedName = localStorage.getItem("teehauy:name");
      const savedNotifications = localStorage.getItem("teehauy:notifications");
      if (savedName) setName(savedName);
      if (savedNotifications) {
        try {
          setNotifications(JSON.parse(savedNotifications) as Record<string, boolean>);
        } catch {
          // Keep defaults when old local data is malformed.
        }
      }
    }, 0);

    return () => window.clearTimeout(timer);
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
      <header className="shrink-0 px-5 pb-4 pt-10">
        <h1 className="gold-text font-[Cinzel] text-xl font-bold">โปรไฟล์</h1>
      </header>

      <div className="scroll-area flex-1 px-5 pb-5">
        <div className="mb-5 flex flex-col items-center pt-1">
          <div className="gold-card mb-3 flex h-20 w-20 items-center justify-center rounded-full text-4xl">🔮</div>
          {editing ? (
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value)}
              onBlur={saveName}
              onKeyDown={(event) => event.key === "Enter" && saveName()}
              className="w-44 border-b border-[#c9a84c66] bg-transparent pb-1 text-center text-lg font-bold text-[#d4e0ee] outline-none"
            />
          ) : (
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-[#d4e0ee]">{name}</h2>
              <button type="button" onClick={() => setEditing(true)} className="rounded-lg border border-[#a8b8cc22] px-2 py-0.5 text-xs text-[#6b7585]">
                แก้ไข
              </button>
            </div>
          )}
          <p className="mt-1 text-xs text-[#4a5060]">นักทำนายแห่งโชคชะตา</p>
        </div>

        <div className="glass-card mb-5 grid grid-cols-3 gap-2 rounded-2xl p-3 text-center">
          <ProfileStat label="ตีเลขแล้ว" value={historyCount} unit="ครั้ง" />
          <ProfileStat label="รายการโปรด" value={favoriteCount} unit="รายการ" />
          <ProfileStat label="เวอร์ชัน" value="1.1" unit="API" />
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
              <button
                type="button"
                aria-label={item.label}
                data-on={notifications[item.id]}
                onClick={() => updateNotification(item.id)}
                className="toggle"
              >
                <span className="toggle-knob block" />
              </button>
            </div>
          ))}
        </div>

        <h2 className="mb-2 font-[Cinzel] text-[11px] font-semibold uppercase tracking-[.18em] text-[#a8b8cc]">ตั้งค่า</h2>
        <div className="divide-y divide-[#a8b8cc0f]">
          {["🌙  ธีมกลางคืน · เปิดใช้งาน", "🗣️  ภาษา · ไทย", "📋  แหล่งผลสถิติ · รอเชื่อม", "🔒  นโยบายความเป็นส่วนตัว", "ℹ️  เกี่ยวกับ Teehauy · 1.1.0"].map((item) => (
            <div key={item} className="flex items-center justify-between px-1 py-3 text-sm text-[#a8b8cc]">
              <span>{item}</span><span className="text-[#333847]">›</span>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-[10px] leading-4 text-[#3f4554]">
          ตีเลขฝันเป็นเครื่องมือเพื่อความบันเทิง โปรดใช้วิจารณญาณและไม่ใช้ผลลัพธ์เป็นการรับประกันการถูกรางวัล
        </p>
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
