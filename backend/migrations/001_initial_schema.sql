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
    unit VARCHAR(20) DEFAULT 'kg',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Daily prices table (CORRECT NAME - not "pricing")
CREATE TABLE daily_price (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    material_category_id UUID NOT NULL REFERENCES material_category(id) ON DELETE CASCADE,
    location_id UUID REFERENCES location(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    purchase_price_per_kg DECIMAL(10, 2) NOT NULL,
    sale_price_per_kg DECIMAL(10, 2) NOT NULL,
    created_by UUID REFERENCES "user"(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(material_category_id, location_id, date)
);

-- Clients table (companies buying recyclables)
CREATE TABLE client (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    contact_name VARCHAR(255),
    contact_phone VARCHAR(50),
    contact_email VARCHAR(255),
    address TEXT,
    payment_terms VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Transactions table (main receipts) - partitioned by date
CREATE TABLE transaction (
    id UUID DEFAULT uuid_generate_v4(),
    transaction_number VARCHAR(50) NOT NULL,
    location_id UUID NOT NULL REFERENCES location(id),
    material_category_id UUID NOT NULL REFERENCES material_category(id),

    -- Source tracking (either apartment or waste picker)
    source_type VARCHAR(20) NOT NULL CHECK (source_type IN ('apartment', 'waste_picker')),
    apartment_complex_id UUID REFERENCES apartment_complex(id),
    apartment_unit VARCHAR(50),
    waste_picker_id UUID REFERENCES waste_picker(id),

    -- Transaction details
    weight_kg DECIMAL(10, 3) NOT NULL,
    quality_grade VARCHAR(20) DEFAULT 'standard' CHECK (quality_grade IN ('premium', 'standard', 'low')),
    unit_price DECIMAL(10, 2) NOT NULL,
    total_cost DECIMAL(12, 2) NOT NULL,

    -- Payment tracking
    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    paid_at TIMESTAMP WITH TIME ZONE,

    -- Metadata
    notes TEXT,
    recorded_by UUID NOT NULL REFERENCES "user"(id),
    device_id VARCHAR(100),
    is_synced BOOLEAN DEFAULT true,

    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Constraints
    CHECK (
        (source_type = 'apartment' AND apartment_complex_id IS NOT NULL) OR
        (source_type = 'waste_picker' AND waste_picker_id IS NOT NULL)
    ),
    
    -- FIXED: Include partition key in PRIMARY KEY
    PRIMARY KEY (id, transaction_date)
) PARTITION BY RANGE (transaction_date);

-- Create partitions for transactions (current year and next year)
CREATE TABLE transaction_2024 PARTITION OF transaction
    FOR VALUES FROM ('2024-01-01') TO ('2025-01-01');

CREATE TABLE transaction_2025 PARTITION OF transaction
    FOR VALUES FROM ('2025-01-01') TO ('2026-01-01');

CREATE TABLE transaction_2026 PARTITION OF transaction
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');

-- Inventory table (real-time stock)
CREATE TABLE inventory (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    location_id UUID NOT NULL REFERENCES location(id) ON DELETE CASCADE,
    material_category_id UUID NOT NULL REFERENCES material_category(id) ON DELETE CASCADE,
    quantity_kg DECIMAL(12, 3) NOT NULL DEFAULT 0,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(location_id, material_category_id)
);

-- Sales table (selling to clients)
CREATE TABLE sale (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sale_number VARCHAR(50) UNIQUE NOT NULL,
    client_id UUID NOT NULL REFERENCES client(id),
    location_id UUID NOT NULL REFERENCES location(id),
    material_category_id UUID NOT NULL REFERENCES material_category(id),

    weight_kg DECIMAL(10, 3) NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    total_amount DECIMAL(12, 2) NOT NULL,

    payment_status VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'partial')),
    payment_method VARCHAR(50),
    payment_reference VARCHAR(100),
    paid_amount DECIMAL(12, 2) DEFAULT 0,
    paid_at TIMESTAMP WITH TIME ZONE,

    delivery_status VARCHAR(20) DEFAULT 'pending' CHECK (delivery_status IN ('pending', 'delivered', 'cancelled')),
    delivered_at TIMESTAMP WITH TIME ZONE,

    notes TEXT,
    created_by UUID NOT NULL REFERENCES "user"(id),

    sale_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Sync log table (offline operations)
CREATE TABLE sync_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    device_id VARCHAR(100) NOT NULL,
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
    data_snapshot JSONB,
    sync_status VARCHAR(20) DEFAULT 'pending' CHECK (sync_status IN ('pending', 'synced', 'conflict', 'failed')),
    conflict_resolution TEXT,
    synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit log table (change tracking)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    table_name VARCHAR(100) NOT NULL,
    record_id UUID NOT NULL,
    operation VARCHAR(20) NOT NULL CHECK (operation IN ('insert', 'update', 'delete')),
    old_data JSONB,
    new_data JSONB,
    changed_by UUID REFERENCES "user"(id),
    changed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT
);

-- Create indexes for performance
CREATE INDEX idx_location_coop ON location(coop_id);
CREATE INDEX idx_location_active ON location(is_active);
CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_location ON "user"(location_id);
CREATE INDEX idx_apartment_active ON apartment_complex(is_active);
CREATE INDEX idx_waste_picker_active ON waste_picker(is_active);
CREATE INDEX idx_waste_picker_id_number ON waste_picker(id_number);
CREATE INDEX idx_daily_price_date ON daily_price(date DESC);
CREATE INDEX idx_daily_price_material_location ON daily_price(material_category_id, location_id, date DESC);
CREATE INDEX idx_transaction_date ON transaction(transaction_date DESC);
CREATE INDEX idx_transaction_location ON transaction(location_id);
CREATE INDEX idx_transaction_material ON transaction(material_category_id);
CREATE INDEX idx_transaction_apartment ON transaction(apartment_complex_id);
CREATE INDEX idx_transaction_waste_picker ON transaction(waste_picker_id);
CREATE INDEX idx_transaction_payment_status ON transaction(payment_status);
CREATE INDEX idx_transaction_sync ON transaction(is_synced) WHERE is_synced = false;
CREATE INDEX idx_inventory_location_material ON inventory(location_id, material_category_id);
CREATE INDEX idx_sale_date ON sale(sale_date DESC);
CREATE INDEX idx_sale_client ON sale(client_id);
CREATE INDEX idx_sale_location ON sale(location_id);
CREATE INDEX idx_sync_log_device ON sync_log(device_id, sync_status);
CREATE INDEX idx_audit_log_table_record ON audit_log(table_name, record_id);
CREATE INDEX idx_audit_log_changed_at ON audit_log(changed_at DESC);

-- Full-text search indexes
CREATE INDEX idx_apartment_name_trgm ON apartment_complex USING gin(name gin_trgm_ops);
CREATE INDEX idx_waste_picker_name_trgm ON waste_picker USING gin((first_name || ' ' || last_name) gin_trgm_ops);
CREATE INDEX idx_client_name_trgm ON client USING gin(name gin_trgm_ops);

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
CREATE TRIGGER update_client_updated_at BEFORE UPDATE ON client FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_transaction_updated_at BEFORE UPDATE ON transaction FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_sale_updated_at BEFORE UPDATE ON sale FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();