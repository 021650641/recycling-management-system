-- Seed data for recycling management system

-- Insert coop
INSERT INTO coop (id, name, address, phone, email, registration_number) VALUES
('00000000-0000-0000-0000-000000000001', 'Green Recycling Cooperative', '123 Main Street, City Center', '+1234567890', 'info@greenrecycle.org', 'COOP-2024-001');

-- Insert locations
INSERT INTO location (id, coop_id, name, address, phone, manager_name, is_active) VALUES
('00000000-0000-0000-0000-000000000011', '00000000-0000-0000-0000-000000000001', 'Central Station', '100 Central Ave, Downtown', '+1234567891', 'John Manager', true),
('00000000-0000-0000-0000-000000000012', '00000000-0000-0000-0000-000000000001', 'East Station', '200 East Road, Eastside', '+1234567892', 'Jane Supervisor', true),
('00000000-0000-0000-0000-000000000013', '00000000-0000-0000-0000-000000000001', 'West Station', '300 West Blvd, Westside', '+1234567893', 'Bob Director', true);

-- Insert admin user (password: admin123)
INSERT INTO "user" (id, email, password_hash, first_name, last_name, role, location_id, is_active) VALUES
('00000000-0000-0000-0000-000000000021', 'admin@greenrecycle.org', '$2b$10$rKvVN6FqE7qH7QxJ5vQxpO0WZ5YJ5nGJ5YJ5nGJ5YJ5nGJ5YJ5nGJ', 'Admin', 'User', 'admin', NULL, true),
('00000000-0000-0000-0000-000000000022', 'manager@greenrecycle.org', '$2b$10$rKvVN6FqE7qH7QxJ5vQxpO0WZ5YJ5nGJ5YJ5nGJ5YJ5nGJ5YJ5nGJ', 'Central', 'Manager', 'manager', '00000000-0000-0000-0000-000000000011', true),
('00000000-0000-0000-0000-000000000023', 'operator@greenrecycle.org', '$2b$10$rKvVN6FqE7qH7QxJ5vQxpO0WZ5YJ5nGJ5YJ5nGJ5YJ5nGJ5YJ5nGJ', 'Scale', 'Operator', 'operator', '00000000-0000-0000-0000-000000000011', true);

-- Insert material categories
INSERT INTO material_category (id, name, description, unit, is_active) VALUES
('00000000-0000-0000-0000-000000000031', 'Paper', 'White and colored paper, newspapers, magazines', 'kg', true),
('00000000-0000-0000-0000-000000000032', 'Cardboard', 'Corrugated cardboard boxes and packaging', 'kg', true),
('00000000-0000-0000-0000-000000000033', 'Plastic', 'PET bottles, HDPE containers, plastic bags', 'kg', true),
('00000000-0000-0000-0000-000000000034', 'Glass', 'Glass bottles and jars', 'kg', true),
('00000000-0000-0000-0000-000000000035', 'Metal', 'Aluminum cans, steel cans, metal scraps', 'kg', true),
('00000000-0000-0000-0000-000000000036', 'E-Waste', 'Electronic waste, batteries, small appliances', 'kg', true);

-- Insert daily prices (current and past week)
INSERT INTO daily_price (material_category_id, location_id, date, purchase_price_per_kg, sale_price_per_kg, created_by) VALUES
-- Current prices (global)
('00000000-0000-0000-0000-000000000031', NULL, CURRENT_DATE, 0.50, 0.80, '00000000-0000-0000-0000-000000000021'),
('00000000-0000-0000-0000-000000000032', NULL, CURRENT_DATE, 0.30, 0.55, '00000000-0000-0000-0000-000000000021'),
('00000000-0000-0000-0000-000000000033', NULL, CURRENT_DATE, 0.80, 1.20, '00000000-0000-0000-0000-000000000021'),
('00000000-0000-0000-0000-000000000034', NULL, CURRENT_DATE, 0.15, 0.30, '00000000-0000-0000-0000-000000000021'),
('00000000-0000-0000-0000-000000000035', NULL, CURRENT_DATE, 1.50, 2.00, '00000000-0000-0000-0000-000000000021'),
('00000000-0000-0000-0000-000000000036', NULL, CURRENT_DATE, 2.00, 3.50, '00000000-0000-0000-0000-000000000021');

