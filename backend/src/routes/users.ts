import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import bcrypt from 'bcrypt';

const router = Router();
router.use(authenticate);

router.get('/', authorize('admin', 'manager'), async (_req, res, next) => {
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

router.put('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { email, password, firstName, lastName, role, locationId } = req.body;

    let result;
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      result = await query(
        'UPDATE "user" SET email=$1, password_hash=$2, first_name=$3, last_name=$4, role=$5, location_id=$6 WHERE id=$7 RETURNING id, email, first_name, last_name, role, location_id, is_active',
        [email, passwordHash, firstName, lastName, role, locationId || null, id]
      );
    } else {
      result = await query(
        'UPDATE "user" SET email=$1, first_name=$2, last_name=$3, role=$4, location_id=$5 WHERE id=$6 RETURNING id, email, first_name, last_name, role, location_id, is_active',
        [email, firstName, lastName, role, locationId || null, id]
      );
    }

    if (result.rows.length === 0) {
      res.status(404).json({ message: 'User not found' });
    } else {
      res.json(result.rows[0]);
    }
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authorize('admin'), async (req, res, next) => {
  try {
    const { id } = req.params;
    const result = await query(
      'UPDATE "user" SET is_active = false WHERE id=$1 RETURNING id',
      [id]
    );
    if (result.rows.length === 0) {
      res.status(404).json({ message: 'User not found' });
    } else {
      res.json({ message: 'User deactivated' });
    }
  } catch (error) {
    next(error);
  }
});

export default router;