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

    queryText += ' ORDER BY material_category, apartment_name, waste_picker_name';

    const result = await query(queryText, params);

    res.json({ payments: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get dashboard summary
router.get('/summary', async (req: any, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Get purchase and sales counts
    const transactionsResult = await query(
      `SELECT 
        COUNT(CASE WHEN source_type IN ('apartment', 'waste_picker') THEN 1 END) as purchases,
        COUNT(CASE WHEN source_type = 'sale' THEN 1 END) as sales
       FROM transaction 
       WHERE transaction_date BETWEEN $1 AND $2`,
      [startDate, endDate]
    );

    // Get total current stock
    const stockResult = await query(
      `SELECT COALESCE(SUM(current_stock_kg), 0) as total_stock
       FROM material`
    );

    // Get pending payments
    const paymentsResult = await query(
      `SELECT COALESCE(SUM(total_cost), 0) as pending
       FROM transaction 
       WHERE payment_status = 'pending'
         AND transaction_date BETWEEN $1 AND $2`,
      [startDate, endDate]
    );

    res.json({
      totalPurchases: parseInt(transactionsResult.rows[0].purchases || 0),
      totalSales: parseInt(transactionsResult.rows[0].sales || 0),
      totalStock: parseFloat(stockResult.rows[0].total_stock || 0),
      pendingPayments: parseFloat(paymentsResult.rows[0].pending || 0)
    });
  } catch (error) {
    next(error);
  }
});

export default router;