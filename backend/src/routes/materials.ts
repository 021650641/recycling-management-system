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

router.get('/prices', async (req, res, next) => {
  try {
    const { date, locationId } = req.query;
    let queryText = 'SELECT dp.*, mc.name as material_name FROM daily_price dp JOIN material_category mc ON dp.material_category_id = mc.id WHERE date = $1';
    const params: any[] = [date || new Date().toISOString().split('T')[0]];

    if (locationId) {
      params.push(locationId);
      queryText += ' AND (location_id = $2 OR location_id IS NULL)';
    } else {
      queryText += ' AND location_id IS NULL';
    }

    const result = await query(queryText, params);
    res.json({ prices: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/prices', authorize('admin', 'manager'), async (req: any, res, next) => {
  try {
    const { materialCategoryId, locationId, date, purchasePricePerKg, salePricePerKg } = req.body;
    const result = await query(
      `INSERT INTO daily_price (material_category_id, location_id, date, purchase_price_per_kg, sale_price_per_kg, created_by)
       VALUES ($1, $2, $3, $4, $5, $6) 
       ON CONFLICT (material_category_id, location_id, date) 
       DO UPDATE SET purchase_price_per_kg = $4, sale_price_per_kg = $5
       RETURNING *`,
      [materialCategoryId, locationId, date, purchasePricePerKg, salePricePerKg, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;