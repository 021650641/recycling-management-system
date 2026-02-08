import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM location WHERE is_active = true ORDER BY name');
    res.json({ locations: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM location WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Location not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const { coopId, name, address, phone, managerName } = req.body;
    const result = await query(
      'INSERT INTO location (coop_id, name, address, phone, manager_name) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [coopId, name, address, phone, managerName]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
