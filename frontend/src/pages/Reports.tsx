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
        reportsAPI.getSummary(dateRange),
        reportsAPI.getTrends(dateRange),
        reportsAPI.getPendingPayments(),
      ]);

      setSummary(summaryRes.data);
      setTrends(trendsRes.data);
      setPendingPayments(paymentsRes.data);
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
              <p className="text-sm text-gray-600">Total Purchases</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.totalPurchases || 0}</p>
              <p className="text-sm text-green-600 mt-2">
                ${(summary?.totalPurchaseAmount || 0).toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Total Sales</p>
              <p className="text-2xl font-bold text-gray-900">{summary?.totalSales || 0}</p>
              <p className="text-sm text-blue-600 mt-2">
                ${(summary?.totalSaleAmount || 0).toFixed(2)}
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Net Revenue</p>
              <p className="text-2xl font-bold text-gray-900">
                ${((summary?.totalSaleAmount || 0) - (summary?.totalPurchaseAmount || 0)).toFixed(2)}
              </p>
              <p className="text-sm text-purple-600 mt-2">
                Profit Margin: {summary?.totalSaleAmount ?
                  (((summary.totalSaleAmount - summary.totalPurchaseAmount) / summary.totalSaleAmount) * 100).toFixed(1) : 0}%
              </p>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <p className="text-sm text-gray-600">Total Material Weight</p>
              <p className="text-2xl font-bold text-gray-900">
                {(summary?.totalWeight || 0).toFixed(2)} kg
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Avg: ${summary?.totalWeight ? ((summary.totalPurchaseAmount + summary.totalSaleAmount) / summary.totalWeight).toFixed(2) : 0}/kg
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
                  <Line type="monotone" dataKey="purchases" stroke="#10b981" name="Purchases" />
                  <Line type="monotone" dataKey="sales" stroke="#3b82f6" name="Sales" />
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
              <h2 className="text-lg font-semibold text-gray-900">Revenue Analysis</h2>
            </div>
            {trends.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="purchaseAmount" fill="#10b981" name="Purchase Amount" />
                  <Bar dataKey="saleAmount" fill="#3b82f6" name="Sale Amount" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-center py-8 text-gray-500">No revenue data available</p>
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
                      Type
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Supplier/Customer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total Amount
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Paid
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Outstanding
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Days Pending
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {!pendingPayments || pendingPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No pending payments
                      </td>
                    </tr>
                  ) : (
                    pendingPayments.map((payment, index) => {
                      const outstanding = payment.totalAmount - (payment.paidAmount || 0);
                      const daysPending = Math.floor(
                        (new Date().getTime() - new Date(payment.createdAt).getTime()) / (1000 * 60 * 60 * 24)
                      );

                      return (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {format(new Date(payment.createdAt), 'MMM dd, yyyy')}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                payment.type === 'purchase'
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-blue-100 text-blue-800'
                              }`}
                            >
                              {payment.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {payment.supplierName || '-'}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-gray-900">
                            ${payment.totalAmount.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-green-600">
                            ${(payment.paidAmount || 0).toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm font-semibold text-red-600">
                            ${outstanding.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-900">
                            {daysPending} days
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
