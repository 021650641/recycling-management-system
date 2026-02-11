-- Add time validity columns to daily_price table
-- Allows prices to be valid for specific time ranges within a day
-- This migration is idempotent (safe to run multiple times)

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_price' AND column_name = 'valid_from_time'
  ) THEN
    ALTER TABLE daily_price ADD COLUMN valid_from_time TIME NOT NULL DEFAULT '00:00:00';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'daily_price' AND column_name = 'valid_to_time'
  ) THEN
    ALTER TABLE daily_price ADD COLUMN valid_to_time TIME NOT NULL DEFAULT '23:59:59';
  END IF;
END $$;

-- Drop the old unique constraint (material_category_id, location_id, date)
-- and create a new one that includes the time range
ALTER TABLE daily_price
  DROP CONSTRAINT IF EXISTS daily_price_material_category_id_location_id_date_key;

-- Also try the shorter auto-generated name variant
ALTER TABLE daily_price
  DROP CONSTRAINT IF EXISTS daily_price_material_category_id_location_id_date_key1;

-- New unique constraint includes the time range (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'daily_price_material_location_date_time_key'
  ) THEN
    ALTER TABLE daily_price
      ADD CONSTRAINT daily_price_material_location_date_time_key
      UNIQUE (material_category_id, location_id, date, valid_from_time);
  END IF;
END $$;
