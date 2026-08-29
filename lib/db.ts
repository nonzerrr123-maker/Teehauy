import { neon } from "@neondatabase/serverless";

import type { DreamResult, NumberItem } from "@/lib/dream-engine";

export type PersistedDreamResult = DreamResult & { id: string };

type DreamRow = {
  id: string;
  dream_text: string;
  numbers: NumberItem[] | string;
  meaning: string;
  lucky_element: DreamResult["luckyElement"];
  result_date: string | Date;
};

function databaseUrl(): string | null {
  const value = process.env.DATABASE_URL?.trim();
  return value || null;
}

export function isDatabaseConfigured(): boolean {
  return Boolean(databaseUrl());
}

function getSql() {
  const url = databaseUrl();
  if (!url) throw new Error("DATABASE_URL is not configured");
  return neon(url);
}

function parseNumbers(value: NumberItem[] | string): NumberItem[] {
  if (Array.isArray(value)) return value;
  return JSON.parse(value) as NumberItem[];
}

function normalizeDate(value: string | Date): string {
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function mapDreamRow(row: DreamRow): PersistedDreamResult {
  return {
    id: row.id,
    dreamText: row.dream_text,
    numbers: parseNumbers(row.numbers),
    meaning: row.meaning,
    luckyElement: row.lucky_element,
    date: normalizeDate(row.result_date),
  };
}

export async function saveDreamInterpretation(
  ownerHash: string,
  result: DreamResult,
): Promise<PersistedDreamResult> {
  const sql = getSql();
  const rows = await sql`
    INSERT INTO public.dream_interpretations (
      owner_hash,
      dream_text,
      numbers,
      meaning,
      lucky_element,
      result_date,
      source
    ) VALUES (
      ${ownerHash},
      ${result.dreamText},
      ${JSON.stringify(result.numbers)}::jsonb,
      ${result.meaning},
      ${result.luckyElement},
      ${result.date},
      'rule-engine-v1'
    )
    RETURNING id, dream_text, numbers, meaning, lucky_element, result_date
  `;

  return mapDreamRow(rows[0] as DreamRow);
}

export async function listDreamHistory(ownerHash: string, limit = 30): Promise<PersistedDreamResult[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const sql = getSql();
  const rows = await sql`
    SELECT id, dream_text, numbers, meaning, lucky_element, result_date
    FROM public.dream_interpretations
    WHERE owner_hash = ${ownerHash}
    ORDER BY created_at DESC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => mapDreamRow(row as DreamRow));
}

export async function listDreamFavorites(ownerHash: string, limit = 100): Promise<PersistedDreamResult[]> {
  const safeLimit = Math.max(1, Math.min(100, Math.trunc(limit)));
  const sql = getSql();
  const rows = await sql`
    SELECT i.id, i.dream_text, i.numbers, i.meaning, i.lucky_element, i.result_date
    FROM public.dream_favorites AS f
    JOIN public.dream_interpretations AS i ON i.id = f.interpretation_id
    WHERE f.owner_hash = ${ownerHash}
      AND i.owner_hash = ${ownerHash}
    ORDER BY f.created_at DESC
    LIMIT ${safeLimit}
  `;

  return rows.map((row) => mapDreamRow(row as DreamRow));
}

export async function setDreamFavorite(
  ownerHash: string,
  interpretationId: string,
  favorite: boolean,
): Promise<boolean> {
  const sql = getSql();

  if (favorite) {
    const rows = await sql`
      INSERT INTO public.dream_favorites (owner_hash, interpretation_id)
      SELECT ${ownerHash}, id
      FROM public.dream_interpretations
      WHERE id = ${interpretationId}
        AND owner_hash = ${ownerHash}
      ON CONFLICT (owner_hash, interpretation_id) DO NOTHING
      RETURNING interpretation_id
    `;

    if (rows.length) return true;

    const existing = await sql`
      SELECT 1
      FROM public.dream_favorites AS f
      JOIN public.dream_interpretations AS i ON i.id = f.interpretation_id
      WHERE f.owner_hash = ${ownerHash}
        AND f.interpretation_id = ${interpretationId}
        AND i.owner_hash = ${ownerHash}
      LIMIT 1
    `;
    return existing.length > 0;
  }

  await sql`
    DELETE FROM public.dream_favorites AS f
    USING public.dream_interpretations AS i
    WHERE f.interpretation_id = i.id
      AND f.owner_hash = ${ownerHash}
      AND f.interpretation_id = ${interpretationId}
      AND i.owner_hash = ${ownerHash}
  `;
  return false;
}
