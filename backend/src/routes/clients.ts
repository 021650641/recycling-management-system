import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM client WHERE is_active = true ORDER BY name');
    res.json({ clients: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { name, contactName, contactPhone, contactEmail, address, paymentTerms } = req.body;
    const result = await query(
      'INSERT INTO client (name, contact_name, contact_phone, contact_email, address, payment_terms) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [name, contactName, contactPhone, contactEmail, address, paymentTerms]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;