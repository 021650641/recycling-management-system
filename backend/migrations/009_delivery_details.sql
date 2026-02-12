-- Delivery person table (reusable across shipments)
CREATE TABLE IF NOT EXISTS delivery_person (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    id_card_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Delivery vehicle table (reusable across shipments)
CREATE TABLE IF NOT EXISTS delivery_vehicle (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_type VARCHAR(100) NOT NULL,
    registration_number VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add unique constraints to avoid duplicates
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_person_name_id ON delivery_person (full_name, id_card_number);
CREATE UNIQUE INDEX IF NOT EXISTS idx_delivery_vehicle_reg ON delivery_vehicle (registration_number);

-- Add delivery detail columns to sale table
ALTER TABLE sale ADD COLUMN IF NOT EXISTS delivery_person_id UUID REFERENCES delivery_person(id);
ALTER TABLE sale ADD COLUMN IF NOT EXISTS delivery_vehicle_id UUID REFERENCES delivery_vehicle(id);
ALTER TABLE sale ADD COLUMN IF NOT EXISTS delivery_notes TEXT;
