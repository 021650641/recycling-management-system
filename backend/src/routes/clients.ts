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

router.get('/:id', async (req, res, next): Promise<any> => {
  try {
    const result = await query('SELECT * FROM client WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(result.rows[0]);
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

router.put('/:id', authorize('admin', 'manager'), async (req, res, next): Promise<any> => {
  try {
    const { name, contactName, contactPhone, contactEmail, address, paymentTerms, isActive } = req.body;
    const result = await query(
      `UPDATE client SET
        name = COALESCE($1, name),
        contact_name = COALESCE($2, contact_name),
        contact_phone = COALESCE($3, contact_phone),
        contact_email = COALESCE($4, contact_email),
        address = COALESCE($5, address),
        payment_terms = COALESCE($6, payment_terms),
        is_active = COALESCE($7, is_active)
      WHERE id = $8 RETURNING *`,
      [name, contactName, contactPhone, contactEmail, address, paymentTerms, isActive, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authorize('admin'), async (req, res, next): Promise<any> => {
  try {
    const result = await query(
      'UPDATE client SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Client not found' });
    }
    res.json({ message: 'Client deactivated' });
  } catch (error) {
    next(error);
  }
});

export default router;
