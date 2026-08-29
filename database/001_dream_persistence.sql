CREATE TABLE IF NOT EXISTS public.dream_interpretations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_hash char(64) NOT NULL,
  dream_text varchar(300) NOT NULL,
  numbers jsonb NOT NULL,
  meaning text NOT NULL,
  lucky_element varchar(16) NOT NULL,
  result_date date NOT NULL,
  source varchar(32) NOT NULL DEFAULT 'rule-engine-v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dream_interpretations_owner_hash_format
    CHECK (owner_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS dream_interpretations_owner_created_idx
  ON public.dream_interpretations (owner_hash, created_at DESC);

CREATE TABLE IF NOT EXISTS public.dream_favorites (
  owner_hash char(64) NOT NULL,
  interpretation_id uuid NOT NULL
    REFERENCES public.dream_interpretations(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (owner_hash, interpretation_id),
  CONSTRAINT dream_favorites_owner_hash_format
    CHECK (owner_hash ~ '^[0-9a-f]{64}$')
);

CREATE INDEX IF NOT EXISTS dream_favorites_owner_created_idx
  ON public.dream_favorites (owner_hash, created_at DESC);
