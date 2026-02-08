import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import bcrypt from 'bcrypt';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const result = await query('SELECT id, email, first_name, last_name, role, location_id, is_active FROM "user" ORDER BY first_name, last_name');
    res.json({ users: result.rows });
  } catch (error) {
    next(error);
  }
});

router.post('/', authorize('admin'), async (req, res, next) => {
  try {
    const { email, password, firstName, lastName, role, locationId } = req.body;
    const passwordHash = await bcrypt.hash(password, 10);
    const result = await query(
      'INSERT INTO "user" (email, password_hash, first_name, last_name, role, location_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, first_name, last_name, role, location_id',
      [email, passwordHash, firstName, lastName, role, locationId]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
