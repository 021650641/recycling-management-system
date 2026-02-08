-- Materialized view for weekly apartment complex summary
CREATE MATERIALIZED VIEW mv_weekly_apartment_summary AS
SELECT 
    ac.id AS apartment_complex_id,
    ac.name AS apartment_name,
    DATE_TRUNC('week', t.transaction_date) AS week_start,
    mc.name AS material_category,
    SUM(t.weight_kg) AS total_weight_kg,
    COUNT(t.id) AS transaction_count,
    SUM(t.total_cost) AS total_value
FROM transaction t
JOIN apartment_complex ac ON t.apartment_complex_id = ac.id
JOIN material_category mc ON t.material_category_id = mc.id
WHERE t.source_type = 'apartment'
GROUP BY ac.id, ac.name, DATE_TRUNC('week', t.transaction_date), mc.name;

CREATE INDEX idx_mv_weekly_apt_complex ON mv_weekly_apartment_summary(apartment_complex_id, week_start);
CREATE INDEX idx_mv_weekly_apt_week ON mv_weekly_apartment_summary(week_start DESC);

-- Materialized view for waste picker monthly summary
CREATE MATERIALIZED VIEW mv_waste_picker_monthly_summary AS
SELECT 
    wp.id AS waste_picker_id,
    wp.first_name || ' ' || wp.last_name AS waste_picker_name,
    DATE_TRUNC('month', t.transaction_date) AS month_start,
    mc.name AS material_category,
    SUM(t.weight_kg) AS total_weight_kg,
    COUNT(t.id) AS transaction_count,
    SUM(t.total_cost) AS total_earnings,
    SUM(CASE WHEN t.payment_status = 'paid' THEN t.paid_amount ELSE 0 END) AS total_paid
FROM transaction t
JOIN waste_picker wp ON t.waste_picker_id = wp.id
JOIN material_category mc ON t.material_category_id = mc.id
WHERE t.source_type = 'waste_picker'
GROUP BY wp.id, wp.first_name, wp.last_name, DATE_TRUNC('month', t.transaction_date), mc.name;

CREATE INDEX idx_mv_monthly_wp_picker ON mv_waste_picker_monthly_summary(waste_picker_id, month_start);
CREATE INDEX idx_mv_monthly_wp_month ON mv_waste_picker_monthly_summary(month_start DESC);

-- Materialized view for location daily summary
CREATE MATERIALIZED VIEW mv_location_daily_summary AS
SELECT 
    l.id AS location_id,
    l.name AS location_name,
    DATE(t.transaction_date) AS transaction_date,
    mc.name AS material_category,
    SUM(t.weight_kg) AS total_weight_kg,
    COUNT(t.id) AS transaction_count,
    SUM(t.total_cost) AS total_purchase_cost,
    COUNT(DISTINCT CASE WHEN t.source_type = 'waste_picker' THEN t.waste_picker_id END) AS unique_waste_pickers,
    COUNT(DISTINCT CASE WHEN t.source_type = 'apartment' THEN t.apartment_complex_id END) AS unique_apartments
FROM transaction t
JOIN location l ON t.location_id = l.id
JOIN material_category mc ON t.material_category_id = mc.id
GROUP BY l.id, l.name, DATE(t.transaction_date), mc.name;

CREATE INDEX idx_mv_daily_loc_location ON mv_location_daily_summary(location_id, transaction_date);
CREATE INDEX idx_mv_daily_loc_date ON mv_location_daily_summary(transaction_date DESC);

-- View for current inventory status
CREATE OR REPLACE VIEW v_inventory_status AS
SELECT 
    l.id AS location_id,
    l.name AS location_name,
    mc.id AS material_category_id,
    mc.name AS material_category,
    COALESCE(i.quantity_kg, 0) AS quantity_kg,
    dp.sale_price_per_kg AS current_sale_price,
    COALESCE(i.quantity_kg, 0) * COALESCE(dp.sale_price_per_kg, 0) AS estimated_value,
    i.last_updated
FROM location l
CROSS JOIN material_category mc
LEFT JOIN inventory i ON i.location_id = l.id AND i.material_category_id = mc.id
LEFT JOIN LATERAL (
    SELECT sale_price_per_kg
    FROM daily_price
    WHERE material_category_id = mc.id
      AND (location_id = l.id OR location_id IS NULL)
      AND date <= CURRENT_DATE
    ORDER BY date DESC, location_id NULLS LAST
    LIMIT 1
) dp ON true
WHERE l.is_active = true AND mc.is_active = true;

