import { neon } from "@neondatabase/serverless";

export type DatabaseHealth = {
  configured: boolean;
  reachable: boolean;
  schemaReady: boolean;
};

export async function getDatabaseHealth(): Promise<DatabaseHealth> {
  const url = process.env.DATABASE_URL?.trim();

  if (!url) {
    return { configured: false, reachable: false, schemaReady: false };
  }

  try {
    const sql = neon(url);
    const rows = await sql`
      SELECT
        to_regclass('public.dream_interpretations') IS NOT NULL AS interpretations_ready,
        to_regclass('public.dream_favorites') IS NOT NULL AS favorites_ready
    `;
    const row = rows[0] as { interpretations_ready?: boolean; favorites_ready?: boolean } | undefined;

    return {
      configured: true,
      reachable: true,
      schemaReady: Boolean(row?.interpretations_ready && row?.favorites_ready),
    };
  } catch {
    return { configured: true, reachable: false, schemaReady: false };
  }
}
