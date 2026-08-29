"use client";

import { useEffect, useState } from "react";

import {
  getNotificationStatus,
  requestNotificationPermission,
  showTestNotification,
  type BrowserNotificationStatus,
} from "@/lib/browser-notifications";

type HealthResponse = {
  persistenceMode?: "database" | "local-fallback";
  database?: {
    configured?: boolean;
    reachable?: boolean;
    schemaReady?: boolean;
  };
};

type SystemStatus = "checking" | "database" | "schema-missing" | "database-offline" | "local";

const defaultNotifications: Record<string, boolean> = {
  lottery_day: false,
  result: false,
  lucky_tip: false,
  dream_remind: false,
  hot_numbers: false,
};

export function ProfilePage({ historyCount, favoriteCount }: { historyCount: number; favoriteCount: number }) {
  const [name, setName] = useState("นักตีเลข");
  const [editing, setEditing] = useState(false);
  const [systemStatus, setSystemStatus] = useState<SystemStatus>("checking");
  const [notificationStatus, setNotificationStatus] = useState<BrowserNotificationStatus>("checking");
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const [notifications, setNotifications] = useState<Record<string, boolean>>(defaultNotifications);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const permission = getNotificationStatus();
      setNotificationStatus(permission);

      const savedName = localStorage.getItem("teehauy:name");
      const savedNotifications = localStorage.getItem("teehauy:notifications");
      if (savedName) setName(savedName);
      if (savedNotifications && permission === "granted") {
        try {
          setNotifications({
            ...defaultNotifications,
            ...(JSON.parse(savedNotifications) as Record<string, boolean>),
          });
        } catch {
          // Keep safe defaults when old local data is malformed.
        }
      } else if (permission !== "granted") {
        localStorage.setItem("teehauy:notifications", JSON.stringify(defaultNotifications));
      }

      void fetch("/api/health", { cache: "no-store" })
        .then((response) => response.json() as Promise<HealthResponse>)
        .then((health) => {
          if (health.persistenceMode === "database" && health.database?.schemaReady) {
            setSystemStatus("database");
            return;
          }
          if (!health.database?.configured) {
            setSystemStatus("local");
            return;
          }
          if (!health.database?.reachable) {
            setSystemStatus("database-offline");
            return;
          }
          setSystemStatus("schema-missing");
        })
        .catch(() => setSystemStatus("database-offline"));
    }, 0);

    return () => window.clearTimeout(timer);
  }, []);

  const persistNotifications = (next: Record<string, boolean>) => {
    setNotifications(next);
    localStorage.setItem("teehauy:notifications", JSON.stringify(next));
  };

  const enableBrowserNotifications = async (): Promise<boolean> => {
    const permission = await requestNotificationPermission();
    setNotificationStatus(permission);

    if (permission === "granted") {
      setNotificationMessage("อนุญาตการแจ้งเตือนแล้ว เลือกประเภทที่ต้องการได้เลย");
      return true;
    }

    if (permission === "denied") {
      setNotificationMessage("เบราว์เซอร์บล็อกการแจ้งเตือนอยู่ ต้องเปิดสิทธิ์จากการตั้งค่าเว็บไซต์ก่อน");
    } else if (permission === "unsupported") {
      setNotificationMessage("เบราว์เซอร์นี้ไม่รองรับ Web Notification");
    } else {
      setNotificationMessage("ยังไม่ได้อนุญาตการแจ้งเตือน");
    }
    return false;
  };

  const updateNotification = async (id: string) => {
    const turningOn = !notifications[id];

    if (turningOn && notificationStatus !== "granted") {
      const granted = await enableBrowserNotifications();
      if (!granted) return;
    }

    const next = { ...notifications, [id]: turningOn };
    persistNotifications(next);
    setNotificationMessage(
      turningOn
        ? "บันทึกความต้องการแจ้งเตือนแล้ว ระบบ push ตามเวลาจะเปิดเมื่อ backend scheduler พร้อม"
        : "ปิดความต้องการแจ้งเตือนรายการนี้แล้ว",
    );
  };

  const testNotification = () => {
    const shown = showTestNotification();
    setNotificationMessage(
      shown
        ? "ส่งการแจ้งเตือนทดสอบแล้ว"
        : "ส่งการแจ้งเตือนทดสอบไม่ได้ กรุณาตรวจสิทธิ์ของเบราว์เซอร์",
    );
  };

  const saveName = () => {
    const next = name.trim() || "นักตีเลข";
    setName(next);
    localStorage.setItem("teehauy:name", next);
    setEditing(false);
  };

  const notificationItems = [
    { id: "lottery_day", icon: "🔔", label: "แจ้งเตือนวันงวดหวย", desc: "ต้องการรับการเตือนก่อนวันออกรางวัล" },
    { id: "result", icon: "🎯", label: "ผลรางวัลออกแล้ว", desc: "ต้องการรับการเตือนเมื่อ provider มีผลใหม่" },
    { id: "lucky_tip", icon: "✨", label: "เคล็ดลับโชคดีรายวัน", desc: "ความต้องการรับคอนเทนต์รายวัน" },
    { id: "dream_remind", icon: "🌙", label: "เตือนบันทึกความฝัน", desc: "ความต้องการรับการเตือนช่วงเช้า" },
    { id: "hot_numbers", icon: "🔥", label: "สถิติก่อนวันออกรางวัล", desc: "ความต้องการรับสรุปสถิติก่อนงวด" },
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

        <div className="glass-card mb-3 grid grid-cols-3 gap-2 rounded-2xl p-3 text-center">
          <ProfileStat label="ตีเลขแล้ว" value={historyCount} unit="ครั้ง" />
          <ProfileStat label="รายการโปรด" value={favoriteCount} unit="รายการ" />
          <ProfileStat label="เวอร์ชัน" value="2.1" unit="API" />
        </div>

        <SystemStatusCard status={systemStatus} />

        <h2 className="mb-3 mt-5 font-[Cinzel] text-[11px] font-semibold uppercase tracking-[.18em] text-[#a8b8cc]">การแจ้งเตือน</h2>
        <NotificationPermissionCard
          status={notificationStatus}
          message={notificationMessage}
          onEnable={() => void enableBrowserNotifications()}
          onTest={testNotification}
        />

        <div className="mb-3 mt-3 rounded-xl border border-[#c9a84c22] bg-[#c9a84c0a] px-3 py-2.5 text-[10px] leading-4 text-[#7f8898]">
          ตัวเลือกด้านล่างเป็นความต้องการรับแจ้งเตือน ส่วนการส่งตามเวลาหรือส่งตอนปิดเว็บต้องใช้ Push Service + Scheduler ซึ่งยังอยู่ในขั้น backend ถัดไป
        </div>

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
                onClick={() => void updateNotification(item.id)}
                className="toggle"
              >
                <span className="toggle-knob block" />
              </button>
            </div>
          ))}
        </div>

        <h2 className="mb-2 font-[Cinzel] text-[11px] font-semibold uppercase tracking-[.18em] text-[#a8b8cc]">ตั้งค่า</h2>
        <div className="divide-y divide-[#a8b8cc0f]">
          {["🌙  ธีมกลางคืน · เปิดใช้งาน", "🗣️  ภาษา · ไทย", "📊  สถิติ · Provider API", "🔒  นโยบายความเป็นส่วนตัว", "ℹ️  เกี่ยวกับ Teehauy · 2.1.0"].map((item) => (
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

function NotificationPermissionCard({
  status,
  message,
  onEnable,
  onTest,
}: {
  status: BrowserNotificationStatus;
  message: string | null;
  onEnable: () => void;
  onTest: () => void;
}) {
  const labels: Record<BrowserNotificationStatus, { title: string; description: string; tone: string }> = {
    checking: { title: "กำลังตรวจสิทธิ์แจ้งเตือน", description: "ตรวจสอบความสามารถของเบราว์เซอร์", tone: "text-[#a8b8cc]" },
    unsupported: { title: "ไม่รองรับ Web Notification", description: "อุปกรณ์หรือเบราว์เซอร์นี้ไม่รองรับ", tone: "text-[#ff8060]" },
    default: { title: "ยังไม่ได้อนุญาตแจ้งเตือน", description: "อนุญาตเพื่อทดสอบการแจ้งเตือนจากเว็บ", tone: "text-[#d9c678]" },
    granted: { title: "อนุญาตแจ้งเตือนแล้ว", description: "ทดสอบ Notification จากเบราว์เซอร์ได้", tone: "text-[#80d0c0]" },
    denied: { title: "การแจ้งเตือนถูกบล็อก", description: "เปิดสิทธิ์จากการตั้งค่าเว็บไซต์ของเบราว์เซอร์", tone: "text-[#ff8060]" },
  };
  const item = labels[status];

  return (
    <div className="glass-card rounded-2xl p-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <strong className={`block text-sm ${item.tone}`}>{item.title}</strong>
          <span className="mt-0.5 block text-[11px] leading-4 text-[#596071]">{item.description}</span>
        </div>
        {status === "default" ? (
          <button type="button" onClick={onEnable} className="shrink-0 rounded-xl border border-[#c9a84c44] bg-[#c9a84c10] px-3 py-2 text-[11px] font-semibold text-[#d9c678]">
            อนุญาต
          </button>
        ) : null}
        {status === "granted" ? (
          <button type="button" onClick={onTest} className="shrink-0 rounded-xl border border-[#80d0c044] bg-[#80d0c010] px-3 py-2 text-[11px] font-semibold text-[#80d0c0]">
            ทดสอบ
          </button>
        ) : null}
      </div>
      {message ? <p className="mt-2 border-t border-[#a8b8cc12] pt-2 text-[10px] leading-4 text-[#7f8898]">{message}</p> : null}
    </div>
  );
}

function SystemStatusCard({ status }: { status: SystemStatus }) {
  const content: Record<SystemStatus, { icon: string; title: string; description: string; tone: string }> = {
    checking: { icon: "◌", title: "กำลังตรวจสอบระบบ", description: "กำลังเช็ก API และพื้นที่จัดเก็บข้อมูล", tone: "text-[#a8b8cc]" },
    database: { icon: "✓", title: "Database Sync พร้อม", description: "ประวัติและรายการโปรดกำลังซิงก์กับฐานข้อมูล", tone: "text-[#80d0c0]" },
    local: { icon: "◇", title: "Local Fallback", description: "ยังไม่ได้ตั้ง DATABASE_URL ข้อมูลจึงเก็บในเบราว์เซอร์", tone: "text-[#d9c678]" },
    "schema-missing": { icon: "!", title: "Database ยังไม่พร้อม", description: "เชื่อมฐานได้แล้ว แต่ยังต้อง apply migration schema", tone: "text-[#ffb36b]" },
    "database-offline": { icon: "×", title: "Database ติดต่อไม่ได้", description: "แอปยังทำงานต่อด้วย local fallback", tone: "text-[#ff8060]" },
  };
  const item = content[status];

  return (
    <div className="glass-card flex items-center gap-3 rounded-2xl p-3.5">
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-current bg-[#0d0d18] font-bold ${item.tone}`}>
        {item.icon}
      </span>
      <span className="min-w-0">
        <strong className={`block text-sm ${item.tone}`}>{item.title}</strong>
        <span className="mt-0.5 block text-[11px] leading-4 text-[#596071]">{item.description}</span>
      </span>
    </div>
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
