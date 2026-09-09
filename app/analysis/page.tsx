import { AnalysisPage } from "@/components/analysis/analysis-page";
import { ProductShell } from "@/components/product-shell";
import { requireUser } from "@/lib/require-user";
export const dynamic = "force-dynamic";
export default async function Page() { const user=await requireUser(); return <ProductShell userId={user.id} backHref="/" title="วิเคราะห์งวดหน้า" subtitle="แบบจำลองจากผลทางการย้อนหลัง ไม่ใช่การรับประกัน"><AnalysisPage /></ProductShell>; }
