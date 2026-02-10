import { useState, useEffect } from 'react';
import { reportsAPI } from '@/lib/api';
import { Download, Calendar, TrendingUp, DollarSign } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';

export default function Reports() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    setLoading(true);
    try {
      const [summaryRes, trendsRes, paymentsRes] = await Promise.all([
        reportsAPI.getSummary(dateRange).catch(() => ({ data: null })),
        reportsAPI.getTrends(dateRange).catch(() => ({ data: { trends: [] } })),
        reportsAPI.getPendingPayments().catch(() => ({ data: { payments: [] } })),
      ]);

      setSummary(summaryRes.data);
      const trendsData = Array.isArray(trendsRes.data) ? trendsRes.data : trendsRes.data?.trends || [];
      setTrends(trendsData);
      const paymentsData = Array.isArray(paymentsRes.data) ? paymentsRes.data : paymentsRes.data?.payments || [];
      setPendingPayments(paymentsData);
    } catch (error) {
      console.error('Failed to load reports:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      const response = await reportsAPI.export({
        ...dateRange,
        format: 'csv',
      });

      // Create blob and download
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${dateRange.startDate}_to_${dateRange.endDate}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export report');
    }
  };

  const handleDateChange = (field: 'startDate' | 'endDate', value: string) => {
    setDateRange((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          <Download className="w-5 h-5" />
          Export CSV
        </button>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Date Range</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => handleDateChange('startDate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => handleDateChange('endDate', e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            />
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading reports...</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Total Materials</p>
              <p className="text-2xl font-bold text-gray-900">
                {(summary?.totalMaterialsKg || 0).toFixed(2)} kg
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Active Locations</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.activeLocations || 0}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Active Waste Pickers</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.activeWastePickers || 0}</p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Pending Payments</p>
              <p className="text-2xl font-bold text-red-600">
                ${(summary?.pendingPayments || 0).toFixed(2)}
              </p>
            </div>
          </div>

          {/* Transaction Trends Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Transaction Trends</h2>
            </div>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="total_weight_kg" stroke="#10b981" name="Weight (kg)" />
                  <Line type="monotone" dataKey="total_transactions" stroke="#3b82f6" name="Transactions" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-gray-500">No trend data available</p>
            )}
          </div>

          {/* Revenue Chart */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Value Analysis</h2>
            </div>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="total_value" fill="#10b981" name="Total Value ($)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-gray-500">No value data available</p>
            )}
          </div>

          {/* Pending Payments */}
          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">Pending Payments</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Waste Picker
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Material
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Cost
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outstanding
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {pendingPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No pending payments
                      </td>
                    </tr>
                  ) : (
                    pendingPayments.map((payment, index) => {
                      const totalCost = parseFloat(payment.total_cost) || 0;
                      const paidAmount = parseFloat(payment.paid_amount) || 0;
                      const amountDue = parseFloat(payment.amount_due) || (totalCost - paidAmount);

                      return (
                        <tr key={payment.transaction_id || index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {payment.transaction_date ? format(new Date(payment.transaction_date), 'MMM dd, yyyy') : '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {payment.waste_picker_name || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {payment.material_category || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            ${totalCost.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-600">
                            ${paidAmount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-red-600">
                            ${amountDue.toFixed(2)}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                payment.payment_status === 'partial'
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-red-100 text-red-800'
                              }`}
                            >
                              {payment.payment_status}
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
