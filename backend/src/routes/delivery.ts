import { Router } from 'express';
import { query } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// List delivery persons, ordered by most recently used
router.get('/persons', async (req, res, next) => {
  try {
    const { search } = req.query;
    let queryText = 'SELECT * FROM delivery_person';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      queryText += ` WHERE full_name ILIKE $1 OR id_card_number ILIKE $1`;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

// List delivery vehicles, ordered by most recently used
router.get('/vehicles', async (req, res, next) => {
  try {
    const { search } = req.query;
    let queryText = 'SELECT * FROM delivery_vehicle';
    const params: any[] = [];

    if (search) {
      params.push(`%${search}%`);
      queryText += ` WHERE vehicle_type ILIKE $1 OR registration_number ILIKE $1`;
    }

    queryText += ' ORDER BY created_at DESC';

    const result = await query(queryText, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

export default router;