-- Insert apartment complexes
INSERT INTO apartment_complex (id, name, address, total_units, contact_name, contact_phone, contact_email, is_active) VALUES
('00000000-0000-0000-0000-000000000041', 'Sunset Towers', '1000 Sunset Boulevard', 120, 'Sarah Jones', '+1234567801', 'sarah@sunsettowers.com', true),
('00000000-0000-0000-0000-000000000042', 'Green Meadows', '2000 Meadow Lane', 85, 'Mike Brown', '+1234567802', 'mike@greenmeadows.com', true),
('00000000-0000-0000-0000-000000000043', 'Ocean View', '3000 Ocean Drive', 200, 'Lisa White', '+1234567803', 'lisa@oceanview.com', true),
('00000000-0000-0000-0000-000000000044', 'Downtown Plaza', '4000 Main Street', 150, 'Tom Green', '+1234567804', 'tom@downtownplaza.com', true);

-- Insert waste pickers
INSERT INTO waste_picker (id, first_name, last_name, id_number, phone, email, address, is_affiliated, bank_name, bank_account, payment_method, is_active) VALUES
('00000000-0000-0000-0000-000000000051', 'Carlos', 'Rodriguez', 'WP001234', '+1234567811', 'carlos@email.com', '100 Worker Street', true, 'City Bank', '1234567890', 'bank_transfer', true),
('00000000-0000-0000-0000-000000000052', 'Maria', 'Santos', 'WP001235', '+1234567812', 'maria@email.com', '200 Worker Street', true, 'City Bank', '1234567891', 'bank_transfer', true),
('00000000-0000-0000-0000-000000000053', 'Pedro', 'Silva', 'WP001236', '+1234567813', 'pedro@email.com', '300 Worker Street', false, NULL, NULL, 'cash', true),
('00000000-0000-0000-0000-000000000054', 'Ana', 'Lopez', 'WP001237', '+1234567814', 'ana@email.com', '400 Worker Street', true, 'National Bank', '1234567892', 'mobile_money', true),
('00000000-0000-0000-0000-000000000055', 'Juan', 'Martinez', 'WP001238', '+1234567815', 'juan@email.com', '500 Worker Street', false, NULL, NULL, 'cash', true);

-- Insert clients
INSERT INTO client (id, name, contact_name, contact_phone, contact_email, address, payment_terms, is_active) VALUES
('00000000-0000-0000-0000-000000000061', 'Paper Mill Industries', 'David Chen', '+1234567821', 'david@papermill.com', '1000 Industrial Park', 'Net 30', true),
('00000000-0000-0000-0000-000000000062', 'Plastic Recyclers Ltd', 'Emily Wong', '+1234567822', 'emily@plasticrecyclers.com', '2000 Factory Road', 'Net 15', true),
('00000000-0000-0000-0000-000000000063', 'Metal Works Corp', 'Robert Taylor', '+1234567823', 'robert@metalworks.com', '3000 Steel Avenue', 'Net 45', true),
('00000000-0000-0000-0000-000000000064', 'Glass Reclaim Inc', 'Jennifer Davis', '+1234567824', 'jennifer@glassreclaim.com', '4000 Glass Boulevard', 'Net 30', true);

-- Initialize inventory (all zeros)
INSERT INTO inventory (location_id, material_category_id, quantity_kg)
SELECT l.id, mc.id, 0
FROM location l
CROSS JOIN material_category mc
WHERE l.is_active = true AND mc.is_active = true;

-- Note: Transaction data will be generated through the application
-- This seed file provides the foundation for testing