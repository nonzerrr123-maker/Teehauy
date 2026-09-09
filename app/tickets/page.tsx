import { ProductShell } from "@/components/product-shell";
import { TicketsPage } from "@/components/tickets/tickets-page";
import { requireUser } from "@/lib/require-user";
export const dynamic = "force-dynamic";
export default async function Page() { const user=await requireUser(); return <ProductShell title="สลากของฉัน" subtitle="สลากจริงและรางวัล แยกจากเลขทำนาย"><TicketsPage userId={user.id} /></ProductShell>; }
