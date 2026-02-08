-- This file contains ONLY business logic triggers and functions
-- The update_updated_at triggers are already defined in 001_initial_schema.sql

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

-- Function to update coop balance on transaction
CREATE OR REPLACE FUNCTION update_coop_balance_on_transaction()
RETURNS TRIGGER AS $$
BEGIN
    -- Update coop balance
    UPDATE coop
    SET balance_cop = balance_cop + NEW.amount_cop,
        total_transactions_cop = total_transactions_cop + NEW.amount_cop,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = NEW.coop_id;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_coop_balance AFTER INSERT ON transaction
    FOR EACH ROW EXECUTE FUNCTION update_coop_balance_on_transaction();