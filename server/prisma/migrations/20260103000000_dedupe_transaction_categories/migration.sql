-- Dedupe transaction_categories and enforce a case-insensitive uniqueness constraint
-- This is safe to re-run.

-- 1) Delete duplicates by (lower(name), lower(type)), keeping the smallest id per group.
WITH ranked AS (
  SELECT
    id,
    lower(trim(regexp_replace(name, '\s+', ' ', 'g'))) AS name_norm,
    lower(trim(regexp_replace(type, '\s+', ' ', 'g'))) AS type_norm,
    row_number() OVER (
      PARTITION BY lower(trim(regexp_replace(name, '\s+', ' ', 'g'))),
                   lower(trim(regexp_replace(type, '\s+', ' ', 'g')))
      ORDER BY id ASC
    ) AS rn
  FROM transaction_categories
),
to_delete AS (
  SELECT id FROM ranked WHERE rn > 1
)
DELETE FROM transaction_categories
WHERE id IN (SELECT id FROM to_delete);

-- 2) Add a case-insensitive unique index (name,type) to prevent future duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS "transaction_categories_name_type_ci_key"
ON "transaction_categories" (lower(trim(regexp_replace("name", '\s+', ' ', 'g'))), lower(trim(regexp_replace("type", '\s+', ' ', 'g'))));


