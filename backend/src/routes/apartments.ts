import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// ─── Apartment Complexes ───

router.get('/', async (_req, res, next) => {
  try {
    const result = await query('SELECT * FROM apartment_complex WHERE is_active = true ORDER BY name');
    res.json({ apartments: result.rows });
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next): Promise<any> => {
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

router.put('/:id', authorize('admin', 'manager'), async (req, res, next): Promise<any> => {
  try {
    const { name, address, totalUnits, contactName, contactPhone, contactEmail, isActive } = req.body;
    const result = await query(
      `UPDATE apartment_complex SET
        name = COALESCE($1, name),
        address = COALESCE($2, address),
        total_units = COALESCE($3, total_units),
        contact_name = COALESCE($4, contact_name),
        contact_phone = COALESCE($5, contact_phone),
        contact_email = COALESCE($6, contact_email),
        is_active = COALESCE($7, is_active)
      WHERE id = $8 RETURNING *`,
      [name, address, totalUnits, contactName, contactPhone, contactEmail, isActive, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Apartment complex not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', authorize('admin'), async (req, res, next): Promise<any> => {
  try {
    const result = await query(
      'UPDATE apartment_complex SET is_active = false WHERE id = $1 RETURNING *',
      [req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Apartment complex not found' });
    }
    res.json({ message: 'Apartment complex deactivated' });
  } catch (error) {
    next(error);
  }
});

// ─── Apartment Units (individual dwellings) ───

// Get all units for a complex
router.get('/:id/units', async (req, res, next) => {
  try {
    const result = await query(
      `SELECT au.*,
        (SELECT COUNT(*) FROM transaction t WHERE t.apartment_unit_id = au.id) AS transaction_count,
        (SELECT COALESCE(SUM(t.weight_kg), 0) FROM transaction t WHERE t.apartment_unit_id = au.id) AS total_weight_kg
      FROM apartment_unit au
      WHERE au.apartment_complex_id = $1
      ORDER BY au.unit_number`,
      [req.params.id]
    );
    res.json({ units: result.rows });
  } catch (error) {
    next(error);
  }
});

// Get single unit with transaction history
router.get('/:id/units/:unitId', async (req, res, next): Promise<any> => {
  try {
    const unitResult = await query(
      'SELECT * FROM apartment_unit WHERE id = $1 AND apartment_complex_id = $2',
      [req.params.unitId, req.params.id]
    );
    if (unitResult.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }

    // Get recent transactions for this unit
    const txResult = await query(
      `SELECT t.id, t.transaction_number, t.transaction_date, mc.name AS material_category,
              t.weight_kg, t.quality_grade, t.unit_price, t.total_cost, t.payment_status
       FROM transaction t
       JOIN material_category mc ON t.material_category_id = mc.id
       WHERE t.apartment_unit_id = $1
       ORDER BY t.transaction_date DESC
       LIMIT 50`,
      [req.params.unitId]
    );

    res.json({
      unit: unitResult.rows[0],
      transactions: txResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Create unit
router.post('/:id/units', authorize('admin', 'manager', 'operator'), async (req, res, next): Promise<any> => {
  try {
    const { unitNumber, residentName, residentPhone, residentEmail, floor, notes } = req.body;

    if (!unitNumber) {
      return res.status(400).json({ error: 'Unit number is required' });
    }

    const result = await query(
      `INSERT INTO apartment_unit (apartment_complex_id, unit_number, resident_name, resident_phone, resident_email, floor, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [req.params.id, unitNumber, residentName, residentPhone, residentEmail, floor, notes]
    );
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A unit with this number already exists in this complex' });
    }
    next(error);
  }
});

// Update unit
router.put('/:id/units/:unitId', authorize('admin', 'manager', 'operator'), async (req, res, next): Promise<any> => {
  try {
    const { unitNumber, residentName, residentPhone, residentEmail, floor, notes, isActive } = req.body;
    const result = await query(
      `UPDATE apartment_unit SET
        unit_number = COALESCE($1, unit_number),
        resident_name = COALESCE($2, resident_name),
        resident_phone = COALESCE($3, resident_phone),
        resident_email = COALESCE($4, resident_email),
        floor = COALESCE($5, floor),
        notes = COALESCE($6, notes),
        is_active = COALESCE($7, is_active),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $8 AND apartment_complex_id = $9 RETURNING *`,
      [unitNumber, residentName, residentPhone, residentEmail, floor, notes, isActive, req.params.unitId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A unit with this number already exists in this complex' });
    }
    next(error);
  }
});

// Delete (soft-delete) unit
router.delete('/:id/units/:unitId', authorize('admin', 'manager'), async (req, res, next): Promise<any> => {
  try {
    const result = await query(
      'UPDATE apartment_unit SET is_active = false WHERE id = $1 AND apartment_complex_id = $2 RETURNING *',
      [req.params.unitId, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Unit not found' });
    }
    res.json({ message: 'Unit deactivated' });
  } catch (error) {
    next(error);
  }
});

// Bulk create units (e.g., for a new complex with numbered units)
router.post('/:id/units/bulk', authorize('admin', 'manager'), async (req, res, next): Promise<any> => {
  try {
    const { units } = req.body;
    if (!Array.isArray(units) || units.length === 0) {
      return res.status(400).json({ error: 'units array is required' });
    }

    const results = [];
    for (const unit of units) {
      try {
        const result = await query(
          `INSERT INTO apartment_unit (apartment_complex_id, unit_number, resident_name, floor)
           VALUES ($1, $2, $3, $4)
           ON CONFLICT (apartment_complex_id, unit_number) DO NOTHING
           RETURNING *`,
          [req.params.id, unit.unitNumber, unit.residentName || null, unit.floor || null]
        );
        if (result.rows.length > 0) {
          results.push(result.rows[0]);
        }
      } catch {
        // Skip individual failures
      }
    }
    res.status(201).json({ created: results.length, units: results });
  } catch (error) {
    next(error);
  }
});

export default router;
