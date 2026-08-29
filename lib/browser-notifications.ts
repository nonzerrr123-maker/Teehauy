export type BrowserNotificationStatus = "checking" | "unsupported" | "default" | "granted" | "denied";

export function getNotificationStatus(): BrowserNotificationStatus {
  if (typeof window === "undefined") return "checking";
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

export async function requestNotificationPermission(): Promise<BrowserNotificationStatus> {
  if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";

  try {
    return await Notification.requestPermission();
  } catch {
    return getNotificationStatus();
  }
}

export function showTestNotification(): boolean {
  if (typeof window === "undefined" || !("Notification" in window) || Notification.permission !== "granted") {
    return false;
  }

  try {
    new Notification("Teehauy พร้อมแจ้งเตือน ✦", {
      body: "นี่คือการทดสอบแจ้งเตือนจากเบราว์เซอร์ของคุณ",
      tag: "teehauy-notification-test",
    });
    return true;
  } catch {
    return false;
  }
}
