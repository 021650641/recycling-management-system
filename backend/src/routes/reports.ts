import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Get transaction trends
router.get('/trends', async (req: any, res, next) => {
  try {
    const { locationId, days = 30 } = req.query;

    const result = await query(
      'SELECT * FROM get_transaction_trends($1, $2)',
      [locationId || null, days]
    );

    res.json({ trends: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get apartment summary
router.get('/apartment-summary', async (req, res, next): Promise<any> => {
  try {
    const { apartmentId, materialName, startDate, endDate } = req.query;

    if (!apartmentId || !materialName || !startDate || !endDate) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const result = await query(
      'SELECT get_apartment_material_total($1, $2, $3, $4) as total_kg',
      [apartmentId, materialName, startDate, endDate]
    );

    res.json({ totalKg: result.rows[0].total_kg });
  } catch (error) {
    next(error);
  }
});

// Get weekly apartment summary
router.get('/weekly-apartment', async (req, res, next) => {
  try {
    const { weeks = 4 } = req.query;

    const result = await query(
      `SELECT * FROM mv_weekly_apartment_summary
       WHERE week_start >= CURRENT_DATE - INTERVAL '${weeks} weeks'
       ORDER BY week_start DESC, apartment_name, material_category`
    );

    res.json({ summary: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get waste picker monthly summary
router.get('/waste-picker-monthly', async (req, res, next) => {
  try {
    const { months = 3 } = req.query;

    const result = await query(
      `SELECT * FROM mv_waste_picker_monthly_summary
       WHERE month_start >= CURRENT_DATE - INTERVAL '${months} months'
       ORDER BY month_start DESC, waste_picker_name, material_category`
    );

    res.json({ summary: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get location daily summary
router.get('/location-daily', async (req, res, next) => {
  try {
    const { locationId, days = 30 } = req.query;

    let queryText = `SELECT * FROM mv_location_daily_summary
                     WHERE transaction_date >= CURRENT_DATE - INTERVAL '${days} days'`;
    const params: any[] = [];

    if (locationId) {
      params.push(locationId);
      queryText += ' AND location_id = $1';
    }

    queryText += ' ORDER BY transaction_date DESC, location_name, material_category';

    const result = await query(queryText, params);

    res.json({ summary: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get pending payments
router.get('/pending-payments', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { locationId } = req.query;

    let queryText = 'SELECT * FROM v_pending_payments WHERE 1=1';
    const params: any[] = [];

    if (locationId) {
      params.push(locationId);
      queryText += ' AND location_id = $1';
    }

    queryText += ' ORDER BY transaction_date';

    const result = await query(queryText, params);

    res.json({ payments: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get payment history
router.get('/payment-history', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { wastePickerId, startDate, endDate } = req.query;

    let queryText = 'SELECT * FROM v_payment_history WHERE 1=1';
    const params: any[] = [];

    if (wastePickerId) {
      params.push(wastePickerId);
      queryText += ` AND waste_picker_id = $${params.length}`;
    }

    if (startDate) {
      params.push(startDate);
      queryText += ` AND payment_date >= $${params.length}`;
    }

    if (endDate) {
      params.push(endDate);
      queryText += ` AND payment_date <= $${params.length}`;
    }

    queryText += ' ORDER BY payment_date DESC';

    const result = await query(queryText, params);

    res.json({ history: result.rows });
  } catch (error) {
    next(error);
  }
});

// Traceability report - full chain from source to buyer
router.get('/traceability', async (req, res, next) => {
  try {
    const { apartmentId, unitId, wastePickerId, materialId, startDate, endDate, days = 42 } = req.query;

    let queryText = `
      SELECT
        t.id AS transaction_id,
        t.transaction_number,
        t.transaction_date,
        t.source_type,
        CASE
          WHEN t.source_type = 'apartment' THEN ac.name || COALESCE(' - Unit ' || COALESCE(au.unit_number, t.apartment_unit), '')
          WHEN t.source_type = 'waste_picker' THEN wp.first_name || ' ' || wp.last_name
        END AS source_name,
        ac.id AS apartment_id,
        ac.name AS apartment_name,
        t.apartment_unit_id,
        au.unit_number AS apartment_unit_number,
        au.resident_name AS apartment_resident_name,
        t.apartment_unit AS apartment_unit_legacy,
        wp.id AS waste_picker_id,
        wp.first_name || ' ' || wp.last_name AS waste_picker_name,
        l.id AS location_id,
        l.name AS location_name,
        mc.id AS material_id,
        mc.name AS material_category,
        t.weight_kg,
        t.quality_grade,
        t.unit_price,
        t.total_cost,
        t.payment_status
      FROM transaction t
      JOIN location l ON t.location_id = l.id
      JOIN material_category mc ON t.material_category_id = mc.id
      LEFT JOIN apartment_complex ac ON t.apartment_complex_id = ac.id
      LEFT JOIN apartment_unit au ON t.apartment_unit_id = au.id
      LEFT JOIN waste_picker wp ON t.waste_picker_id = wp.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramCount = 1;

    if (apartmentId) {
      params.push(apartmentId);
      queryText += ` AND t.apartment_complex_id = $${paramCount++}`;
    }
    if (unitId) {
      params.push(unitId);
      queryText += ` AND t.apartment_unit_id = $${paramCount++}`;
    }
    if (wastePickerId) {
      params.push(wastePickerId);
      queryText += ` AND t.waste_picker_id = $${paramCount++}`;
    }
    if (materialId) {
      params.push(materialId);
      queryText += ` AND t.material_category_id = $${paramCount++}`;
    }
    if (startDate) {
      params.push(startDate);
      queryText += ` AND t.transaction_date >= $${paramCount++}`;
    } else if (!endDate) {
      params.push(days);
      queryText += ` AND t.transaction_date >= CURRENT_DATE - ($${paramCount++} || ' days')::INTERVAL`;
    }
    if (endDate) {
      params.push(endDate);
      queryText += ` AND t.transaction_date <= $${paramCount++}`;
    }

    queryText += ' ORDER BY t.transaction_date DESC';

    const result = await query(queryText, params);

    // Aggregated summary grouped by source + unit + material
    let summaryQuery = `
      SELECT
        t.source_type,
        CASE
          WHEN t.source_type = 'apartment' THEN ac.name || COALESCE(' - Unit ' || COALESCE(au.unit_number, t.apartment_unit), '')
          WHEN t.source_type = 'waste_picker' THEN wp.first_name || ' ' || wp.last_name
        END AS source_name,
        au.unit_number,
        au.resident_name,
        mc.name AS material_category,
        SUM(t.weight_kg) AS total_weight_kg,
        COUNT(t.id) AS transaction_count,
        SUM(t.total_cost) AS total_cost,
        MIN(t.transaction_date) AS first_transaction,
        MAX(t.transaction_date) AS last_transaction
      FROM transaction t
      JOIN material_category mc ON t.material_category_id = mc.id
      LEFT JOIN apartment_complex ac ON t.apartment_complex_id = ac.id
      LEFT JOIN apartment_unit au ON t.apartment_unit_id = au.id
      LEFT JOIN waste_picker wp ON t.waste_picker_id = wp.id
      WHERE 1=1
    `;
    const summaryParams: any[] = [];
    let sParamCount = 1;
    if (apartmentId) { summaryParams.push(apartmentId); summaryQuery += ` AND t.apartment_complex_id = $${sParamCount++}`; }
    if (unitId) { summaryParams.push(unitId); summaryQuery += ` AND t.apartment_unit_id = $${sParamCount++}`; }
    if (wastePickerId) { summaryParams.push(wastePickerId); summaryQuery += ` AND t.waste_picker_id = $${sParamCount++}`; }
    if (materialId) { summaryParams.push(materialId); summaryQuery += ` AND t.material_category_id = $${sParamCount++}`; }
    if (startDate) { summaryParams.push(startDate); summaryQuery += ` AND t.transaction_date >= $${sParamCount++}`; }
    else if (!endDate) { summaryParams.push(days); summaryQuery += ` AND t.transaction_date >= CURRENT_DATE - ($${sParamCount++} || ' days')::INTERVAL`; }
    if (endDate) { summaryParams.push(endDate); summaryQuery += ` AND t.transaction_date <= $${sParamCount++}`; }

    summaryQuery += ` GROUP BY t.source_type, source_name, au.unit_number, au.resident_name, mc.name
                      ORDER BY total_weight_kg DESC`;

    const summaryResult = await query(summaryQuery, summaryParams);

    res.json({
      transactions: result.rows,
      summary: summaryResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Get summary statistics
router.get('/summary', async (req, res, next) => {
  try {
    const { locationId } = req.query;

    // Get total materials collected
    let materialsQuery = `
      SELECT COALESCE(SUM(quantity_kg), 0) as total_kg
      FROM transactions
      WHERE 1=1
    `;
    const materialsParams: any[] = [];

    if (locationId) {
      materialsParams.push(locationId);
      materialsQuery += ' AND location_id = $1';
    }

    const materialsResult = await query(materialsQuery, materialsParams);

    // Get active locations count
    let locationsQuery = `
      SELECT COUNT(DISTINCT id) as count
      FROM locations
      WHERE active = true
    `;
    const locationsParams: any[] = [];

    if (locationId) {
      locationsParams.push(locationId);
      locationsQuery += ' AND id = $1';
    }

    const locationsResult = await query(locationsQuery, locationsParams);

    // Get active waste pickers count
    const pickersResult = await query(`
      SELECT COUNT(DISTINCT id) as count
      FROM users
      WHERE role = 'waste_picker' AND active = true
    `);

    // Get pending payments total
    let paymentsQuery = `
      SELECT COALESCE(SUM(amount_due), 0) as total
      FROM v_pending_payments
      WHERE 1=1
    `;
    const paymentsParams: any[] = [];

    if (locationId) {
      paymentsParams.push(locationId);
      paymentsQuery += ' AND location_id = $1';
    }

    const paymentsResult = await query(paymentsQuery, paymentsParams);

    res.json({
      totalMaterialsKg: parseFloat(materialsResult.rows[0].total_kg) || 0,
      activeLocations: parseInt(locationsResult.rows[0].count) || 0,
      activeWastePickers: parseInt(pickersResult.rows[0].count) || 0,
      pendingPayments: parseFloat(paymentsResult.rows[0].total) || 0
    });
  } catch (error) {
    next(error);
  }
});

export default router;