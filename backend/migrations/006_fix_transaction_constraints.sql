-- Migration 006: Fix transaction constraints for new logic
-- Waste picker is always the seller. Source (apartment) is optional origin.

-- 1. Drop the broken coop balance trigger (references non-existent columns)
DROP TRIGGER IF EXISTS update_coop_balance ON transaction;
DROP FUNCTION IF EXISTS update_coop_balance_on_transaction();

-- 2. Fix CHECK constraint: waste_picker_id is always required,
--    apartment info is optional and indicates a known source
-- First drop the old constraint, then add the new one.
-- The old constraint was inline, so we need to find its name.
DO $$
DECLARE
    constraint_name text;
BEGIN
    -- Find and drop existing CHECK constraints on source_type/waste_picker_id/apartment_complex_id
    FOR constraint_name IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'transaction'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) LIKE '%source_type%'
    LOOP
        EXECUTE format('ALTER TABLE transaction DROP CONSTRAINT %I', constraint_name);
        RAISE NOTICE 'Dropped constraint: %', constraint_name;
    END LOOP;
END $$;

-- Add new constraint: waste_picker_id always required,
-- if source_type = 'apartment' then apartment_complex_id must be set
ALTER TABLE transaction ADD CONSTRAINT transaction_source_check CHECK (
    waste_picker_id IS NOT NULL
    AND (
        (source_type = 'apartment' AND apartment_complex_id IS NOT NULL)
        OR source_type = 'waste_picker'
    )
);

-- 3. Update the source_type CHECK to allow existing values
-- (already allows 'apartment' and 'waste_picker', no change needed)

-- 4. Add updated_at column to daily_price if missing (needed by sync pull endpoint)
ALTER TABLE daily_price ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
