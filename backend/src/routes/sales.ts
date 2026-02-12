import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';
import logger from '../services/logger';
import { sendSaleConfirmation } from '../services/confirmationService';

const router = Router();
router.use(authenticate);

// List sales
router.get('/', async (req, res, next) => {
  try {
    const { clientId, locationId, startDate, endDate, limit = 50, offset = 0 } = req.query;
    let queryText = 'SELECT * FROM v_sale_details WHERE 1=1';
    const params: any[] = [];
    let paramCount = 1;

    if (clientId) {
      params.push(clientId);
      queryText += ` AND client_name = (SELECT name FROM client WHERE id = $${paramCount++})`;
    }
    if (locationId) {
      params.push(locationId);
      queryText += ` AND location_name = (SELECT name FROM location WHERE id = $${paramCount++})`;
    }
    if (startDate) {
      params.push(startDate);
      queryText += ` AND sale_date >= $${paramCount++}`;
    }
    if (endDate) {
      params.push(endDate);
      queryText += ` AND sale_date <= $${paramCount++}`;
    }

    queryText += ' ORDER BY sale_date DESC, created_at DESC';
    params.push(limit);
    queryText += ` LIMIT $${paramCount++}`;
    params.push(offset);
    queryText += ` OFFSET $${paramCount++}`;

    const result = await query(queryText, params);

    const countResult = await query('SELECT COUNT(*) FROM sale', []);

    res.json({
      sales: result.rows,
      total: parseInt(countResult.rows[0].count),
      limit: parseInt(limit as string),
      offset: parseInt(offset as string),
    });
  } catch (error) {
    next(error);
  }
});

// Get single sale
router.get('/:id', async (req, res, next): Promise<any> => {
  try {
    const result = await query('SELECT * FROM v_sale_details WHERE id = $1', [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Create sale
router.post('/', authorize('admin', 'manager', 'operator'), async (req: any, res, next): Promise<any> => {
  try {
    const {
      clientId, locationId, materialCategoryId,
      weightKg, unitPrice, paymentMethod, notes,
    } = req.body;

    if (!clientId || !locationId || !materialCategoryId || !weightKg) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get sale price if unitPrice not provided
    let saleUnitPrice = unitPrice;
    if (!saleUnitPrice) {
      const priceResult = await query(
        `SELECT sale_price_per_kg FROM daily_price
         WHERE material_category_id = $1
           AND (location_id = $2 OR location_id IS NULL)
           AND date <= CURRENT_DATE
         ORDER BY date DESC, location_id DESC NULLS LAST
         LIMIT 1`,
        [materialCategoryId, locationId]
      );
      saleUnitPrice = priceResult.rows[0]?.sale_price_per_kg;
      if (!saleUnitPrice) {
        return res.status(400).json({ error: 'No sale price configured for this material. Please set a daily price first.' });
      }
    }

    const totalAmount = (parseFloat(weightKg) * parseFloat(saleUnitPrice)).toFixed(2);

    // Read configurable sale prefix from app_settings
    let salePrefix = 'SL';
    try {
      const prefixResult = await query(
        "SELECT value FROM app_settings WHERE category = 'prefixes' AND key = 'salePrefix'"
      );
      if (prefixResult.rows.length > 0 && prefixResult.rows[0].value) {
        salePrefix = prefixResult.rows[0].value;
      }
    } catch {
      // Table may not exist yet, use default
    }

    // Generate sale number
    const saleNumber = `${salePrefix}-${Date.now().toString(36).toUpperCase()}`;

    const result = await query(
      `INSERT INTO sale (
        sale_number, client_id, location_id, material_category_id,
        weight_kg, unit_price, total_amount,
        payment_method, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *`,
      [
        saleNumber, clientId, locationId, materialCategoryId,
        weightKg, saleUnitPrice, totalAmount,
        paymentMethod, notes, req.user.id
      ]
    );

    logger.info(`Sale created: ${saleNumber}`, { userId: req.user.id, client: clientId, weight: weightKg });

    // Send confirmation email (async, don't block response)
    sendSaleConfirmation(result.rows[0].id).catch(() => {});

    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update sale payment
router.patch('/:id/payment', authorize('admin', 'manager'), async (req, res, next): Promise<any> => {
  try {
    const { paymentStatus, paidAmount, paymentMethod, paymentReference } = req.body;
    const result = await query(
      `UPDATE sale SET
        payment_status = COALESCE($1, payment_status),
        paid_amount = COALESCE($2, paid_amount),
        payment_method = COALESCE($3, payment_method),
        payment_reference = COALESCE($4, payment_reference),
        paid_at = CASE WHEN $1 = 'paid' THEN CURRENT_TIMESTAMP ELSE paid_at END
      WHERE id = $5 RETURNING *`,
      [paymentStatus, paidAmount, paymentMethod, paymentReference, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Update delivery status
router.patch('/:id/delivery', authorize('admin', 'manager'), async (req, res, next): Promise<any> => {
  try {
    const { deliveryStatus } = req.body;
    console.log('Delivery update request:', { id: req.params.id, deliveryStatus });
    const result = await query(
      `UPDATE sale SET
        delivery_status = $1,
        delivered_at = CASE WHEN $1 = 'delivered' THEN CURRENT_TIMESTAMP ELSE delivered_at END
      WHERE id = $2 RETURNING *`,
      [deliveryStatus, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    console.error('Delivery update error:', error.message, error.detail || '');
    next(error);
  }
});

// Update sale notes
router.patch('/:id/notes', authorize('admin', 'manager', 'operator'), async (req, res, next): Promise<any> => {
  try {
    const { notes } = req.body;
    const result = await query(
      'UPDATE sale SET notes = $1 WHERE id = $2 RETURNING *',
      [notes, req.params.id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

// Void/reverse a sale
router.post('/:id/void', authorize('admin', 'manager'), async (req: any, res, next): Promise<any> => {
  try {
    const { reason } = req.body;
    if (!reason || !reason.trim()) {
      return res.status(400).json({ error: 'Reason is required when voiding a sale' });
    }

    // Get the original sale
    const original = await query('SELECT * FROM sale WHERE id = $1', [req.params.id]);
    if (original.rows.length === 0) {
      return res.status(404).json({ error: 'Sale not found' });
    }

    const sale = original.rows[0];

    // Check if already voided
    if (sale.sale_number.startsWith('REV-')) {
      return res.status(400).json({ error: 'Cannot void a reversal transaction' });
    }

    // Check if a reversal already exists
    const existingReversal = await query(
      "SELECT id FROM sale WHERE sale_number = $1",
      [`REV-${sale.sale_number}`]
    );
    if (existingReversal.rows.length > 0) {
      return res.status(400).json({ error: 'This sale has already been voided' });
    }

    // Create reversal with negative values
    const reversalNumber = `REV-${sale.sale_number}`;
    const result = await query(
      `INSERT INTO sale (
        sale_number, client_id, location_id, material_category_id,
        weight_kg, unit_price, total_amount,
        payment_status, payment_method, paid_amount,
        delivery_status, notes, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *`,
      [
        reversalNumber, sale.client_id, sale.location_id, sale.material_category_id,
        -Math.abs(sale.weight_kg), sale.unit_price, -Math.abs(sale.total_amount),
        'paid', sale.payment_method, -Math.abs(sale.paid_amount || 0),
        sale.delivery_status, `Reversal of ${sale.sale_number}. ${reason.trim()}`,
        req.user.id
      ]
    );

    logger.warn(`Sale voided: ${sale.sale_number} -> ${reversalNumber}`, { userId: req.user.id, reason: reason.trim() });
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

export default router;
