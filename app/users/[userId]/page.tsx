import { PublicProfilePage } from "@/components/profile/public-profile-page";
import { ProductShell } from "@/components/product-shell";
import { requireUser } from "@/lib/require-user";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ userId: string }> }) {
  const [viewer, { userId }] = await Promise.all([requireUser(), params]);
  return (
    <ProductShell userId={viewer.id} title="โปรไฟล์สมาชิก" subtitle="เลขและความฝันที่เจ้าของเลือกแชร์" backHref="/community">
      <PublicProfilePage viewerId={viewer.id} profileUserId={userId} />
    </ProductShell>
  );
}
