import { DreamLibraryPage } from "@/components/dream/dream-library-page";
import { ProductShell } from "@/components/product-shell";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";
export default async function Page() { const user = await requireUser(); return <ProductShell userId={user.id} title="คลังฝัน" subtitle="ค้นหาความหมายและย้อนดูความฝันของคุณ"><DreamLibraryPage /></ProductShell>; }
