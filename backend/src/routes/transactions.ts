import { Router } from 'express';
import { query, transaction } from '../db';
import { authenticate, authorize } from '../middleware/auth';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create transaction
router.post('/', authorize('admin', 'manager', 'operator'), async (req: any, res, next) => {
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

    // Apply user location filter if not admin
    if (req.user.role !== 'admin' && req.user.locationId) {
      params.push(req.user.locationId);
      queryText += ` AND location_name = (SELECT name FROM location WHERE id = $${paramCount++})`;
    }

    params.push(limit, offset);
    queryText += ` ORDER BY transaction_date DESC LIMIT $${paramCount++} OFFSET $${paramCount++}`;

    const result = await query(queryText, params);

    res.json({
      transactions: result.rows,
      total: result.rowCount,
      limit: parseInt(limit),
      offset: parseInt(offset),
    });
  } catch (error) {
    next(error);
  }
});

// Get transaction by ID
router.get('/:id', async (req, res, next) => {
  try {
    const result = await query(
      'SELECT * FROM v_transaction_details WHERE id = $1',
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
router.patch('/:id/payment', authorize('admin', 'manager'), async (req: any, res, next) => {
  try {
    const { paymentStatus, paidAmount, paymentMethod, paymentReference } = req.body;

    const result = await query(
      `UPDATE transaction 
       SET payment_status = $1, paid_amount = $2, payment_method = $3, 
           payment_reference = $4, paid_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [paymentStatus, paidAmount, paymentMethod, paymentReference, req.params.id]
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
