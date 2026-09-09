import { CommunityPage } from "@/components/community/community-page";
import { ProductShell } from "@/components/product-shell";
import { requireUser } from "@/lib/require-user";
export const dynamic="force-dynamic";
export default async function Page(){const user=await requireUser();return <ProductShell title="ชุมชนตีเลข" subtitle="แชร์ความฝันและชุดเลข พร้อมระบบรายงาน"><CommunityPage userId={user.id}/></ProductShell>;}
