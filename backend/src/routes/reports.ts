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