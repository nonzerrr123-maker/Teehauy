import { redirect } from "next/navigation";
import DreamApp from "@/components/dream-app";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <DreamApp userId={user.id} />;
}
