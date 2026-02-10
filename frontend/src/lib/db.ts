import Dexie, { Table } from 'dexie';

export interface Transaction {
  id?: number;
  transactionId?: string;
  type: 'purchase' | 'sale';
  sourceLocationId?: number;
  destinationLocationId?: number;
  materialId: number;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  paymentStatus: 'paid' | 'pending' | 'partial';
  paidAmount?: number;
  supplierName?: string;
  supplierContact?: string;
  vehicleNumber?: string;
  notes?: string;
  userId: number;
  createdAt: string;
  synced: boolean;
  localId?: string;
}

export interface Material {
  id: number;
  name: string;
  category: string;
  unit: string;
  currentStock: number;
  minStockLevel?: number;
  isActive: boolean;
}

export interface Location {
  id: number;
  name: string;
  type: 'warehouse' | 'yard' | 'processing';
  address?: string;
  isActive: boolean;
}

export interface DailyPrice {
  id: number;
  materialId: number;
  locationId?: number;
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
  id: number;
  username: string;
  fullName: string;
  role: 'admin' | 'manager' | 'operator' | 'viewer';
  locationId?: number;
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
  }
}

export const db = new RecyclingDatabase();
