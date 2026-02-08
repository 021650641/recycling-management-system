import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM apartment_complex WHERE is_active = true ORDER BY name');
    res.json({ apartments: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const result = await query('SELECT * FROM apartment_complex WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Apartment complex not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { name, address, totalUnits, contactName, contactPhone, contactEmail } = req.body;
    const result = await query(
      'INSERT INTO apartment_complex (name, address, total_units, contact_name, contact_phone, contact_email) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, address, totalUnits, contactName, contactPhone, contactEmail]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
