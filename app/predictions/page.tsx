import { PredictionsPage } from "@/components/predictions/predictions-page";
import { ProductShell } from "@/components/product-shell";
import { requireUser } from "@/lib/require-user";
export const dynamic = "force-dynamic";
export default async function Page() { await requireUser(); return <ProductShell title="เลขที่ฉันตี" subtitle="บันทึกตามงวด แล้วรอตรวจผลจริง"><PredictionsPage /></ProductShell>; }
