import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api/v1';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  register: (data: any) => api.post('/auth/register', data),
  getCurrentUser: () => api.get('/auth/me'),
};

// Transactions API
export const transactionsAPI = {
  getAll: (params?: any) => api.get('/transactions', { params }),
  getById: (id: string) => api.get(`/transactions/${id}`),
  create: (data: any) => api.post('/transactions', data),
  update: (id: string, data: any) => api.put(`/transactions/${id}`, data),
  delete: (id: string) => api.delete(`/transactions/${id}`),
  updatePayment: (id: string, data: any) => api.patch(`/transactions/${id}/payment`, data),
  updateNotes: (id: string, data: any) => api.patch(`/transactions/${id}/notes`, data),
  voidTransaction: (id: string, data?: any) => api.post(`/transactions/${id}/void`, data || {}),
};

// Materials API
export const materialsAPI = {
  getAll: (params?: any) => api.get('/materials', { params }),
  getById: (id: number) => api.get(`/materials/${id}`),
  create: (data: any) => api.post('/materials', data),
  update: (id: number, data: any) => api.put(`/materials/${id}`, data),
  delete: (id: number) => api.delete(`/materials/${id}`),
};

// Locations API
export const locationsAPI = {
  getAll: (params?: any) => api.get('/locations', { params }),
  getById: (id: number) => api.get(`/locations/${id}`),
  create: (data: any) => api.post('/locations', data),
  update: (id: number, data: any) => api.put(`/locations/${id}`, data),
  delete: (id: number) => api.delete(`/locations/${id}`),
};

// Daily Prices API (prices live under /materials/prices)
export const pricesAPI = {
  getLatest: (params?: any) => api.get('/materials/prices', { params }),
  getAll: (params?: any) => api.get('/materials/prices/all', { params }),
  create: (data: any) => api.post('/materials/prices', data),
  bulkSave: (prices: any[]) => api.post('/materials/prices/bulk', { prices }),
};

// Inventory API
export const inventoryAPI = {
  getAll: (params?: any) => api.get('/inventory', { params }),
  getByLocation: (locationId: number) => api.get(`/inventory/location/${locationId}`),
  getLowStock: () => api.get('/inventory/low-stock'),
  getMovements: (params?: any) => api.get('/inventory/movements', { params }),
};

// Reports API
export const reportsAPI = {
  getSummary: (params?: any) => api.get('/reports/summary', { params }),
  getTrends: (params?: any) => api.get('/reports/trends', { params }),
  getPendingPayments: (params?: any) => api.get('/reports/pending-payments', { params }),
  getPurchases: (params?: any) => api.get('/reports/purchases', { params }),
  getSales: (params?: any) => api.get('/reports/sales', { params }),
  getTraceability: (params?: any) => api.get('/reports/traceability', { params }),
  getAggregate: (params?: any) => api.get('/reports/aggregate', { params }),
  export: (params?: any) => api.get('/reports/export', { params, responseType: 'blob' }),
  emailReport: (data: any) => api.post('/reports/email', data),
  getEmailStatus: () => api.get('/reports/email-status'),
};

// Settings API
export const settingsAPI = {
  get: (category: string) => api.get(`/settings/${category}`),
  save: (category: string, data: any) => api.put(`/settings/${category}`, data),
};

// Sync API
export const syncAPI = {
  push: (data: any[]) => api.post('/sync/push', { transactions: data }),
  pull: (lastSyncTime?: string) => api.get('/sync/pull', { params: { since: lastSyncTime } }),
  getStatus: () => api.get('/sync/status'),
};

// Waste Pickers (Vendors) API
export const wastePickersAPI = {
  getAll: (params?: any) => api.get('/waste-pickers', { params }),
  getById: (id: string) => api.get(`/waste-pickers/${id}`),
  create: (data: any) => api.post('/waste-pickers', data),
  update: (id: string, data: any) => api.put(`/waste-pickers/${id}`, data),
  delete: (id: string) => api.delete(`/waste-pickers/${id}`),
};

// Clients API
export const clientsAPI = {
  getAll: (params?: any) => api.get('/clients', { params }),
  getById: (id: string) => api.get(`/clients/${id}`),
  create: (data: any) => api.post('/clients', data),
  update: (id: string, data: any) => api.put(`/clients/${id}`, data),
  delete: (id: string) => api.delete(`/clients/${id}`),
};

// Apartments API
export const apartmentsAPI = {
  getAll: (params?: any) => api.get('/apartments', { params }),
  getById: (id: string) => api.get(`/apartments/${id}`),
  create: (data: any) => api.post('/apartments', data),
  update: (id: string, data: any) => api.put(`/apartments/${id}`, data),
  delete: (id: string) => api.delete(`/apartments/${id}`),
  // Units within a complex
  getUnits: (complexId: string) => api.get(`/apartments/${complexId}/units`),
  getUnit: (complexId: string, unitId: string) => api.get(`/apartments/${complexId}/units/${unitId}`),
  createUnit: (complexId: string, data: any) => api.post(`/apartments/${complexId}/units`, data),
  updateUnit: (complexId: string, unitId: string, data: any) => api.put(`/apartments/${complexId}/units/${unitId}`, data),
  deleteUnit: (complexId: string, unitId: string) => api.delete(`/apartments/${complexId}/units/${unitId}`),
  bulkCreateUnits: (complexId: string, units: any[]) => api.post(`/apartments/${complexId}/units/bulk`, { units }),
};

// Sales API
export const salesAPI = {
  getAll: (params?: any) => api.get('/sales', { params }),
  getById: (id: string) => api.get(`/sales/${id}`),
  create: (data: any) => api.post('/sales', data),
  updatePayment: (id: string, data: any) => api.patch(`/sales/${id}/payment`, data),
  updateDelivery: (id: string, data: any) => api.patch(`/sales/${id}/delivery`, data),
  updateNotes: (id: string, data: any) => api.patch(`/sales/${id}/notes`, data),
  voidSale: (id: string, data?: any) => api.post(`/sales/${id}/void`, data || {}),
};

// Users API
export const usersAPI = {
  getAll: (params?: any) => api.get('/users', { params }),
  getById: (id: number) => api.get(`/users/${id}`),
  create: (data: any) => api.post('/users', data),
  update: (id: number, data: any) => api.put(`/users/${id}`, data),
  delete: (id: number) => api.delete(`/users/${id}`),
  changePassword: (id: number, data: any) => api.put(`/users/${id}/password`, data),
};

// Logs API (admin only)
export const logsAPI = {
  getFiles: () => api.get('/logs/files'),
  getEntries: (params?: any) => api.get('/logs/entries', { params }),
  download: (filename: string) => api.get(`/logs/download/${filename}`, { responseType: 'blob' }),
};

// Schedules API
export const schedulesAPI = {
  getAll: () => api.get('/schedules'),
  create: (data: any) => api.post('/schedules', data),
  update: (id: string, data: any) => api.put(`/schedules/${id}`, data),
  delete: (id: string) => api.delete(`/schedules/${id}`),
  toggle: (id: string) => api.patch(`/schedules/${id}/toggle`),
};