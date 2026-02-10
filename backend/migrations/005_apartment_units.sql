-- Migration 005: Add apartment_unit table for tracking individual dwellings

-- Create apartment_unit table
CREATE TABLE IF NOT EXISTS apartment_unit (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    apartment_complex_id UUID NOT NULL REFERENCES apartment_complex(id) ON DELETE CASCADE,
    unit_number VARCHAR(50) NOT NULL,
    resident_name VARCHAR(200),
    resident_phone VARCHAR(50),
    resident_email VARCHAR(200),
    floor VARCHAR(20),
    notes TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(apartment_complex_id, unit_number)
);

-- Add apartment_unit_id to transaction table for proper unit tracking
ALTER TABLE transaction ADD COLUMN IF NOT EXISTS apartment_unit_id UUID REFERENCES apartment_unit(id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_apartment_unit_complex ON apartment_unit(apartment_complex_id);
CREATE INDEX IF NOT EXISTS idx_apartment_unit_active ON apartment_unit(apartment_complex_id, is_active);
CREATE INDEX IF NOT EXISTS idx_transaction_apartment_unit ON transaction(apartment_unit_id);

-- Update v_transaction_details view to include unit info
-- Must DROP first because PostgreSQL won't allow column renames via CREATE OR REPLACE
DROP VIEW IF EXISTS v_transaction_details;
CREATE VIEW v_transaction_details AS
SELECT
    t.id AS transaction_id,
    t.transaction_number,
    t.transaction_date,
    t.source_type,
    l.name AS location_name,
    mc.name AS material_category,
    CASE
        WHEN t.source_type = 'apartment' THEN ac.name || COALESCE(' - Unit ' || COALESCE(au.unit_number, t.apartment_unit), '')
        WHEN t.source_type = 'waste_picker' THEN wp.first_name || ' ' || wp.last_name
    END AS source_name,
    t.weight_kg,
    t.quality_grade,
    t.unit_price,
    t.total_cost,
    t.payment_status,
    t.payment_method,
    t.payment_reference,
    t.paid_amount,
    t.notes,
    t.apartment_complex_id,
    ac.name AS apartment_name,
    t.apartment_unit_id,
    au.unit_number AS apartment_unit_number,
    au.resident_name AS apartment_resident_name,
    t.waste_picker_id,
    wp.first_name || ' ' || wp.last_name AS waste_picker_name,
    t.recorded_by,
    t.created_at
FROM transaction t
JOIN location l ON t.location_id = l.id
JOIN material_category mc ON t.material_category_id = mc.id
LEFT JOIN apartment_complex ac ON t.apartment_complex_id = ac.id
LEFT JOIN apartment_unit au ON t.apartment_unit_id = au.id
LEFT JOIN waste_picker wp ON t.waste_picker_id = wp.id;
