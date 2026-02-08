-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Coop table (main organization)
CREATE TABLE coop (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    registration_number VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Locations table (recycling stations)
CREATE TABLE location (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    coop_id UUID NOT NULL REFERENCES coop(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(50),
    manager_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table (system users with RBAC)
CREATE TABLE "user" (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('admin', 'manager', 'operator', 'viewer')),
    location_id UUID REFERENCES location(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Apartment complexes table
CREATE TABLE apartment_complex (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    address TEXT NOT NULL,
    total_units INTEGER NOT NULL,
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Waste pickers table (vendors)
CREATE TABLE waste_picker (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    id_number VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    address TEXT,
    is_affiliated BOOLEAN DEFAULT false,
    bank_name VARCHAR(255),
    bank_account VARCHAR(100),
    payment_method VARCHAR(50) DEFAULT 'cash' CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Material categories table
CREATE TABLE material_category (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    unit VARCHAR(20) NOT NULL DEFAULT 'kg' CHECK (unit IN ('kg', 'unit', 'ton')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Pricing table (time-series pricing for materials)
CREATE TABLE pricing (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_category_id UUID NOT NULL REFERENCES material_category(id) ON DELETE CASCADE,
    price_per_unit DECIMAL(10, 2) NOT NULL,
    effective_date DATE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(material_category_id, effective_date)
);

-- Transaction table (partitioned by month) - FIXED PRIMARY KEY
CREATE TABLE transaction (
    id UUID DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES location(id) ON DELETE CASCADE,
    waste_picker_id UUID REFERENCES waste_picker(id) ON DELETE SET NULL,
    apartment_complex_id UUID REFERENCES apartment_complex(id) ON DELETE SET NULL,
    transaction_date DATE NOT NULL,
    transaction_type VARCHAR(50) NOT NULL CHECK (transaction_type IN ('purchase', 'sale', 'inventory_adjustment')),
    total_amount DECIMAL(10, 2),
    payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
    payment_method VARCHAR(50) CHECK (payment_method IN ('cash', 'bank_transfer', 'mobile_money', 'check')),
    notes TEXT,
    created_by UUID REFERENCES "user"(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (id, transaction_date)  -- FIXED: Include partition key in PRIMARY KEY
) PARTITION BY RANGE (transaction_date);

-- Create partitions for 2025-2027
CREATE TABLE transaction_2025 PARTITION OF transaction
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE transaction_2026 PARTITION OF transaction
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

CREATE TABLE transaction_2027 PARTITION OF transaction
    FOR VALUES FROM ('2027-01-01') TO ('2028-01-01');

-- Transaction items table (line items for each transaction)
CREATE TABLE transaction_item (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    transaction_id UUID NOT NULL,
    transaction_date DATE NOT NULL,
    material_category_id UUID NOT NULL REFERENCES material_category(id) ON DELETE RESTRICT,
    quantity DECIMAL(10, 2) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    subtotal DECIMAL(10, 2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (transaction_id, transaction_date) REFERENCES transaction(id, transaction_date) ON DELETE CASCADE
);

-- Inventory table (current stock levels at each location)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES location(id) ON DELETE CASCADE,
    material_category_id UUID NOT NULL REFERENCES material_category(id) ON DELETE CASCADE,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location_id, material_category_id)
);

-- Activity log table (audit trail)
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES "user"(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50) NOT NULL,
    entity_id UUID NOT NULL,
    old_values JSONB,
    new_values JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_location_coop ON location(coop_id);
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_location ON "user"(location_id);
CREATE INDEX idx_pricing_material ON pricing(material_category_id, effective_date DESC);
CREATE INDEX idx_transaction_location ON transaction(location_id);
CREATE INDEX idx_transaction_waste_picker ON transaction(waste_picker_id);
CREATE INDEX idx_transaction_date ON transaction(transaction_date);
CREATE INDEX idx_transaction_type ON transaction(transaction_type);
CREATE INDEX idx_transaction_item_transaction ON transaction_item(transaction_id, transaction_date);
CREATE INDEX idx_transaction_item_material ON transaction_item(material_category_id);
CREATE INDEX idx_inventory_location ON inventory(location_id);
CREATE INDEX idx_inventory_material ON inventory(material_category_id);
CREATE INDEX idx_activity_log_user ON activity_log(user_id);
CREATE INDEX idx_activity_log_entity ON activity_log(entity_type, entity_id);
CREATE INDEX idx_activity_log_created ON activity_log(created_at DESC);

-- Full-text search indexes
CREATE INDEX idx_waste_picker_name ON waste_picker USING gin(to_tsvector('english', first_name || ' ' || last_name));
CREATE INDEX idx_apartment_complex_name ON apartment_complex USING gin(to_tsvector('english', name));
CREATE INDEX idx_location_name ON location USING gin(to_tsvector('english', name));

-- Trigger function for updating updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update_updated_at trigger to all tables
CREATE TRIGGER update_coop_updated_at BEFORE UPDATE ON coop FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_location_updated_at BEFORE UPDATE ON location FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user" FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_apartment_complex_updated_at BEFORE UPDATE ON apartment_complex FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_waste_picker_updated_at BEFORE UPDATE ON waste_picker FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_material_category_updated_at BEFORE UPDATE ON material_category FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_pricing_updated_at BEFORE UPDATE ON pricing FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transaction_updated_at BEFORE UPDATE ON transaction FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
