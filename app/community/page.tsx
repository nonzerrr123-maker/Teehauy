import { CommunityPage } from "@/components/community/community-page";
import { ProductShell } from "@/components/product-shell";
import { requireUser } from "@/lib/require-user";
export const dynamic="force-dynamic";
export default async function Page(){const user=await requireUser();return <ProductShell userId={user.id} title="ชุมชน" subtitle="พื้นที่แชร์ความฝันและชุดเลข"><CommunityPage userId={user.id}/></ProductShell>;}
