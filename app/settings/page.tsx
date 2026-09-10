import { ProductShell } from "@/components/product-shell";
import { SettingsPage } from "@/components/profile/settings-page";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";
export default async function Page() { const user = await requireUser(); return <ProductShell userId={user.id} backHref="/profile" title="การตั้งค่า" subtitle="บัญชี การแจ้งเตือน และข้อมูลส่วนตัว"><SettingsPage userId={user.id} /></ProductShell>; }
