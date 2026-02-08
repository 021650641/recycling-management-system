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
router.get('/apartment-summary', async (req, res, next) => {
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
      queryText += ' AND location_name = (SELECT name FROM location WHERE id = $1)';
    }

    const result = await query(queryText, params);

    res.json({ pendingPayments: result.rows });
  } catch (error) {
    next(error);
  }
});

// Refresh materialized views
router.post('/refresh-views', authorize('admin'), async (req, res, next) => {
  try {
    await query('SELECT refresh_reporting_views()');
    res.json({ message: 'Views refreshed successfully' });
  } catch (error) {
    next(error);
  }
});

export default router;
