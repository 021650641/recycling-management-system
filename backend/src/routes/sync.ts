import { Router } from 'express';
import { query, transaction } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

// Sync offline transactions
router.post('/transactions', async (req: any, res, next): Promise<any> => {
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
          const txNumber = `TX-${Date.now().toString(36).toUpperCase()}`;
          const result = await client.query(
            `INSERT INTO transaction (
              transaction_number, location_id, material_category_id, source_type,
              apartment_complex_id, apartment_unit, waste_picker_id,
              weight_kg, quality_grade, unit_price, total_cost,
              payment_method, notes, recorded_by, device_id,
              transaction_date, is_synced
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
            RETURNING id`,
            [
              txNumber,
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
router.get('/pending', async (req, res, next): Promise<any> => {
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

// Push offline transactions (frontend sync endpoint)
router.post('/push', async (req: any, res, next): Promise<any> => {
  try {
    const { transactions: txns } = req.body;

    if (!Array.isArray(txns) || txns.length === 0) {
      return res.json({ synced: [], conflicts: [] });
    }

    const synced: string[] = [];
    const conflicts: any[] = [];

    const results = await transaction(async (client) => {
      for (const txn of txns) {
        try {
          const existing = await client.query(
            'SELECT id FROM transaction WHERE device_id = $1 AND transaction_date = $2 AND weight_kg = $3',
            [txn.deviceId || null, txn.transactionDate, txn.weightKg]
          );

          if (existing.rows.length > 0) {
            conflicts.push({ localId: txn.localId, reason: 'duplicate', serverVersion: existing.rows[0] });
            continue;
          }

          const transactionNumber = `TX-${Date.now().toString(36).toUpperCase()}`;
          await client.query(
            `INSERT INTO transaction (
              transaction_number, location_id, material_category_id, source_type,
              apartment_complex_id, apartment_unit, apartment_unit_id, waste_picker_id,
              weight_kg, quality_grade, unit_price, total_cost,
              payment_method, notes, recorded_by, device_id,
              transaction_date, is_synced
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)`,
            [
              transactionNumber,
              txn.locationId, txn.materialCategoryId, txn.sourceType,
              txn.apartmentComplexId || null, txn.apartmentUnit || null, txn.apartmentUnitId || null, txn.wastePickerId || null,
              txn.weightKg, txn.qualityGrade || null, txn.unitPrice || null, txn.totalCost || null,
              txn.paymentMethod || 'cash', txn.notes || null, req.user.id, txn.deviceId || null,
              txn.transactionDate, true
            ]
          );

          synced.push(txn.localId);
        } catch (error: any) {
          conflicts.push({ localId: txn.localId, reason: error.message });
        }
      }
      return { synced, conflicts };
    });

    res.json(results);
  } catch (error) {
    next(error);
  }
});

// Pull remote changes (frontend sync endpoint)
router.get('/pull', async (req: any, res, next) => {
  try {
    const { since } = req.query;

    const sinceDate = since ? new Date(since as string) : new Date(0);

    const [materialsResult, locationsResult, pricesResult, transactionsResult] = await Promise.all([
      query(
        'SELECT * FROM material_category WHERE updated_at > $1 ORDER BY name',
        [sinceDate]
      ),
      query(
        'SELECT * FROM location WHERE updated_at > $1 ORDER BY name',
        [sinceDate]
      ),
      query(
        'SELECT * FROM daily_price WHERE COALESCE(updated_at, created_at) > $1 ORDER BY date DESC',
        [sinceDate]
      ),
      query(
        `SELECT t.*, mc.name as material_name, l.name as location_name
         FROM transaction t
         JOIN material_category mc ON t.material_category_id = mc.id
         JOIN location l ON t.location_id = l.id
         WHERE t.updated_at > $1
         ORDER BY t.transaction_date DESC
         LIMIT 500`,
        [sinceDate]
      ),
    ]);

    res.json({
      materials: materialsResult.rows,
      locations: locationsResult.rows,
      prices: pricesResult.rows,
      transactions: transactionsResult.rows,
    });
  } catch (error) {
    next(error);
  }
});

// Sync status
router.get('/status', async (_req: any, res, next) => {
  try {
    const result = await query(
      `SELECT
        (SELECT COUNT(*) FROM sync_log WHERE sync_status = 'pending') as pending_count,
        (SELECT MAX(synced_at) FROM sync_log WHERE sync_status = 'synced') as last_sync`
    );

    res.json({
      pendingCount: parseInt(result.rows[0].pending_count) || 0,
      lastSync: result.rows[0].last_sync,
    });
  } catch (error) {
    next(error);
  }
});

export default router;