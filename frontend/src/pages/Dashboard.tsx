import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { reportsAPI } from '@/lib/api';
import { Plus, TrendingUp, TrendingDown, Package, DollarSign } from 'lucide-react';
import { format } from 'date-fns';

export default function Dashboard() {
  const { t } = useTranslation();
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Get recent transactions from local DB
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
  }, []);

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
            {!recentTransactions || recentTransactions.length === 0 ? (
              <p className="text-gray-500 text-center py-4">{t('dashboard.noRecentTransactions')}</p>
            ) : (
              <div className="space-y-3">
                {recentTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900 capitalize">{transaction.type}</p>
                      <p className="text-sm text-gray-500">
                        {transaction.supplierName || 'N/A'} - {transaction.quantity} kg
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">
                        ${transaction.totalAmount.toFixed(2)}
                      </p>
                      <p
                        className={`text-xs ${
                          transaction.paymentStatus === 'paid'
                            ? 'text-green-600'
                            : 'text-yellow-600'
                        }`}
                      >
                        {transaction.paymentStatus}
                      </p>
                    </div>
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
              <div className="space-y-3">
                {lowStockItems.map((material) => (
                  <div
                    key={material.id}
                    className="flex items-center justify-between p-3 bg-red-50 rounded-lg"
                  >
                    <div>
                      <p className="font-medium text-gray-900">{material.name}</p>
                      <p className="text-sm text-gray-500 capitalize">{material.category}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-red-600">
                        {material.currentStock} {material.unit}
                      </p>
                      <p className="text-xs text-gray-500">
                        Min: {material.minStockLevel || 0} {material.unit}
                      </p>
                    </div>
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
