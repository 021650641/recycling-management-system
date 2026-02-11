import Dexie, { Table } from 'dexie';

export interface Transaction {
  id?: number;
  transactionId?: string;
  type: 'purchase' | 'sale';
  sourceLocationId?: string;
  destinationLocationId?: string;
  materialId: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  paidAmount?: number;
  supplierName?: string;
  supplierContact?: string;
  vehicleNumber?: string;
  notes?: string;
  userId: string;
  createdAt: string;
  synced: boolean;
  localId?: string;
}

export interface Material {
  id: string;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStockLevel?: number;
  isActive: boolean;
}

export interface Location {
  id: string;
  name: string;
  type: 'warehouse' | 'yard' | 'processing';
  address?: string;
  isActive: boolean;
}

export interface DailyPrice {
  id: string;
  materialId: string;
  locationId?: string;
  purchasePrice: number;
  salePrice: number;
  effectiveDate: string;
}

export interface SyncQueue {
  id?: number;
  endpoint: string;
  method: 'POST' | 'PUT' | 'DELETE';
  data: any;
  retryCount: number;
  createdAt: string;
  error?: string;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  locationId?: string;
}

class RecyclingDatabase extends Dexie {
  transactions!: Table<Transaction>;
  materials!: Table<Material>;
  locations!: Table<Location>;
  dailyPrices!: Table<DailyPrice>;
  syncQueue!: Table<SyncQueue>;
  users!: Table<User>;

  constructor() {
    super('recyclingDB');
    this.version(2).stores({
      transactions: '++id, transactionId, type, materialId, createdAt, synced, localId',
      materials: 'id, name, category, currentStock',
      locations: 'id, name, type',
      dailyPrices: 'id, materialId, locationId, effectiveDate',
      syncQueue: '++id, createdAt, retryCount',
      users: 'id, username, role'
    });
    this.version(3).stores({
      transactions: '++id, transactionId, type, materialId, createdAt, synced, localId',
      materials: 'id, name, category, currentStock, isActive',
      locations: 'id, name, type, isActive',
      dailyPrices: 'id, materialId, locationId, effectiveDate',
      syncQueue: '++id, createdAt, retryCount',
      users: 'id, username, role'
    });
    this.version(4).stores({
      transactions: '++id, transactionId, type, materialId, createdAt, synced, localId',
      materials: 'id, name, category, currentStock, isActive',
      locations: 'id, name, type, isActive',
      dailyPrices: 'id, materialId, locationId, effectiveDate',
      syncQueue: '++id, createdAt, retryCount',
      users: 'id, username, role'
    });
  }
}

export const db = new RecyclingDatabase();
