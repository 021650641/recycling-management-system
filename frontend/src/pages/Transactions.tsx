import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transactionsAPI } from '@/lib/api';
import { Plus, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function Transactions() {
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{t('transactions.title')}</h1>
        <Link
          to="/transactions/new"
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          {t('transactions.new')}
        </Link>
      </div>

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
