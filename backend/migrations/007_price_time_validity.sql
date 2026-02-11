-- Add time validity columns to daily_price table
-- Allows prices to be valid for specific time ranges within a day

ALTER TABLE daily_price
  ADD COLUMN valid_from_time TIME NOT NULL DEFAULT '00:00:00',
  ADD COLUMN valid_to_time TIME NOT NULL DEFAULT '23:59:59';

-- Drop the old unique constraint (material_category_id, location_id, date)
-- and create a new one that includes the time range
ALTER TABLE daily_price
  DROP CONSTRAINT IF EXISTS daily_price_material_category_id_location_id_date_key;

-- New unique constraint includes the time range
ALTER TABLE daily_price
  ADD CONSTRAINT daily_price_material_location_date_time_key
  UNIQUE (material_category_id, location_id, date, valid_from_time);
