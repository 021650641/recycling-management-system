import { db, Transaction, SyncQueue } from './db';
import { syncAPI } from './api';

class SyncService {
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;

  async initialize() {
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

      // Update local data
      if (materials?.length) {
        await db.materials.bulkPut(materials);
      }

      if (locations?.length) {
        await db.locations.bulkPut(locations);
      }

      if (prices?.length) {
        await db.dailyPrices.bulkPut(prices);
      }

      if (transactions?.length) {
        // Only update if not locally modified
        for (const transaction of transactions) {
          const existing = await db.transactions
            .where('transactionId')
            .equals(transaction.transactionId)
            .first();

          if (!existing || existing.synced) {
            await db.transactions.put({ ...transaction, synced: true });
          }
        }
      }

      localStorage.setItem('lastSyncTime', new Date().toISOString());
    } catch (error) {
      console.error('Pull sync error:', error);
      throw error;
    }
  }

  async addToQueue(endpoint: string, method: 'POST' | 'PUT' | 'DELETE', data: any) {
    await db.syncQueue.add({
      endpoint,
      method,
      data,
      retryCount: 0,
      createdAt: new Date().toISOString(),
    });
  }

  async processSyncQueue() {
    const queueItems = await db.syncQueue.toArray();
    
    for (const item of queueItems) {
      try {
        // Process the queued request
        // This would use the api client to make the actual request
        
        // If successful, remove from queue
        if (item.id) {
          await db.syncQueue.delete(item.id);
        }
      } catch (error) {
        // Increment retry count
        if (item.id) {
          await db.syncQueue.update(item.id, {
            retryCount: item.retryCount + 1,
            error: error instanceof Error ? error.message : 'Unknown error',
          });
        }
      }
    }
  }

  getSyncStatus() {
    return {
      isSyncing: this.isSyncing,
      isOnline: navigator.onLine,
      lastSyncTime: localStorage.getItem('lastSyncTime'),
    };
  }

  stopSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
}

export const syncService = new SyncService();