-- View for pending payments (waste pickers)
CREATE OR REPLACE VIEW v_pending_payments AS
SELECT 
    t.id AS transaction_id,
    t.transaction_number,
    t.transaction_date,
    wp.id AS waste_picker_id,
    wp.first_name || ' ' || wp.last_name AS waste_picker_name,
    wp.phone,
    wp.payment_method,
    l.name AS location_name,
    mc.name AS material_category,
    t.weight_kg,
    t.total_cost,
    t.paid_amount,
    t.total_cost - COALESCE(t.paid_amount, 0) AS amount_due,
    t.payment_status
FROM transaction t
JOIN waste_picker wp ON t.waste_picker_id = wp.id
JOIN location l ON t.location_id = l.id
JOIN material_category mc ON t.material_category_id = mc.id
WHERE t.source_type = 'waste_picker'
  AND t.payment_status IN ('pending', 'partial')
ORDER BY t.transaction_date DESC;

-- View for transaction details (with all related info)
CREATE OR REPLACE VIEW v_transaction_details AS
SELECT 
    t.id,
    t.transaction_number,
    t.transaction_date,
    l.name AS location_name,
    mc.name AS material_category,
    t.source_type,
    CASE 
        WHEN t.source_type = 'apartment' THEN ac.name || ' - Unit ' || t.apartment_unit
        WHEN t.source_type = 'waste_picker' THEN wp.first_name || ' ' || wp.last_name
    END AS source_name,
    t.weight_kg,
    t.quality_grade,
    t.unit_price,
    t.total_cost,
    t.payment_status,
    t.payment_method,
    t.paid_amount,
    t.paid_at,
    u.first_name || ' ' || u.last_name AS recorded_by_name,
    t.notes,
    t.is_synced,
    t.created_at
FROM transaction t
JOIN location l ON t.location_id = l.id
JOIN material_category mc ON t.material_category_id = mc.id
JOIN "user" u ON t.recorded_by = u.id
LEFT JOIN apartment_complex ac ON t.apartment_complex_id = ac.id
LEFT JOIN waste_picker wp ON t.waste_picker_id = wp.id;

-- View for sales details
CREATE OR REPLACE VIEW v_sale_details AS
SELECT 
    s.id,
    s.sale_number,
    s.sale_date,
    c.name AS client_name,
    c.contact_name AS client_contact,
    c.contact_phone AS client_phone,
    l.name AS location_name,
    mc.name AS material_category,
    s.weight_kg,
    s.unit_price,
    s.total_amount,
    s.payment_status,
    s.payment_method,
    s.paid_amount,
    s.paid_at,
    s.delivery_status,
    s.delivered_at,
    u.first_name || ' ' || u.last_name AS created_by_name,
    s.notes,
    s.created_at
FROM sale s
JOIN client c ON s.client_id = c.id
JOIN location l ON s.location_id = l.id
JOIN material_category mc ON s.material_category_id = mc.id
JOIN "user" u ON s.created_by = u.id;

-- Function to refresh materialized views
CREATE OR REPLACE FUNCTION refresh_reporting_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_weekly_apartment_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_waste_picker_monthly_summary;
    REFRESH MATERIALIZED VIEW CONCURRENTLY mv_location_daily_summary;
END;
$$ LANGUAGE plpgsql;

-- Create a function to get transaction trends
CREATE OR REPLACE FUNCTION get_transaction_trends(
    p_location_id UUID DEFAULT NULL,
    p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
    date DATE,
    total_weight_kg DECIMAL(12,3),
    total_transactions BIGINT,
    total_value DECIMAL(12,2),
    unique_sources BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        DATE(t.transaction_date) AS date,
        SUM(t.weight_kg) AS total_weight_kg,
        COUNT(t.id) AS total_transactions,
        SUM(t.total_cost) AS total_value,
        COUNT(DISTINCT COALESCE(t.waste_picker_id::TEXT, t.apartment_complex_id::TEXT)) AS unique_sources
    FROM transaction t
    WHERE (p_location_id IS NULL OR t.location_id = p_location_id)
      AND t.transaction_date >= CURRENT_DATE - p_days
    GROUP BY DATE(t.transaction_date)
    ORDER BY DATE(t.transaction_date) DESC;
END;
$$ LANGUAGE plpgsql;
