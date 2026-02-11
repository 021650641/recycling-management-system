import { useState, useEffect, useRef } from 'react';
import { reportsAPI } from '@/lib/api';
import { useTranslation } from 'react-i18next';
import { Download, Calendar, TrendingUp, DollarSign, Mail, FileText, X, ShoppingCart, Users, GitBranch, RefreshCw, BarChart3 } from 'lucide-react';
import { format, subDays } from 'date-fns';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import toast from 'react-hot-toast';
import { useSettingsStore } from '@/store/settingsStore';
import { formatDate } from '@/lib/dateFormat';

type ReportTab = 'overview' | 'purchases' | 'sales' | 'traceability' | 'analysis';
type ExportFormat = 'pdf' | 'csv' | 'excel';

export default function Reports() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [summary, setSummary] = useState<any>(null);
  const [trends, setTrends] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [purchases, setPurchases] = useState<any[]>([]);
  const [sales, setSales] = useState<any[]>([]);
  const [purchaseGroupBy, setPurchaseGroupBy] = useState('vendor');
  const [salesGroupBy, setSalesGroupBy] = useState('client');
  const [showEmailDialog, setShowEmailDialog] = useState(false);
  const [emailConfigured, setEmailConfigured] = useState(false);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [analysisDataType, setAnalysisDataType] = useState<'purchases' | 'sales'>('purchases');
  const [analysisGroupBy, setAnalysisGroupBy] = useState('vendor');
  const exportRef = useRef<HTMLDivElement>(null);
  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
  });

  useEffect(() => {
    reportsAPI.getEmailStatus().then(res => setEmailConfigured(res.data?.configured)).catch(() => {});
  }, []);

  // Load data when tab changes
  useEffect(() => {
    if (activeTab !== 'traceability') {
      loadReports();
    }
  }, [activeTab, purchaseGroupBy, salesGroupBy]);

  // Close export menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (exportRef.current && !exportRef.current.contains(e.target as Node)) {
        setShowExportMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      if (activeTab === 'overview') {
        const [summaryRes, trendsRes, paymentsRes] = await Promise.all([
          reportsAPI.getSummary(dateRange).catch(() => ({ data: null })),
          reportsAPI.getTrends(dateRange).catch(() => ({ data: { trends: [] } })),
          reportsAPI.getPendingPayments().catch(() => ({ data: { payments: [] } })),
        ]);
        setSummary(summaryRes.data);
        setTrends(Array.isArray(trendsRes.data) ? trendsRes.data : trendsRes.data?.trends || []);
        setPendingPayments(Array.isArray(paymentsRes.data) ? paymentsRes.data : paymentsRes.data?.payments || []);
      } else if (activeTab === 'purchases') {
        const res = await reportsAPI.getPurchases({ ...dateRange, groupBy: purchaseGroupBy === 'detailed' ? undefined : purchaseGroupBy });
        setPurchases(res.data?.purchases || []);
      } else if (activeTab === 'sales') {
        const res = await reportsAPI.getSales({ ...dateRange, groupBy: salesGroupBy === 'detailed' ? undefined : salesGroupBy });
        setSales(res.data?.sales || []);
      } else if (activeTab === 'traceability') {
        // Traceability tab loads its own data independently
      }
    } catch (error) {
      console.error('Failed to load reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const { dateFormat: dfmt, timeFormat: tfmt } = useSettingsStore();

  const handleExport = async (fmt: ExportFormat) => {
    try {
      const reportTypeMap: Record<ReportTab, string> = { overview: 'purchases', purchases: 'purchases', sales: 'sales', traceability: 'traceability', analysis: 'aggregate' };
      const params: any = { ...dateRange, format: fmt, reportType: reportTypeMap[activeTab], dateFormat: dfmt, timeFormat: tfmt };
      if (activeTab === 'purchases' && purchaseGroupBy !== 'detailed') params.groupBy = purchaseGroupBy;
      if (activeTab === 'sales' && salesGroupBy !== 'detailed') params.groupBy = salesGroupBy;
      if (activeTab === 'analysis') {
        params.dataType = analysisDataType;
        params.groupBy = analysisGroupBy;
      }

      const response = await reportsAPI.export(params);
      const extMap: Record<string, string> = { pdf: 'pdf', csv: 'csv', excel: 'xlsx' };
      const blob = new Blob([response.data]);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `report_${dateRange.startDate}_to_${dateRange.endDate}.${extMap[fmt]}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(t('common.success'));
    } catch (error) {
      toast.error(t('common.error'));
    }
  };

  const tabs: { key: ReportTab; label: string; icon: any }[] = [
    { key: 'overview', label: t('reports.overview'), icon: TrendingUp },
    { key: 'purchases', label: t('reports.purchases'), icon: Users },
    { key: 'sales', label: t('reports.salesReport'), icon: ShoppingCart },
    { key: 'traceability', label: t('reports.traceabilityReport'), icon: GitBranch },
    { key: 'analysis', label: 'Analysis', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-bold text-gray-900">{t('reports.title')}</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => { loadReports(); setRefreshKey(k => k + 1); }}
            disabled={loading}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg transition-colors disabled:opacity-50">
            <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
            {t('common.refresh') || 'Refresh'}
          </button>
          <div className="relative" ref={exportRef}>
            <button onClick={() => setShowExportMenu(!showExportMenu)}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors">
              <Download className="w-5 h-5" />
              {t('reports.exportReport')}
            </button>
            {showExportMenu && (
              <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-10 min-w-[140px]">
                <button onClick={() => { handleExport('pdf'); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-red-500" /> PDF
                </button>
                <button onClick={() => { handleExport('csv'); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-green-500" /> CSV
                </button>
                <button onClick={() => { handleExport('excel'); setShowExportMenu(false); }} className="w-full text-left px-4 py-2 text-sm hover:bg-gray-50 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-blue-500" /> Excel
                </button>
              </div>
            )}
          </div>
          <button onClick={() => setShowEmailDialog(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            <Mail className="w-5 h-5" />
            {t('reports.emailReport')}
          </button>
        </div>
      </div>

      {/* Date Range */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">{t('reports.dateRange')}</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">{t('reports.startDate')}</label>
            <input type="date" value={dateRange.startDate} onChange={(e) => setDateRange(p => ({ ...p, startDate: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">{t('reports.endDate')}</label>
            <input type="date" value={dateRange.endDate} onChange={(e) => setDateRange(p => ({ ...p, endDate: e.target.value }))}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === tab.key ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}>
                  <Icon className="w-4 h-4" /> {tab.label}
                </button>
              );
            })}
          </nav>
        </div>
        <div className="p-6">
          {loading ? (
            <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
          ) : (
            <>
              {activeTab === 'overview' && <OverviewTab summary={summary} trends={trends} pendingPayments={pendingPayments} t={t} dfmt={dfmt} />}
              {activeTab === 'purchases' && <PurchasesTab data={purchases} groupBy={purchaseGroupBy} setGroupBy={setPurchaseGroupBy} t={t} dfmt={dfmt} />}
              {activeTab === 'sales' && <SalesTab data={sales} groupBy={salesGroupBy} setGroupBy={setSalesGroupBy} t={t} dfmt={dfmt} />}
              {activeTab === 'traceability' && <TraceabilityTab dateRange={dateRange} refreshKey={refreshKey} t={t} dfmt={dfmt} />}
              {activeTab === 'analysis' && <AnalysisTab dateRange={dateRange} refreshKey={refreshKey} t={t} dfmt={dfmt} tfmt={tfmt} onStateChange={(dt: string, gb: string) => { setAnalysisDataType(dt as any); setAnalysisGroupBy(gb); }} />}
            </>
          )}
        </div>
      </div>

      {showEmailDialog && <EmailDialog t={t} emailConfigured={emailConfigured} activeTab={activeTab} dateRange={dateRange} dfmt={dfmt} tfmt={tfmt} onClose={() => setShowEmailDialog(false)} />}
    </div>
  );
}

function StatCard({ label, value, color = 'text-gray-900' }: { label: string; value: any; color?: string }) {
  return (
    <div className="bg-white border border-gray-200 p-4 rounded-lg">
      <p className="text-sm text-gray-600">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
    </div>
  );
}

function OverviewTab({ summary, trends, pendingPayments, t, dfmt }: any) {
  const profit = (summary?.totalSalesRevenue || 0) - (summary?.totalPurchaseCost || 0);
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('reports.summary.totalMaterials')} value={`${(summary?.totalMaterialsKg || 0).toFixed(1)} kg`} />
        <StatCard label={t('reports.summary.totalPurchases')} value={`$${(summary?.totalPurchaseCost || 0).toFixed(2)}`} />
        <StatCard label={t('reports.summary.totalSalesRevenue')} value={`$${(summary?.totalSalesRevenue || 0).toFixed(2)}`} color="text-green-600" />
        <StatCard label={t('reports.summary.profit')} value={`$${profit.toFixed(2)}`} color={profit >= 0 ? 'text-green-600' : 'text-red-600'} />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label={t('reports.summary.transactionCount')} value={summary?.totalTransactions || 0} />
        <StatCard label={t('reports.summary.salesCount')} value={summary?.totalSalesCount || 0} />
        <StatCard label={t('reports.summary.activeLocations')} value={summary?.activeLocations || 0} />
        <StatCard label={t('reports.summary.pendingPayments')} value={`$${(summary?.pendingPayments || 0).toFixed(2)}`} color="text-red-600" />
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <TrendingUp className="w-5 h-5" /> {t('reports.trends.title')}
        </h3>
        {trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="total_weight_kg" stroke="#10b981" name={t('reports.trends.weight')} />
              <Line type="monotone" dataKey="total_transactions" stroke="#3b82f6" name={t('reports.trends.count')} />
            </LineChart>
          </ResponsiveContainer>
        ) : <p className="text-center py-8 text-gray-500">{t('common.noData')}</p>}
      </div>

      <div className="bg-gray-50 p-4 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5" /> {t('reports.trends.value')}
        </h3>
        {trends.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trends}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="total_value" fill="#10b981" name={t('reports.trends.value')} />
            </BarChart>
          </ResponsiveContainer>
        ) : <p className="text-center py-8 text-gray-500">{t('common.noData')}</p>}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('reports.pendingPayments.title')}</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.pendingPayments.wastePicker')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.pendingPayments.material')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.pendingPayments.totalCost')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.pendingPayments.paid')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.pendingPayments.amountDue')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pendingPayments.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t('common.noData')}</td></tr>
              ) : pendingPayments.map((p: any, i: number) => (
                <tr key={p.transaction_id || i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{formatDate(p.transaction_date, dfmt)}</td>
                  <td className="px-4 py-3 text-sm">{p.waste_picker_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{p.material_category || '-'}</td>
                  <td className="px-4 py-3 text-sm font-semibold">${(parseFloat(p.total_cost) || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-green-600">${(parseFloat(p.paid_amount) || 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-red-600">${(parseFloat(p.amount_due) || 0).toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      p.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>{p.payment_status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function GroupToggle({ options, value, onChange }: { options: { key: string; label: string }[]; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {options.map(opt => (
        <button key={opt.key} onClick={() => onChange(opt.key)}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${value === opt.key ? 'bg-white shadow text-primary-700 font-medium' : 'text-gray-600 hover:text-gray-800'}`}>
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function PurchasesTab({ data, groupBy, setGroupBy, t, dfmt }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{t('reports.purchasesReport.title')}</h3>
        <GroupToggle value={groupBy} onChange={setGroupBy} options={[
          { key: 'vendor', label: t('reports.purchasesReport.byVendor') },
          { key: 'material', label: t('reports.purchasesReport.byMaterial') },
          { key: 'detailed', label: t('reports.purchasesReport.detailed') },
        ]} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {groupBy === 'vendor' && <>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.purchasesReport.vendor')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.purchasesReport.totalWeight')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.purchasesReport.totalCost')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.purchasesReport.totalPaid')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.purchasesReport.outstanding')}</th>
              </>}
              {groupBy === 'material' && <>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.material')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.purchasesReport.totalWeight')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg $/kg</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.purchasesReport.totalCost')}</th>
              </>}
              {groupBy === 'detailed' && <>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.purchasesReport.vendor')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.material')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">kg</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.total')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
              </>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t('common.noData')}</td></tr>
            ) : data.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50">
                {groupBy === 'vendor' && <>
                  <td className="px-4 py-3 text-sm font-medium">{row.waste_picker_name}</td>
                  <td className="px-4 py-3 text-sm">{row.transaction_count}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(row.total_weight_kg).toFixed(1)}</td>
                  <td className="px-4 py-3 text-sm font-semibold">${parseFloat(row.total_cost).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-green-600">${parseFloat(row.total_paid).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-red-600 font-semibold">${parseFloat(row.total_outstanding).toFixed(2)}</td>
                </>}
                {groupBy === 'material' && <>
                  <td className="px-4 py-3 text-sm font-medium">{row.material_name}</td>
                  <td className="px-4 py-3 text-sm">{row.transaction_count}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(row.total_weight_kg).toFixed(1)}</td>
                  <td className="px-4 py-3 text-sm">${parseFloat(row.avg_price_per_kg).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-semibold">${parseFloat(row.total_cost).toFixed(2)}</td>
                </>}
                {groupBy === 'detailed' && <>
                  <td className="px-4 py-3 text-sm">{formatDate(row.transaction_date, dfmt)}</td>
                  <td className="px-4 py-3 text-sm">{row.waste_picker_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{row.material_name}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(row.weight_kg).toFixed(1)}</td>
                  <td className="px-4 py-3 text-sm font-semibold">${parseFloat(row.total_cost).toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.payment_status} /></td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SalesTab({ data, groupBy, setGroupBy, t, dfmt }: any) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">{t('reports.salesReportSection.title')}</h3>
        <GroupToggle value={groupBy} onChange={setGroupBy} options={[
          { key: 'client', label: t('reports.salesReportSection.byClient') },
          { key: 'material', label: t('reports.salesReportSection.byMaterial') },
          { key: 'detailed', label: t('reports.salesReportSection.detailed') },
        ]} />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              {groupBy === 'client' && <>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.salesReportSection.client')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.salesReportSection.totalWeight')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.salesReportSection.revenue')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.salesReportSection.totalPaid')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.salesReportSection.outstanding')}</th>
              </>}
              {groupBy === 'material' && <>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.material')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.salesReportSection.totalWeight')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg $/kg</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.salesReportSection.revenue')}</th>
              </>}
              {groupBy === 'detailed' && <>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.salesReportSection.client')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.material')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">kg</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.total')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.salesReportSection.delivery')}</th>
              </>}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {data.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t('common.noData')}</td></tr>
            ) : data.map((row: any, i: number) => (
              <tr key={i} className="hover:bg-gray-50">
                {groupBy === 'client' && <>
                  <td className="px-4 py-3 text-sm font-medium">{row.client_name}</td>
                  <td className="px-4 py-3 text-sm">{row.sale_count}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(row.total_weight_kg).toFixed(1)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">${parseFloat(row.total_revenue).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm">${parseFloat(row.total_paid).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-red-600 font-semibold">${parseFloat(row.total_outstanding).toFixed(2)}</td>
                </>}
                {groupBy === 'material' && <>
                  <td className="px-4 py-3 text-sm font-medium">{row.material_name}</td>
                  <td className="px-4 py-3 text-sm">{row.sale_count}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(row.total_weight_kg).toFixed(1)}</td>
                  <td className="px-4 py-3 text-sm">${parseFloat(row.avg_price_per_kg).toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">${parseFloat(row.total_revenue).toFixed(2)}</td>
                </>}
                {groupBy === 'detailed' && <>
                  <td className="px-4 py-3 text-sm">{formatDate(row.sale_date, dfmt)}</td>
                  <td className="px-4 py-3 text-sm">{row.client_name}</td>
                  <td className="px-4 py-3 text-sm">{row.material_name}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(row.weight_kg).toFixed(1)}</td>
                  <td className="px-4 py-3 text-sm font-semibold">${parseFloat(row.total_amount).toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.payment_status} /></td>
                  <td className="px-4 py-3"><StatusBadge status={row.delivery_status} /></td>
                </>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TraceabilityTab({ dateRange, refreshKey, t, dfmt }: any) {
  const [data, setData] = useState<any>({ transactions: [], summary: [] });
  const [loading, setLoading] = useState(true);
  const dateKey = `${dateRange.startDate}_${dateRange.endDate}`;

  const loadData = () => {
    setLoading(true);
    reportsAPI.getTraceability(dateRange)
      .then(res => setData(res.data || { transactions: [], summary: [] }))
      .catch(() => setData({ transactions: [], summary: [] }))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [dateKey, refreshKey]);

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      {data.summary?.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('reports.overview')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.material')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">kg</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">#</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.total')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {data.summary.map((row: any, i: number) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium">{row.source_name || '-'}</td>
                    <td className="px-4 py-3 text-sm">{row.material_category}</td>
                    <td className="px-4 py-3 text-sm">{parseFloat(row.total_weight_kg).toFixed(1)}</td>
                    <td className="px-4 py-3 text-sm">{row.transaction_count}</td>
                    <td className="px-4 py-3 text-sm font-semibold">${parseFloat(row.total_cost).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-3">{t('nav.transactions')} ({data.transactions?.length || 0})</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Source</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.wastePicker')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('transactions.material')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">kg</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.total')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {(data.transactions || []).length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t('common.noData')}</td></tr>
              ) : (data.transactions || []).map((row: any, i: number) => (
                <tr key={i} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm">{formatDate(row.transaction_date, dfmt)}</td>
                  <td className="px-4 py-3 text-sm">{row.source_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{row.waste_picker_name || '-'}</td>
                  <td className="px-4 py-3 text-sm">{row.material_category}</td>
                  <td className="px-4 py-3 text-sm">{parseFloat(row.weight_kg).toFixed(1)}</td>
                  <td className="px-4 py-3 text-sm font-semibold">${parseFloat(row.total_cost).toFixed(2)}</td>
                  <td className="px-4 py-3"><StatusBadge status={row.payment_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

type AggGroupBy = 'vendor' | 'source' | 'unit' | 'material' | 'location' | 'client';

function AnalysisTab({ dateRange, refreshKey, t, onStateChange }: any) {
  const [dataType, setDataType] = useState<'purchases' | 'sales'>('purchases');
  const [groupBy, setGroupBy] = useState<AggGroupBy>('vendor');
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const purchaseGroups: { key: AggGroupBy; label: string }[] = [
    { key: 'vendor', label: 'By Vendor' },
    { key: 'source', label: 'By Source' },
    { key: 'unit', label: 'By Unit' },
    { key: 'material', label: 'By Material' },
    { key: 'location', label: 'By Location' },
  ];
  const salesGroups: { key: AggGroupBy; label: string }[] = [
    { key: 'client', label: 'By Client' },
    { key: 'material', label: 'By Material' },
    { key: 'location', label: 'By Location' },
  ];

  const groupOptions = dataType === 'sales' ? salesGroups : purchaseGroups;

  // Reset groupBy when dataType changes
  useEffect(() => {
    const newGb = dataType === 'sales' ? 'client' : 'vendor';
    setGroupBy(newGb);
    onStateChange?.(dataType, newGb);
  }, [dataType]);

  // Sync state changes to parent for export
  useEffect(() => {
    onStateChange?.(dataType, groupBy);
  }, [groupBy]);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await reportsAPI.getAggregate({ ...dateRange, dataType, groupBy });
      setData(res.data?.rows || []);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [dateRange.startDate, dateRange.endDate, dataType, groupBy, refreshKey]);

  // Compute grouped totals for subtotal rows
  const groups: Record<string, any[]> = {};
  for (const row of data) {
    const key = row.group_name || 'Unknown';
    if (!groups[key]) groups[key] = [];
    groups[key].push(row);
  }

  const subGroupLabel = groupBy === 'material'
    ? (dataType === 'sales' ? 'Client' : 'Vendor')
    : 'Material';
  const valueLabel = dataType === 'sales' ? 'Revenue' : 'Cost';
  const groupLabel = groupBy.charAt(0).toUpperCase() + groupBy.slice(1);

  // Grand totals
  const grandWeight = data.reduce((s, r) => s + parseFloat(r.total_weight_kg || 0), 0);
  const grandValue = data.reduce((s, r) => s + parseFloat(r.total_value || 0), 0);
  const grandCount = data.reduce((s, r) => s + parseInt(r.record_count || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Data</label>
          <GroupToggle value={dataType} onChange={(v: any) => setDataType(v)} options={[
            { key: 'purchases', label: t('reports.purchases') },
            { key: 'sales', label: t('reports.salesReport') },
          ]} />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Group by</label>
          <GroupToggle value={groupBy} onChange={(v: any) => setGroupBy(v)} options={groupOptions} />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : data.length === 0 ? (
        <div className="text-center py-12 text-gray-500">{t('common.noData')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{groupLabel}</th>
                {groupBy === 'unit' && <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Resident</th>}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{subGroupLabel}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">#</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Weight (kg)</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{valueLabel}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Avg $/kg</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {Object.entries(groups).map(([groupName, rows]) => {
                const grpWeight = rows.reduce((s, r) => s + parseFloat(r.total_weight_kg || 0), 0);
                const grpValue = rows.reduce((s, r) => s + parseFloat(r.total_value || 0), 0);
                const grpCount = rows.reduce((s, r) => s + parseInt(r.record_count || 0), 0);

                return (
                  <>{rows.map((row, i) => (
                    <tr key={`${groupName}-${i}`} className="hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm">
                        {i === 0 ? <span className="font-semibold text-gray-900">{groupName}</span> : ''}
                      </td>
                      {groupBy === 'unit' && <td className="px-4 py-2 text-sm text-gray-500">{i === 0 ? row.resident_name || '' : ''}</td>}
                      <td className="px-4 py-2 text-sm">{row.sub_group || '-'}</td>
                      <td className="px-4 py-2 text-sm text-right">{row.record_count}</td>
                      <td className="px-4 py-2 text-sm text-right">{parseFloat(row.total_weight_kg).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-right">${parseFloat(row.total_value).toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-right">${parseFloat(row.avg_price_per_kg).toFixed(4)}</td>
                    </tr>
                  ))}
                  {rows.length > 1 && (
                    <tr key={`${groupName}-total`} className="bg-gray-50">
                      <td className="px-4 py-2 text-sm font-bold text-gray-700">{groupName} Total</td>
                      {groupBy === 'unit' && <td />}
                      <td />
                      <td className="px-4 py-2 text-sm text-right font-bold">{grpCount}</td>
                      <td className="px-4 py-2 text-sm text-right font-bold">{grpWeight.toFixed(2)}</td>
                      <td className="px-4 py-2 text-sm text-right font-bold">${grpValue.toFixed(2)}</td>
                      <td />
                    </tr>
                  )}
                  </>
                );
              })}
            </tbody>
            <tfoot className="border-t-2 border-gray-300">
              <tr className="bg-gray-100 font-bold">
                <td className="px-4 py-3 text-sm">Grand Total</td>
                {groupBy === 'unit' && <td />}
                <td className="px-4 py-3 text-sm text-gray-500">{Object.keys(groups).length} {groupLabel.toLowerCase()}s</td>
                <td className="px-4 py-3 text-sm text-right">{grandCount}</td>
                <td className="px-4 py-3 text-sm text-right">{grandWeight.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-right">${grandValue.toFixed(2)}</td>
                <td className="px-4 py-3 text-sm text-right">{grandWeight > 0 ? `$${(grandValue / grandWeight).toFixed(4)}` : '-'}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    paid: 'bg-green-100 text-green-800', delivered: 'bg-green-100 text-green-800',
    partial: 'bg-yellow-100 text-yellow-800',
    pending: 'bg-red-100 text-red-800',
    cancelled: 'bg-red-100 text-red-800',
  };
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}

function EmailDialog({ t, emailConfigured, activeTab, dateRange, dfmt, tfmt, onClose }: any) {
  const [sending, setSending] = useState(false);
  const [form, setForm] = useState({
    to: '', subject: '', message: '', format: 'pdf',
    reportType: activeTab === 'overview' ? 'purchases' : activeTab,
  });

  const handleSend = async () => {
    if (!form.to) { toast.error(t('common.required')); return; }
    setSending(true);
    try {
      await reportsAPI.emailReport({ ...form, ...dateRange, dateFormat: dfmt, timeFormat: tfmt });
      toast.success(t('reports.emailDialog.sent'));
      onClose();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('common.error'));
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('reports.emailDialog.title')}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        {!emailConfigured ? (
          <p className="text-amber-600 bg-amber-50 p-3 rounded-lg text-sm">{t('reports.emailDialog.notConfigured')}</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.emailDialog.recipient')}</label>
              <input type="email" value={form.to} onChange={e => setForm(f => ({ ...f, to: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500" placeholder="email@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.emailDialog.subject')}</label>
              <input type="text" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.emailDialog.message')}</label>
              <textarea value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.emailDialog.format')}</label>
                <select value={form.format} onChange={e => setForm(f => ({ ...f, format: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="pdf">PDF</option><option value="csv">CSV</option><option value="excel">Excel</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">{t('reports.emailDialog.reportType')}</label>
                <select value={form.reportType} onChange={e => setForm(f => ({ ...f, reportType: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-primary-500">
                  <option value="purchases">{t('reports.purchases')}</option>
                  <option value="sales">{t('reports.salesReport')}</option>
                  <option value="traceability">{t('reports.traceabilityReport')}</option>
                </select>
              </div>
            </div>
            <button onClick={handleSend} disabled={sending}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white py-2 rounded-lg transition-colors flex items-center justify-center gap-2">
              <Mail className="w-4 h-4" /> {sending ? t('reports.emailDialog.sending') : t('common.send')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
