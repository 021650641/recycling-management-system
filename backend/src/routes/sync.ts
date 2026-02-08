import { Router } from 'express';
import { query, transaction } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Sync offline transactions
router.post('/transactions', async (req: any, res, next) => {
  try {
    const { transactions, deviceId } = req.body;

    if (!Array.isArray(transactions) || transactions.length === 0) {
      return res.status(400).json({ error: 'Invalid transactions array' });
    }

    const results = await transaction(async (client) => {
      const synced = [];
      const failed = [];

      for (const txn of transactions) {
        try {
          // Check for duplicates
          const existing = await client.query(
            'SELECT id FROM transaction WHERE device_id = $1 AND transaction_date = $2 AND weight_kg = $3',
            [deviceId, txn.transactionDate, txn.weightKg]
          );

          if (existing.rows.length > 0) {
            failed.push({ transaction: txn, error: 'Duplicate transaction' });
            continue;
          }

          // Insert transaction
          const result = await client.query(
            `INSERT INTO transaction (
              location_id, material_category_id, source_type,
              apartment_complex_id, apartment_unit, waste_picker_id,
              weight_kg, quality_grade, unit_price, total_cost,
              payment_method, notes, recorded_by, device_id,
              transaction_date, is_synced
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
            RETURNING id`,
            [
              txn.locationId, txn.materialCategoryId, txn.sourceType,
              txn.apartmentComplexId, txn.apartmentUnit, txn.wastePickerId,
              txn.weightKg, txn.qualityGrade, txn.unitPrice, txn.totalCost,
              txn.paymentMethod, txn.notes, req.user.id, deviceId,
              txn.transactionDate, true
            ]
          );

          synced.push({ localId: txn.localId, serverId: result.rows[0].id });

          // Log sync
          await client.query(
            'INSERT INTO sync_log (device_id, table_name, record_id, operation, sync_status, synced_at) VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP)',
            [deviceId, 'transaction', result.rows[0].id, 'insert', 'synced']
          );
        } catch (error: any) {
          failed.push({ transaction: txn, error: error.message });
        }
      }

      return { synced, failed };
    });

    res.json(results);
  } catch (error) {
    next(error);
  }
});

// Get pending sync items
router.get('/pending', async (req, res, next) => {
  try {
    const { deviceId } = req.query;

    if (!deviceId) {
      return res.status(400).json({ error: 'Device ID required' });
    }

    const result = await query(
      'SELECT * FROM sync_log WHERE device_id = $1 AND sync_status = $2 ORDER BY created_at',
      [deviceId, 'pending']
    );

    res.json({ pending: result.rows });
  } catch (error) {
    next(error);
  }
});

export default router;
