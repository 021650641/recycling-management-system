import { Router } from 'express';
import { query } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Get inventory status
router.get('/', async (req: any, res, next) => {
  try {
    const { locationId } = req.query;

    let queryText = 'SELECT * FROM v_inventory_status WHERE 1=1';
    const params: any[] = [];

    if (locationId) {
      params.push(locationId);
      queryText += ' AND location_id = $1';
    } else if (req.user.role !== 'admin' && req.user.locationId) {
      params.push(req.user.locationId);
      queryText += ' AND location_id = $1';
    }

    queryText += ' ORDER BY location_name, material_category';

    const result = await query(queryText, params);

    res.json({ inventory: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get inventory by location and material
router.get('/:locationId/:materialId', async (req, res, next): Promise<any> => {
  try {
    const result = await query(
      'SELECT * FROM inventory WHERE location_id = $1 AND material_category_id = $2',
      [req.params.locationId, req.params.materialId]
    );

    if (result.rows.length === 0) {
      return res.json({ quantity_kg: 0 });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;