import { Router } from 'express';
import { query } from '../db';
import { authenticate, authorize } from '../middleware/auth';

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

    // Generate sale number
    const saleNumber = `SL-${Date.now().toString(36).toUpperCase()}`;

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
  } catch (error) {
    next(error);
  }
});

export default router;
