import { AccountPage } from "@/components/profile/profile-page";
import { ProductShell } from "@/components/product-shell";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";
export default async function Page() { const user = await requireUser(); return <ProductShell userId={user.id} title="โปรไฟล์" subtitle="ตัวตนและผลงานของคุณ"><AccountPage userId={user.id} /></ProductShell>; }
