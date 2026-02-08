-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to all tables
CREATE TRIGGER update_coop_updated_at BEFORE UPDATE ON coop
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_updated_at BEFORE UPDATE ON location
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_updated_at BEFORE UPDATE ON "user"
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_apartment_complex_updated_at BEFORE UPDATE ON apartment_complex
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_waste_picker_updated_at BEFORE UPDATE ON waste_picker
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_material_category_updated_at BEFORE UPDATE ON material_category
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_client_updated_at BEFORE UPDATE ON client
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_updated_at BEFORE UPDATE ON transaction
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sale_updated_at BEFORE UPDATE ON sale
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to update inventory on transaction insert
CREATE OR REPLACE FUNCTION update_inventory_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert or update inventory
    INSERT INTO inventory (location_id, material_category_id, quantity_kg, last_updated)
    VALUES (NEW.location_id, NEW.material_category_id, NEW.weight_kg, CURRENT_TIMESTAMP)
    ON CONFLICT (location_id, material_category_id)
    DO UPDATE SET
        quantity_kg = inventory.quantity_kg + NEW.weight_kg,
        last_updated = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER transaction_inventory_update AFTER INSERT ON transaction
    FOR EACH ROW EXECUTE FUNCTION update_inventory_on_transaction();

-- Function to reduce inventory on sale
CREATE OR REPLACE FUNCTION reduce_inventory_on_sale()
RETURNS TRIGGER AS $$
DECLARE
    current_quantity DECIMAL(12, 3);
BEGIN
    -- Check current inventory
    SELECT quantity_kg INTO current_quantity
    FROM inventory
    WHERE location_id = NEW.location_id
      AND material_category_id = NEW.material_category_id;
    
    -- Validate sufficient stock
    IF current_quantity IS NULL OR current_quantity < NEW.weight_kg THEN
        RAISE EXCEPTION 'Insufficient inventory. Available: % kg, Requested: % kg',
            COALESCE(current_quantity, 0), NEW.weight_kg;
    END IF;
    
    -- Reduce inventory
    UPDATE inventory
    SET quantity_kg = quantity_kg - NEW.weight_kg,
        last_updated = CURRENT_TIMESTAMP
    WHERE location_id = NEW.location_id
      AND material_category_id = NEW.material_category_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sale_inventory_reduction BEFORE INSERT ON sale
    FOR EACH ROW EXECUTE FUNCTION reduce_inventory_on_sale();

-- Function to generate transaction number
CREATE OR REPLACE FUNCTION generate_transaction_number()
RETURNS TRIGGER AS $$
DECLARE
    location_code VARCHAR(10);
    sequence_num INTEGER;
    date_part VARCHAR(8);
