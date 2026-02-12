import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { reportsAPI, transactionsAPI } from '@/lib/api';
import { Plus, TrendingUp, TrendingDown, Package, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [apiTransactions, setApiTransactions] = useState<any[] | null>(null);

  // Get recent transactions from local DB (fallback for offline)
  const recentTransactions = useLiveQuery(
    () => db.transactions.orderBy('createdAt').reverse().limit(5).toArray(),
    []
  );

  // Get low stock items
  const lowStockItems = useLiveQuery(
    () => db.materials.where('currentStock').below(10).toArray(),
    []
  );

  useEffect(() => {
    loadSummary();
    loadRecentFromAPI();
  }, []);

  const loadRecentFromAPI = async () => {
    try {
      const response = await transactionsAPI.getAll({ limit: 5, offset: 0 });
      const txs = response.data?.transactions || response.data || [];
      setApiTransactions(txs.map((tx: any) => ({
        id: tx.id,
        type: 'purchase',
        materialName: tx.material_name || tx.materialName,
        quantity: parseFloat(tx.weight_kg || tx.quantity || 0),
        totalAmount: parseFloat(tx.total_cost || tx.totalAmount || 0),
        paymentStatus: tx.payment_status || tx.paymentStatus || 'pending',
        transactionNumber: tx.transaction_number || tx.transactionNumber,
      })));
    } catch {
      // Offline - will use local DB
    }
  };

  const loadSummary = async () => {
    try {
      const response = await reportsAPI.getSummary({
        startDate: format(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
        endDate: format(new Date(), 'yyyy-MM-dd'),
      });
      setSummary(response.data);
    } catch (error) {
      console.error('Failed to load summary:', error);
    } finally {
      setLoading(false);
    }
  };

  // Use API data when available, fall back to local DB
  const displayTransactions = apiTransactions || (recentTransactions || []).map(tx => ({
    id: tx.id,
    type: tx.type,
    materialName: tx.supplierName,
    quantity: tx.quantity,
    totalAmount: tx.totalAmount,
    paymentStatus: tx.paymentStatus,
    transactionNumber: tx.transactionId,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('dashboard.title')}</h1>
        <Link
          to="/transactions/new"
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('dashboard.newTransaction')}
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('dashboard.totalPurchases')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : summary?.totalPurchases || 0}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingDown className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{t('dashboard.last30days')}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('dashboard.totalSales')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : summary?.totalSales || 0}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{t('dashboard.last30days')}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('dashboard.currentStock')}</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : summary?.totalStock || 0}
              </p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Package className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{t('dashboard.allMaterials')}</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">{t('dashboard.pendingPayments')}</p>
              <p className="text-2xl font-bold text-gray-900">
                ${loading ? '...' : summary?.pendingPayments?.toFixed(2) || '0.00'}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-2">{t('dashboard.outstanding')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Transactions */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.recentTransactions')}</h2>
          </div>
          <div className="p-4">
            {displayTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">{t('dashboard.noRecentTransactions')}</p>
            ) : (
              <div className="space-y-2">
                {displayTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-gray-900 truncate">{transaction.materialName || '—'}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500 whitespace-nowrap">{transaction.quantity} kg</span>
                      <span className="text-gray-400">·</span>
                      <span className="font-semibold text-gray-900 whitespace-nowrap">${(transaction.totalAmount || 0).toFixed(2)}</span>
                    </div>
                    <span
                      className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium capitalize whitespace-nowrap ${
                        transaction.paymentStatus === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {transaction.paymentStatus}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link
              to="/transactions"
              className="block text-center text-primary-600 hover:text-primary-700 text-sm font-medium mt-4"
            >
              {`${t('dashboard.viewAllTransactions')} \u2192`}
            </Link>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">{t('dashboard.lowStockAlerts')}</h2>
          </div>
          <div className="p-4">
            {!lowStockItems || lowStockItems.length === 0 ? (
              <p className="text-gray-500 text-center py-4">{t('dashboard.allStockGood')}</p>
            ) : (
              <div className="space-y-2">
                {lowStockItems.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between p-2.5 bg-red-50 rounded-lg text-sm"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-gray-900 truncate">{material.name}</span>
                      <span className="text-gray-400">·</span>
                      <span className="text-gray-500 capitalize">{material.category}</span>
                    </div>
                    <span className="ml-2 font-semibold text-red-600 whitespace-nowrap">
                      {material.currentStock} {material.unit}
                    </span>
                  </div>
                ))}
              </div>
            )}
            <Link
              to="/inventory"
              className="block text-center text-primary-600 hover:text-primary-700 text-sm font-medium mt-4"
            >
              {`${t('dashboard.viewInventory')} \u2192`}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
