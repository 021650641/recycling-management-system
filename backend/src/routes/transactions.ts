import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create transaction
router.post('/', authorize('admin', 'manager', 'operator'), async (req: any, res, next): Promise<any> => {
  try {
    const {
      locationId,
      materialCategoryId,
      sourceType,
      apartmentComplexId,
      apartmentUnit,
      wastePickerId,
      weightKg,
      qualityGrade,
      paymentMethod,
      notes,
      deviceId,
    } = req.body;

    // Validation
    if (!locationId || !materialCategoryId || !sourceType || !weightKg) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (sourceType === 'apartment' && !apartmentComplexId) {
      return res.status(400).json({ error: 'Apartment complex ID required for apartment source' });
    }

    if (sourceType === 'waste_picker' && !wastePickerId) {
      return res.status(400).json({ error: 'Waste picker ID required for waste picker source' });
    }

    // Get current price
    const priceResult = await query(
      'SELECT get_current_price($1, $2, CURRENT_DATE, $3) as price',
      [materialCategoryId, locationId, 'purchase']
    );

    const unitPrice = priceResult.rows[0]?.price;

    if (!unitPrice) {
      return res.status(400).json({ error: 'No price configured for this material' });
    }

    const totalCost = (parseFloat(weightKg) * parseFloat(unitPrice)).toFixed(2);

    // Insert transaction
    const result = await query(
      `INSERT INTO transaction (
        location_id, material_category_id, source_type,
        apartment_complex_id, apartment_unit, waste_picker_id,
        weight_kg, quality_grade, unit_price, total_cost,
        payment_method, notes, recorded_by, device_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *`,
      [
        locationId, materialCategoryId, sourceType,
        apartmentComplexId, apartmentUnit, wastePickerId,
        weightKg, qualityGrade || 'standard', unitPrice, totalCost,
        paymentMethod, notes, req.user.id, deviceId
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Get transactions
router.get('/', async (req: any, res, next) => {
  try {
    const { locationId, startDate, endDate, sourceType, limit = 50, offset = 0 } = req.query;

    let queryText = 'SELECT * FROM v_transaction_details WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (locationId) {
      params.push(locationId);
      queryText += ` AND location_name = (SELECT name FROM location WHERE id = $${paramCount++})`;
    }

    if (startDate) {
      params.push(startDate);
      queryText += ` AND transaction_date >= $${paramCount++}`;
    }

    if (endDate) {
      params.push(endDate);
      queryText += ` AND transaction_date <= $${paramCount++}`;
    }

    if (sourceType) {
      params.push(sourceType);
      queryText += ` AND source_type = $${paramCount++}`;
    }

    queryText += ' ORDER BY transaction_date DESC, created_at DESC';

    params.push(limit);
    queryText += ` LIMIT $${paramCount++}`;

    params.push(offset);
    queryText += ` OFFSET $${paramCount++}`;

    const result = await query(queryText, params);

    // Get total count
    let countQuery = 'SELECT COUNT(*) FROM v_transaction_details WHERE 1=1';
    const countParams = params.slice(0, -2); // Remove limit and offset

    if (locationId) countQuery += ' AND location_name = (SELECT name FROM location WHERE id = $1)';
    if (startDate) countQuery += ` AND transaction_date >= $${locationId ? 2 : 1}`;
    if (endDate) countQuery += ` AND transaction_date <= $${locationId && startDate ? 3 : locationId || startDate ? 2 : 1}`;
    if (sourceType) countQuery += ` AND source_type = $${countParams.length + 1}`;

    const countResult = await query(countQuery, countParams);

    res.json({
      transactions: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
});

// Get single transaction
router.get('/:id', async (req, res, next): Promise<any> => {
  try {
    const result = await query(
      'SELECT * FROM v_transaction_details WHERE transaction_id = $1',
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update payment status
router.patch('/:id/payment', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const { paymentStatus, paymentDate, paymentReference } = req.body;

    const result = await query(
      `UPDATE transaction 
       SET payment_status = $1, payment_date = $2, payment_reference = $3, updated_at = CURRENT_TIMESTAMP
       WHERE id = $4
       RETURNING *`,
      [paymentStatus, paymentDate, paymentReference, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;