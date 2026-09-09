export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() ?? "";
export const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ?? "";

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey);
}

export function requireSupabaseConfig(): { url: string; key: string } {
  if (!isSupabaseConfigured()) throw new Error("Supabase environment variables are not configured");
  return { url: supabaseUrl, key: supabasePublishableKey };
}
