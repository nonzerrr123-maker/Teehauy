import { StatsPage } from "@/components/dream/stats-page";
import { ProductShell } from "@/components/product-shell";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export default async function Page() {
  const user = await requireUser();
  return <ProductShell userId={user.id} backHref="/" title="สถิติผลรางวัล" subtitle="ผลทางการย้อนหลังและความถี่ตัวเลข"><StatsPage /></ProductShell>;
}
