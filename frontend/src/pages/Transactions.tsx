import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transactionsAPI, salesAPI, clientsAPI, materialsAPI, locationsAPI } from '@/lib/api';
import { Plus, Filter, Search, Save, X, DollarSign, Truck, ShoppingCart, ArrowLeftRight } from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

type TabType = 'purchases' | 'sales';

export default function Transactions() {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabType>('purchases');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('transactions.title')}</h1>
        {activeTab === 'purchases' ? (
          <Link
            to="/transactions/new"
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            {t('transactions.newPurchase')}
          </Link>
        ) : (
          <NewSaleButton />
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('purchases')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'purchases'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ArrowLeftRight className="w-4 h-4" />
            {t('transactions.purchasesTab')}
          </button>
          <button
            onClick={() => setActiveTab('sales')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 ${
              activeTab === 'sales'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ShoppingCart className="w-4 h-4" />
            {t('transactions.salesTab')}
          </button>
        </nav>
      </div>

      {activeTab === 'purchases' && <PurchasesTab />}
      {activeTab === 'sales' && <SalesTab />}
    </div>
  );
}

// ===== New Sale Button (with inline form toggle) =====
function NewSaleButton() {
  const { t } = useTranslation();
  return (
    <button
      onClick={() => {
        // Dispatch custom event to toggle form in SalesTab
        window.dispatchEvent(new CustomEvent('toggle-sale-form'));
      }}
      className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
    >
      <Plus className="w-5 h-5" />
      {t('sales.create')}
    </button>
  );
}

// ===== Purchases Tab =====
function PurchasesTab() {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'purchase' | 'sale'>('all');
  const [filterPayment, setFilterPayment] = useState<'all' | 'paid' | 'pending' | 'partial'>('all');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await transactionsAPI.getAll();
      setTransactions(Array.isArray(res.data) ? res.data : res.data?.transactions || []);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredTransactions = transactions?.filter(transaction => {
    const matchesSearch =
      searchTerm === '' ||
      (transaction.source_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.material_category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.location_name || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesType = filterType === 'all' || transaction.source_type === filterType;
    const matchesPayment = filterPayment === 'all' || transaction.payment_status === filterPayment;

    return matchesSearch && matchesType && matchesPayment;
  });

  const stats = {
    total: transactions?.length || 0,
    apartment: transactions?.filter(tx => tx.source_type === 'apartment').length || 0,
    wastePicker: transactions?.filter(tx => tx.source_type === 'waste_picker').length || 0,
    pending: transactions?.filter(tx => tx.payment_status !== 'paid').length || 0,
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">{t('common.total')}</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">{t('transactions.apartment')}</p>
          <p className="text-2xl font-bold text-green-600">{stats.apartment}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">{t('transactions.wastePicker')}</p>
          <p className="text-2xl font-bold text-blue-600">{stats.wastePicker}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">{t('transactions.pendingPayment')}</p>
          <p className="text-2xl font-bold text-red-600">{stats.pending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Filter className="w-5 h-5" />
          {t('transactions.filters')}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">{t('common.search')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('transactions.searchTransactions')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">{t('transactions.sourceType')}</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="all">{t('common.allTypes')}</option>
              <option value="apartment">{t('transactions.apartment')}</option>
              <option value="waste_picker">{t('transactions.wastePicker')}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">{t('transactions.paymentStatus')}</label>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="all">{t('common.allStatus')}</option>
              <option value="paid">{t('transactions.paid')}</option>
              <option value="partial">{t('transactions.partial')}</option>
              <option value="pending">{t('transactions.pending')}</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.date')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('transactions.location')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('transactions.material')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('transactions.source')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('transactions.weightKg')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('transactions.totalCost')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('transactions.totalPaid')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('common.status')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {t('transactions.loadingTransactions')}
                  </td>
                </tr>
              ) : !filteredTransactions || filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    {t('transactions.noTransactions')}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {format(new Date(tx.transaction_date || tx.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {tx.location_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {tx.material_category || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {tx.source_name || '-'}
                      <span className="block text-xs text-gray-500 capitalize">
                        {(tx.source_type || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {parseFloat(tx.weight_kg || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      ${parseFloat(tx.total_cost || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ${parseFloat(tx.paid_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          tx.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : tx.payment_status === 'partial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {tx.payment_status === 'paid'
                          ? t('transactions.paid')
                          : tx.payment_status === 'partial'
                          ? t('transactions.partial')
                          : t('transactions.pending')}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== Sales Tab =====
interface Sale {
  id: string;
  sale_number: string;
  client_id: string;
  client_name: string;
  location_id: number;
  location_name: string;
  material_category_id: number;
  material_category: string;
  weight_kg: number;
  unit_price: number;
  total_amount: number;
  payment_status: string;
  payment_method: string;
  paid_amount: number;
  delivery_status: string;
  sale_date: string;
  notes: string;
}

function SalesTab() {
  const { t } = useTranslation();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [clients, setClients] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    loadData();
    loadFormOptions();
  }, []);

  // Listen for the "New Sale" button click from the header
  useEffect(() => {
    const handleToggle = () => setShowForm(prev => !prev);
    window.addEventListener('toggle-sale-form', handleToggle);
    return () => window.removeEventListener('toggle-sale-form', handleToggle);
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const response = await salesAPI.getAll();
      const data = response.data?.sales || [];
      setSales(data);
      setTotal(response.data?.total || 0);
    } catch (error) {
      console.error('Failed to load sales:', error);
      toast.error(t('sales.loadError'));
    } finally {
      setLoading(false);
    }
  };

  const loadFormOptions = async () => {
    try {
      const [clientsRes, materialsRes, locationsRes] = await Promise.all([
        clientsAPI.getAll(),
        materialsAPI.getAll(),
        locationsAPI.getAll(),
      ]);
      setClients(Array.isArray(clientsRes.data) ? clientsRes.data : clientsRes.data?.clients || []);
      setMaterials(Array.isArray(materialsRes.data) ? materialsRes.data : materialsRes.data?.materials || []);
      setLocations(Array.isArray(locationsRes.data) ? locationsRes.data : locationsRes.data?.locations || []);
    } catch (error) {
      console.error('Failed to load form options:', error);
    }
  };

  const handleCreate = async (data: any) => {
    try {
      await salesAPI.create(data);
      toast.success(t('sales.created'));
      setShowForm(false);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('sales.createError'));
    }
  };

  const handleUpdatePayment = async (id: string, paymentStatus: string) => {
    try {
      await salesAPI.updatePayment(id, { paymentStatus });
      toast.success(t('sales.paymentUpdated'));
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('sales.paymentUpdateError'));
    }
  };

  const handleUpdateDelivery = async (id: string, deliveryStatus: string) => {
    try {
      await salesAPI.updateDelivery(id, { deliveryStatus });
      toast.success(t('sales.deliveryUpdated'));
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('sales.deliveryUpdateError'));
    }
  };

  const statusKeys: Record<string, string> = {
    paid: 'sales.paid',
    partial: 'sales.partial',
    pending: 'sales.pending',
    delivered: 'sales.delivered',
    in_transit: 'sales.inTransit',
    not_delivered: 'sales.notDelivered',
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800',
      pending: 'bg-red-100 text-red-800',
      delivered: 'bg-green-100 text-green-800',
      in_transit: 'bg-blue-100 text-blue-800',
      not_delivered: 'bg-gray-100 text-gray-800',
    };
    const key = statusKeys[status || 'pending'] || 'sales.pending';
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {t(key)}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <p className="text-sm text-gray-500">{t('sales.totalSales', { count: total })}</p>
      </div>

      {showForm && (
        <SaleForm
          clients={clients}
          materials={materials}
          locations={locations}
          onSave={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('sales.loading')}</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sales.saleNumber')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sales.client')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sales.material')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('sales.weightKg')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.total')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('sales.payment')}</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('sales.delivery')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">{t('sales.noResults')}</td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{sale.sale_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{sale.client_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{sale.material_category || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {Number(sale.weight_kg || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">
                        ${Number(sale.total_amount || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(sale.payment_status)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {getStatusBadge(sale.delivery_status || 'not_delivered')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1">
                          {sale.payment_status !== 'paid' && (
                            <button
                              onClick={() => handleUpdatePayment(sale.id, 'paid')}
                              className="text-green-600 hover:text-green-800 p-1"
                              title={t('sales.markAsPaid')}
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          {sale.delivery_status !== 'delivered' && (
                            <button
                              onClick={() => handleUpdateDelivery(sale.id, 'delivered')}
                              className="text-blue-600 hover:text-blue-800 p-1"
                              title={t('sales.markAsDelivered')}
                            >
                              <Truck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// ===== Sale Form =====
function SaleForm({
  clients, materials, locations, onSave, onCancel,
}: {
  clients: any[]; materials: any[]; locations: any[];
  onSave: (data: any) => void; onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    clientId: '',
    locationId: '',
    materialCategoryId: '',
    weightKg: '',
    unitPrice: '',
    paymentMethod: 'bank_transfer',
    notes: '',
  });

  const totalAmount = (parseFloat(formData.weightKg || '0') * parseFloat(formData.unitPrice || '0')).toFixed(2);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      clientId: formData.clientId,
      locationId: formData.locationId,
      materialCategoryId: formData.materialCategoryId,
      weightKg: parseFloat(formData.weightKg),
      unitPrice: parseFloat(formData.unitPrice) || undefined,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes || undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{t('sales.create')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sales.client')} *</label>
          <select
            value={formData.clientId}
            onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          >
            <option value="">{t('sales.selectClient')}</option>
            {clients.filter(c => c.is_active !== false).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sales.location')} *</label>
          <select
            value={formData.locationId}
            onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          >
            <option value="">{t('sales.selectLocation')}</option>
            {locations.filter(l => l.is_active !== false).map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sales.material')} *</label>
          <select
            value={formData.materialCategoryId}
            onChange={(e) => setFormData({ ...formData, materialCategoryId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          >
            <option value="">{t('sales.selectMaterial')}</option>
            {materials.filter(m => m.is_active !== false).map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sales.paymentMethod')}</label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="cash">{t('sales.cash')}</option>
            <option value="bank_transfer">{t('sales.bankTransfer')}</option>
            <option value="mobile_money">{t('sales.mobileMoney')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sales.weightKg')} *</label>
          <input
            type="number"
            step="0.01"
            value={formData.weightKg}
            onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            placeholder="0.00"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sales.unitPrice')}</label>
          <input
            type="number"
            step="0.01"
            value={formData.unitPrice}
            onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            placeholder={t('sales.autoFromDailyPrice')}
          />
        </div>
      </div>
      {formData.weightKg && formData.unitPrice && (
        <div className="bg-gray-50 p-3 rounded-lg">
          <p className="text-sm text-gray-600">{t('sales.totalAmount')}: <span className="font-semibold text-gray-900">${totalAmount}</span></p>
        </div>
      )}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('sales.notes')}</label>
        <textarea
          value={formData.notes}
          onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
          rows={2}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          placeholder={t('sales.notesPlaceholder')}
        />
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
          <Save className="w-4 h-4" /> {t('common.save')}
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg">
          <X className="w-4 h-4" /> {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
