import { AnalysisPage } from "@/components/analysis/analysis-page";
import { ProductShell } from "@/components/product-shell";
import { requireUser } from "@/lib/require-user";
export const dynamic = "force-dynamic";
export default async function Page() { await requireUser(); return <ProductShell title="วิเคราะห์งวดหน้า" subtitle="คณิตศาสตร์จากผลทางการย้อนหลัง พร้อมบอกขนาดชุดข้อมูล"><AnalysisPage /></ProductShell>; }
