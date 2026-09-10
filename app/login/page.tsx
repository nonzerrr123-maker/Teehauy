import { LoginCard } from "@/components/auth/login-card";

export const dynamic = "force-dynamic";
function safeNext(value: string | string[] | undefined): string { const next = Array.isArray(value) ? value[0] : value; return next?.startsWith("/") && !next.startsWith("//") ? next : "/"; }
export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string | string[]; error?: string }> }) {
  const query = await searchParams;
  return <main className="relative flex min-h-dvh items-center justify-center overflow-hidden px-5 py-10"><div className="pointer-events-none absolute inset-x-0 top-[-16rem] mx-auto size-[34rem] rounded-full bg-primary/8 blur-3xl" /><div className="pointer-events-none absolute bottom-[-18rem] right-[-12rem] size-[30rem] rounded-full bg-[#574b8a]/10 blur-3xl" /><LoginCard nextPath={safeNext(query.next)} oauthError={query.error === "oauth"} /></main>;
}
