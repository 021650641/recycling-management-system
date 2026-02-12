import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import logger from '../services/logger';
import { sendPurchaseConfirmation } from '../services/confirmationService';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Create transaction
router.post('/', authorize('admin', 'manager', 'operator'), async (req: any, res, next): Promise<any> => {
  try {
    const {
      locationId,
      materialCategoryId,
      apartmentComplexId,
      apartmentUnitId,
      wastePickerId,
      weightKg,
      qualityGrade,
      paymentMethod,
      notes,
      deviceId,
    } = req.body;

    // Validation - waste picker is always required (they are the seller)
    if (!locationId || !materialCategoryId || !weightKg || !wastePickerId) {
      return res.status(400).json({ error: 'Missing required fields: location, material, weight, and waste picker are required' });
    }

    // Auto-derive source_type: if apartment info provided, it's 'apartment', otherwise 'waste_picker'
    const sourceType = apartmentComplexId ? 'apartment' : 'waste_picker';

    // Get current price from daily_price table
    const priceResult = await query(
      `SELECT purchase_price_per_kg FROM daily_price
       WHERE material_category_id = $1
         AND (location_id = $2 OR location_id IS NULL)
         AND date <= CURRENT_DATE
       ORDER BY date DESC, location_id DESC NULLS LAST
       LIMIT 1`,
      [materialCategoryId, locationId]
    );

    const unitPrice = priceResult.rows[0]?.purchase_price_per_kg;

    if (!unitPrice) {
      return res.status(400).json({ error: 'No price configured for this material. Please set a daily price first.' });
    }

    const totalCost = (parseFloat(weightKg) * parseFloat(unitPrice)).toFixed(2);

    // Generate transaction number
    const transactionNumber = `TX-${Date.now().toString(36).toUpperCase()}`;

    // Insert transaction
    const result = await query(
      `INSERT INTO transaction (
        transaction_number, location_id, material_category_id, source_type,
        apartment_complex_id, apartment_unit_id, waste_picker_id,
        weight_kg, quality_grade, unit_price, total_cost,
        payment_method, notes, recorded_by, device_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *`,
      [
        transactionNumber, locationId, materialCategoryId, sourceType,
        apartmentComplexId || null, apartmentUnitId || null, wastePickerId,
        weightKg, qualityGrade || 'standard', unitPrice, totalCost,
        paymentMethod || 'cash', notes || null, req.user.id, deviceId || null
      ]
    );

    logger.info(`Transaction created: ${transactionNumber}`, { userId: req.user.id, weight: weightKg, material: materialCategoryId });

    // Send confirmation email (async, don't block response)
    sendPurchaseConfirmation(result.rows[0].id).catch(() => {});

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
    const { paymentStatus, paidAmount, paymentMethod, paymentReference } = req.body;

    const result = await query(
      `UPDATE transaction
       SET payment_status = COALESCE($1, payment_status),
           paid_amount = COALESCE($2, paid_amount),
           payment_method = COALESCE($3, payment_method),
           payment_reference = COALESCE($4, payment_reference),
           paid_at = CASE WHEN $1 = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5
       RETURNING *`,
      [paymentStatus, paidAmount, paymentMethod, paymentReference, req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
    return;
  }
});

// Update transaction notes
router.patch('/:id/notes', authorize('admin', 'manager', 'operator'), async (req, res, next) => {
  try {
    const { notes } = req.body;
    const result = await query(
      'UPDATE transaction SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    next(error);
    return;
  }
});

// Void/reverse a transaction (purchase)
router.post('/:id/void', authorize('admin', 'manager'), async (req: any, res, next) => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason is required when voiding a transaction' });
    }

    const original = await query('SELECT * FROM transaction WHERE id = $1', [req.params.id]);
    if (original.rows.length === 0) {
      return res.status(404).json({ error: 'Transaction not found' });
    }

    const tx = original.rows[0];

    if (tx.transaction_number.startsWith('REV-')) {
      return res.status(400).json({ error: 'Cannot void a reversal transaction' });
    }

    const existingReversal = await query(
      "SELECT id FROM transaction WHERE transaction_number = $1",
      [`REV-${tx.transaction_number}`]
    );
    if (existingReversal.rows.length > 0) {
      return res.status(400).json({ error: 'This transaction has already been voided' });
    }

    const reversalNumber = `REV-${tx.transaction_number}`;
    const result = await query(
      `INSERT INTO transaction (
        transaction_number, location_id, material_category_id, source_type,
        apartment_complex_id, apartment_unit_id, waste_picker_id,
        weight_kg, quality_grade, unit_price, total_cost,
        payment_status, payment_method, paid_amount,
        notes, recorded_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      RETURNING *`,
      [
        reversalNumber, tx.location_id, tx.material_category_id, tx.source_type,
        tx.apartment_complex_id, tx.apartment_unit_id, tx.waste_picker_id,
        -Math.abs(tx.weight_kg), tx.quality_grade, tx.unit_price, -Math.abs(tx.total_cost),
        'paid', tx.payment_method, -Math.abs(tx.paid_amount || 0),
        `Reversal of ${tx.transaction_number}. ${reason.trim()}`,
        req.user.id
      ]
    );

    logger.warn(`Transaction voided: ${tx.transaction_number} -> ${reversalNumber}`, { userId: req.user.id, reason: reason.trim() });
    return res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
    return;
  }
});

export default router;