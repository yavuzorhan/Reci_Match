-- Adds macro intake columns to daily_logs (if not already present).
-- Run this in pgAdmin or psql if alembic migration 20260504_01 was not applied.
ALTER TABLE daily_logs
  ADD COLUMN IF NOT EXISTS protein_intake NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS carbohydrate_intake NUMERIC(6,2),
  ADD COLUMN IF NOT EXISTS fat_intake NUMERIC(6,2);
