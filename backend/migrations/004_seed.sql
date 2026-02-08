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
('00000000-0000-0000-0000-000000000034', NULL, CURRENT_DATE, 0.20, 0.40, '00000000-0000-0000-0000-000000000021'),
('00000000-0000-0000-0000-000000000035', NULL, CURRENT_DATE, 1.00, 1.50, '00000000-0000-0000-0000-000000000021'),
('00000000-0000-0000-0000-000000000036', NULL, CURRENT_DATE, 0.15, 0.30, '00000000-0000-0000-0000-000000000021'),
-- Past week prices
('00000000-0000-0000-0000-000000000031', NULL, CURRENT_DATE - INTERVAL '1 days', 0.48, 0.78, '00000000-0000-0000-0000-000000000021'),
('00000000-0000-0000-0000-000000000032', NULL, CURRENT_DATE - INTERVAL '1 days', 0.29, 0.54, '00000000-0000-0000-0000-000000000021');
