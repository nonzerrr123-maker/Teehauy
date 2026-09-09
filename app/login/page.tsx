import { LoginCard } from "@/components/auth/login-card";
import { StarsBackground } from "@/components/dream/common";

export const dynamic = "force-dynamic";
function safeNext(value: string | string[] | undefined): string { const next = Array.isArray(value) ? value[0] : value; return next?.startsWith("/") && !next.startsWith("//") ? next : "/"; }
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string }> }) {
  const query = await searchParams;
  return <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#06060C] px-5 py-10"><StarsBackground /><div className="absolute inset-x-0 top-[-20%] mx-auto h-[420px] w-[420px] rounded-full bg-[#5e3a8b14] blur-3xl" /><LoginCard nextPath={safeNext(query.next)} oauthError={query.error === "oauth"} /></main>;
}
