import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { transactionsAPI } from '@/lib/api';
import { Plus, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';

export default function Transactions() {
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
    apartment: transactions?.filter(t => t.source_type === 'apartment').length || 0,
    wastePicker: transactions?.filter(t => t.source_type === 'waste_picker').length || 0,
    pending: transactions?.filter(t => t.payment_status !== 'paid').length || 0,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
        <Link
          to="/transactions/new"
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Plus className="w-5 h-5" />
          New Transaction
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Total</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Apartment</p>
          <p className="text-2xl font-bold text-green-600">{stats.apartment}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Waste Picker</p>
          <p className="text-2xl font-bold text-blue-600">{stats.wastePicker}</p>
        </div>
        <div className="bg-white p-4 rounded-lg shadow">
          <p className="text-sm text-gray-600">Pending Payment</p>
          <p className="text-2xl font-bold text-red-600">{stats.pending}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow space-y-4">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Filter className="w-5 h-5" />
          Filters
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by source, material, location..."
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Source Type</label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="all">All Types</option>
              <option value="apartment">Apartment</option>
              <option value="waste_picker">Waste Picker</option>
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-600 mb-2">Payment Status</label>
            <select
              value={filterPayment}
              onChange={(e) => setFilterPayment(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="partial">Partial</option>
              <option value="pending">Pending</option>
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
                  Date
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weight (kg)
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Cost
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paid
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    Loading transactions...
                  </td>
                </tr>
              ) : !filteredTransactions || filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                    No transactions found
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((t) => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {format(new Date(t.transaction_date || t.created_at), 'MMM dd, yyyy')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {t.location_name || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {t.material_category || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {t.source_name || '-'}
                      <span className="block text-xs text-gray-500 capitalize">
                        {(t.source_type || '').replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {parseFloat(t.weight_kg || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                      ${parseFloat(t.total_cost || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ${parseFloat(t.paid_amount || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          t.payment_status === 'paid'
                            ? 'bg-green-100 text-green-800'
                            : t.payment_status === 'partial'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {t.payment_status}
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
