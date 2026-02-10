import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

router.get('/', async (req, res, next) => {
  try {
    const { search } = req.query;
    let queryText = 'SELECT * FROM waste_picker WHERE is_active = true';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      queryText += ' AND (first_name ILIKE $1 OR last_name ILIKE $1 OR id_number ILIKE $1)';
    }

    queryText += ' ORDER BY first_name, last_name';

    const result = await query(queryText, params);
    res.json({ wastePickers: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next): Promise<any> => {
  try {
    const result = await query('SELECT * FROM waste_picker WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Waste picker not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { firstName, lastName, idNumber, phone, email, address, isAffiliated, bankName, bankAccount, paymentMethod } = req.body;
    const result = await query(
      `INSERT INTO waste_picker (first_name, last_name, id_number, phone, email, address, is_affiliated, bank_name, bank_account, payment_method)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [firstName, lastName, idNumber, phone, email, address, isAffiliated, bankName, bankAccount, paymentMethod]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.put('/:id', authorize('admin', 'manager'), async (req, res, next): Promise<any> => {
  try {
    const { firstName, lastName, phone, email, address, isAffiliated, bankName, bankAccount, paymentMethod, isActive } = req.body;
    const result = await query(
      `UPDATE waste_picker SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        phone = COALESCE($3, phone),
        email = COALESCE($4, email),
        address = COALESCE($5, address),
        is_affiliated = COALESCE($6, is_affiliated),
        bank_name = COALESCE($7, bank_name),
        bank_account = COALESCE($8, bank_account),
        payment_method = COALESCE($9, payment_method),
        is_active = COALESCE($10, is_active)
      WHERE id = $11 RETURNING *`,
      [firstName, lastName, phone, email, address, isAffiliated, bankName, bankAccount, paymentMethod, isActive, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Waste picker not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authorize('admin'), async (req, res, next): Promise<any> => {
  try {
    const result = await query(
      'UPDATE waste_picker SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Waste picker not found' });
    }
    res.json({ message: 'Waste picker deactivated' });
  } catch (error) {
    next(error);
  }
});

export default router;