BEGIN
    -- Get location code (first 3 chars of location name)
    SELECT UPPER(SUBSTRING(name, 1, 3)) INTO location_code
    FROM location
    WHERE id = NEW.location_id;
    
    -- Get date part (YYYYMMDD)
    date_part := TO_CHAR(NEW.transaction_date, 'YYYYMMDD');
    
    -- Get sequence number for today
    SELECT COALESCE(MAX(CAST(SUBSTRING(transaction_number FROM '\d+$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM transaction
    WHERE location_id = NEW.location_id
      AND DATE(transaction_date) = DATE(NEW.transaction_date);
    
    -- Generate transaction number: LOC-YYYYMMDD-0001
    NEW.transaction_number := location_code || '-' || date_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_transaction_number_trigger BEFORE INSERT ON transaction
    FOR EACH ROW WHEN (NEW.transaction_number IS NULL)
    EXECUTE FUNCTION generate_transaction_number();

-- Function to generate sale number
CREATE OR REPLACE FUNCTION generate_sale_number()
RETURNS TRIGGER AS $$
DECLARE
    location_code VARCHAR(10);
    sequence_num INTEGER;
    date_part VARCHAR(8);
BEGIN
    -- Get location code
    SELECT UPPER(SUBSTRING(name, 1, 3)) INTO location_code
    FROM location
    WHERE id = NEW.location_id;
    
    -- Get date part
    date_part := TO_CHAR(NEW.sale_date, 'YYYYMMDD');
    
    -- Get sequence number
    SELECT COALESCE(MAX(CAST(SUBSTRING(sale_number FROM '\d+$') AS INTEGER)), 0) + 1
    INTO sequence_num
    FROM sale
    WHERE location_id = NEW.location_id
      AND DATE(sale_date) = DATE(NEW.sale_date);
    
    -- Generate sale number: SAL-LOC-YYYYMMDD-0001
    NEW.sale_number := 'SAL-' || location_code || '-' || date_part || '-' || LPAD(sequence_num::TEXT, 4, '0');
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER generate_sale_number_trigger BEFORE INSERT ON sale
    FOR EACH ROW WHEN (NEW.sale_number IS NULL)
    EXECUTE FUNCTION generate_sale_number();

-- Function to get current price for a material
CREATE OR REPLACE FUNCTION get_current_price(
    p_material_id UUID,
    p_location_id UUID,
    p_date DATE DEFAULT CURRENT_DATE,
    p_price_type VARCHAR DEFAULT 'purchase'
)
RETURNS DECIMAL(10, 2) AS $$
DECLARE
    price DECIMAL(10, 2);
BEGIN
    -- Try location-specific price first
    IF p_price_type = 'purchase' THEN
        SELECT purchase_price_per_kg INTO price
        FROM daily_price
        WHERE material_category_id = p_material_id
          AND location_id = p_location_id
          AND date = p_date;
    ELSE
        SELECT sale_price_per_kg INTO price
        FROM daily_price
        WHERE material_category_id = p_material_id
          AND location_id = p_location_id
          AND date = p_date;
    END IF;
    
    -- Fallback to global price if location-specific not found
    IF price IS NULL THEN
        IF p_price_type = 'purchase' THEN
            SELECT purchase_price_per_kg INTO price
            FROM daily_price
            WHERE material_category_id = p_material_id
              AND location_id IS NULL
              AND date = p_date;
        ELSE
            SELECT sale_price_per_kg INTO price
            FROM daily_price
            WHERE material_category_id = p_material_id
              AND location_id IS NULL
              AND date = p_date;
        END IF;
    END IF;
    
    -- If still no price, get most recent price
    IF price IS NULL THEN
        IF p_price_type = 'purchase' THEN
            SELECT purchase_price_per_kg INTO price
            FROM daily_price
            WHERE material_category_id = p_material_id
              AND (location_id = p_location_id OR location_id IS NULL)
              AND date <= p_date
            ORDER BY date DESC, location_id NULLS LAST
            LIMIT 1;
        ELSE
            SELECT sale_price_per_kg INTO price
            FROM daily_price
            WHERE material_category_id = p_material_id
              AND (location_id = p_location_id OR location_id IS NULL)
              AND date <= p_date
            ORDER BY date DESC, location_id NULLS LAST
            LIMIT 1;
        END IF;
    END IF;
    
    RETURN price;
END;
$$ LANGUAGE plpgsql;

-- Function to get apartment material total
CREATE OR REPLACE FUNCTION get_apartment_material_total(
    p_apartment_id UUID,
    p_material_name VARCHAR,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS DECIMAL(12, 3) AS $$
DECLARE
    total_kg DECIMAL(12, 3);
BEGIN
    SELECT COALESCE(SUM(t.weight_kg), 0) INTO total_kg
    FROM transaction t
    JOIN material_category mc ON t.material_category_id = mc.id
    WHERE t.apartment_complex_id = p_apartment_id
      AND mc.name = p_material_name
      AND DATE(t.transaction_date) BETWEEN p_start_date AND p_end_date;
    
    RETURN total_kg;
END;
$$ LANGUAGE plpgsql;

-- Function to log audit trail
CREATE OR REPLACE FUNCTION log_audit_trail()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'DELETE') THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, changed_at)
        VALUES (TG_TABLE_NAME, OLD.id, 'delete', row_to_json(OLD), CURRENT_TIMESTAMP);
        RETURN OLD;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO audit_log (table_name, record_id, operation, old_data, new_data, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, 'update', row_to_json(OLD), row_to_json(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    ELSIF (TG_OP = 'INSERT') THEN
        INSERT INTO audit_log (table_name, record_id, operation, new_data, changed_at)
        VALUES (TG_TABLE_NAME, NEW.id, 'insert', row_to_json(NEW), CURRENT_TIMESTAMP);
        RETURN NEW;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Apply audit logging to critical tables
CREATE TRIGGER audit_transaction AFTER INSERT OR UPDATE OR DELETE ON transaction
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_sale AFTER INSERT OR UPDATE OR DELETE ON sale
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();

CREATE TRIGGER audit_daily_price AFTER INSERT OR UPDATE OR DELETE ON daily_price
    FOR EACH ROW EXECUTE FUNCTION log_audit_trail();
