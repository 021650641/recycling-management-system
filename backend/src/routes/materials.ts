import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM material_category WHERE is_active = true ORDER BY name');
    res.json({ materials: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get latest prices (one per material) for a given date
router.get('/prices', async (req, res, next) => {
  try {
    const { date, locationId } = req.query;
    const asOfDate = date || new Date().toISOString().split('T')[0];

    let queryText = `
      SELECT DISTINCT ON (dp.material_category_id)
        dp.*, mc.name as material_name,
        dp.valid_from_time, dp.valid_to_time
      FROM daily_price dp
      JOIN material_category mc ON dp.material_category_id = mc.id
      WHERE dp.date <= $1
    `;
    const params: any[] = [asOfDate];

    if (locationId) {
      params.push(locationId);
      queryText += ` AND (dp.location_id = $2 OR dp.location_id IS NULL)`;
    }

    queryText += ` ORDER BY dp.material_category_id, dp.date DESC, dp.location_id DESC NULLS LAST`;

    const result = await query(queryText, params);
    res.json({ prices: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get all prices with filtering (for the full price list view)
router.get('/prices/all', async (req, res, next) => {
  try {
    const { showExpired, filterDate, locationId } = req.query;
    const today = new Date().toISOString().split('T')[0];

    let queryText = `
      SELECT dp.*, mc.name as material_name
      FROM daily_price dp
      JOIN material_category mc ON dp.material_category_id = mc.id
      WHERE 1=1
    `;
    const params: any[] = [];
    let paramIdx = 1;

    // If not showing expired, only show today and future
    if (showExpired !== 'true') {
      params.push(today);
      queryText += ` AND dp.date >= $${paramIdx}`;
      paramIdx++;
    }

    // If filtering by a specific date
    if (filterDate) {
      params.push(filterDate);
      queryText += ` AND dp.date = $${paramIdx}`;
      paramIdx++;
    }

    if (locationId) {
      params.push(locationId);
      queryText += ` AND (dp.location_id = $${paramIdx} OR dp.location_id IS NULL)`;
      paramIdx++;
    }

    queryText += ` ORDER BY dp.date DESC, mc.name ASC, dp.valid_from_time ASC`;

    const result = await query(queryText, params);
    res.json({ prices: result.rows });
  } catch (error) {
    next(error);
  }
});

// Create or update a single price
router.post('/prices', authorize('admin', 'manager'), async (req: any, res, next) => {
  try {
    const { materialCategoryId, locationId, date, purchasePricePerKg, salePricePerKg, validFromTime, validToTime } = req.body;
    const fromTime = validFromTime || '00:00:00';
    const toTime = validToTime || '23:59:59';

    const result = await query(
      `INSERT INTO daily_price (material_category_id, location_id, date, purchase_price_per_kg, sale_price_per_kg, valid_from_time, valid_to_time, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (material_category_id, location_id, date, valid_from_time)
       DO UPDATE SET purchase_price_per_kg = $4, sale_price_per_kg = $5, valid_to_time = $7
       RETURNING *`,
      [materialCategoryId, locationId, date, purchasePricePerKg, salePricePerKg, fromTime, toTime, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Bulk save prices (save all materials at once for a given date)
router.post('/prices/bulk', authorize('admin', 'manager'), async (req: any, res, next) => {
  try {
    const { prices } = req.body;
    if (!Array.isArray(prices) || prices.length === 0) {
      res.status(400).json({ message: 'prices array is required' });
      return;
    }

    const results = [];
    for (const p of prices) {
      const fromTime = p.validFromTime || '00:00:00';
      const toTime = p.validToTime || '23:59:59';

      const result = await query(
        `INSERT INTO daily_price (material_category_id, location_id, date, purchase_price_per_kg, sale_price_per_kg, valid_from_time, valid_to_time, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (material_category_id, location_id, date, valid_from_time)
         DO UPDATE SET purchase_price_per_kg = $4, sale_price_per_kg = $5, valid_to_time = $7
         RETURNING *`,
        [p.materialCategoryId, p.locationId || null, p.date, p.purchasePricePerKg, p.salePricePerKg, fromTime, toTime, req.user.id]
      );
      results.push(result.rows[0]);
    }

    res.status(201).json({ prices: results, count: results.length });
  } catch (error) {
    next(error);
  }
});

export default router;
