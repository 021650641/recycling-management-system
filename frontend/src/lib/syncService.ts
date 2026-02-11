import { db } from './db';
import { syncAPI } from './api';

class SyncService {
  private syncInterval: number | null = null;
  private isSyncing = false;

  async initialize() {
    // Run an immediate sync on startup
    this.sync();

    // Start periodic sync every 2 minutes
    this.syncInterval = setInterval(() => {
      this.sync();
    }, 120000);

    // Sync on online event
    window.addEventListener('online', () => {
      this.sync();
    });
  }

  async sync() {
    if (this.isSyncing || !navigator.onLine) return;

    this.isSyncing = true;
    try {
      // Push local changes
      await this.pushChanges();
      
      // Pull remote changes
      await this.pullChanges();
    } catch (error) {
      console.error('Sync error:', error);
    } finally {
      this.isSyncing = false;
    }
  }

  async pushChanges() {
    // Get all unsynced transactions
    const unsyncedTransactions = await db.transactions
      .where('synced')
      .equals(0)
      .toArray();

    if (unsyncedTransactions.length === 0) return;

    try {
      const response = await syncAPI.push(unsyncedTransactions);
      const { synced, conflicts } = response.data;

      // Mark synced transactions
      for (const syncedId of synced) {
        const transaction = unsyncedTransactions.find(t => t.localId === syncedId);
        if (transaction?.id) {
          await db.transactions.update(transaction.id, { synced: true });
        }
      }

      // Handle conflicts (server wins by default)
      for (const conflict of conflicts) {
        const localTransaction = unsyncedTransactions.find(t => t.localId === conflict.localId);
        if (localTransaction?.id) {
          await db.transactions.update(localTransaction.id, {
            ...conflict.serverVersion,
            synced: true,
          });
        }
      }
    } catch (error) {
      console.error('Push sync error:', error);
      throw error;
    }
  }

  async pullChanges() {
    try {
      const lastSyncTime = localStorage.getItem('lastSyncTime');
      const response = await syncAPI.pull(lastSyncTime || undefined);
      const { transactions, materials, locations, prices } = response.data;

      // Update local data - backend returns snake_case, map to Dexie schema
      if (materials?.length) {
        const mapped = materials.map((m: any) => ({
          id: m.id,
          name: m.name,
          category: m.category || m.name,
          unit: m.unit || 'kg',
          currentStock: m.current_stock || 0,
          minStockLevel: m.min_stock_level,
          isActive: m.is_active ?? true,
        }));
        await db.materials.bulkPut(mapped);
      }

      if (locations?.length) {
        const mapped = locations.map((l: any) => ({
          id: l.id,
          name: l.name,
          type: l.type || 'warehouse',
          address: l.address,
          isActive: l.is_active ?? true,
        }));
        await db.locations.bulkPut(mapped);
      }

      if (prices?.length) {
        const mapped = prices.map((p: any) => ({
          id: p.id,
          materialId: p.material_category_id || p.material_id,
          locationId: p.location_id,
          purchasePrice: parseFloat(p.purchase_price || p.price_per_kg || 0),
          salePrice: parseFloat(p.sale_price || p.price_per_kg || 0),
          effectiveDate: p.date || p.effective_date,
        }));
        await db.dailyPrices.bulkPut(mapped);
      }

      if (transactions?.length) {
        for (const txn of transactions) {
          const txnId = txn.id || txn.transaction_id;
          if (!txnId) continue;

          const existing = await db.transactions
            .where('transactionId')
            .equals(txnId)
            .first();

          if (!existing || existing.synced) {
            await db.transactions.put({
              transactionId: txnId,
              type: 'purchase',
              materialId: txn.material_category_id,
              quantity: parseFloat(txn.weight_kg || 0),
              unitPrice: parseFloat(txn.unit_price || 0),
              totalAmount: parseFloat(txn.total_cost || 0),
              paymentStatus: txn.payment_status || 'pending',
              paidAmount: parseFloat(txn.paid_amount || 0),
              notes: txn.notes,
              userId: txn.recorded_by,
              createdAt: txn.transaction_date || txn.created_at,
              synced: true,
            });
          }
        }
      }

      localStorage.setItem('lastSyncTime', new Date().toISOString());
    } catch (error) {
      console.error('Pull sync error:', error);
      throw error;
    }
  }

  stop() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
    }
  }
}

export const syncService = new SyncService();