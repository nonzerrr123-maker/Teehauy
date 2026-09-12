import { StatsPage, type StatsTab } from "@/components/dream/stats-page";
import { ProductShell } from "@/components/product-shell";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ tab?: string | string[] }> }) {
  const user = await requireUser();
  const tabParam = (await searchParams).tab;
  const tab = typeof tabParam === "string" && ["results", "charts", "analysis"].includes(tabParam) ? tabParam as StatsTab : "results";
  return <ProductShell userId={user.id} backHref="/" title="สถิติผลรางวัล" subtitle="ผลย้อนหลัง กราฟสถิติ และแบบจำลองงวดหน้า"><StatsPage initialTab={tab} restoreSavedTab={!tabParam} /></ProductShell>;
}
