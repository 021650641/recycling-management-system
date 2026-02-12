import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { transactionsAPI, salesAPI, clientsAPI, materialsAPI, locationsAPI, inventoryAPI } from '@/lib/api';
import {
  Plus, Filter, Search, Save, X, DollarSign, Truck,
  ShoppingCart, ArrowLeftRight, FileText, RotateCcw, Eye,
  ChevronDown, ChevronRight, Printer, AlertTriangle,
} from 'lucide-react';
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
      onClick={() => { window.dispatchEvent(new CustomEvent('toggle-sale-form')); }}
      className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg transition-colors"
    >
      <Plus className="w-5 h-5" />
      {t('sales.create')}
    </button>
  );
}

// ===== Notes Edit Modal =====
function NotesModal({ notes, onSave, onClose, title }: {
  notes: string; onSave: (notes: string) => void; onClose: () => void; title: string;
}) {
  const { t } = useTranslation();
  const [value, setValue] = useState(notes || '');
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4">
          <textarea value={value} onChange={(e) => setValue(e.target.value)} rows={4} autoFocus
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            placeholder={t('common.notes')} />
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">{t('common.cancel')}</button>
          <button onClick={() => onSave(value)} className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
            <Save className="w-4 h-4" /> {t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Void Confirmation Modal (reason MANDATORY) =====
function VoidConfirmModal({ message, onConfirm, onClose, reasonLabel }: {
  message: string; onConfirm: (reason: string) => void; onClose: () => void; reasonLabel: string;
}) {
  const { t } = useTranslation();
  const [reason, setReason] = useState('');
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-semibold text-red-600 flex items-center gap-2">
            <RotateCcw className="w-5 h-5" /> {t('transactions.void')}
          </h3>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-700">{message}</p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{reasonLabel} <span className="text-red-500">*</span></label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 outline-none" />
          </div>
        </div>
        <div className="flex justify-end gap-2 p-4 border-t">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg">{t('common.cancel')}</button>
          <button onClick={() => onConfirm(reason)} disabled={!reason.trim()}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg">
            <RotateCcw className="w-4 h-4" /> {t('transactions.void')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== Transaction Detail Modal =====
function TransactionDetailModal({ transaction, onClose }: { transaction: any; onClose: () => void }) {
  const { t } = useTranslation();
  const tx = transaction;
  const fields = [
    { label: t('transactions.transactionNumber'), value: tx.transaction_number },
    { label: t('common.date'), value: tx.transaction_date ? format(new Date(tx.transaction_date), 'MMM dd, yyyy') : '-' },
    { label: t('transactions.source'), value: tx.source_name || '-' },
    { label: t('transactions.sourceType'), value: (tx.source_type || '').replace('_', ' ') },
    { label: t('common.location'), value: tx.location_name || '-' },
    { label: t('transactions.material'), value: tx.material_category || '-' },
    { label: t('transactions.weightKg'), value: `${parseFloat(tx.weight_kg || 0).toFixed(2)} kg` },
    { label: t('transactions.unitPrice'), value: `$${parseFloat(tx.unit_price || 0).toFixed(2)}/kg` },
    { label: t('transactions.totalCost'), value: `$${parseFloat(tx.total_cost || 0).toFixed(2)}` },
    { label: t('common.status'), value: tx.payment_status || 'pending' },
    { label: t('transactions.paymentMethod'), value: tx.payment_method || '-' },
    { label: t('transactions.paidAmount'), value: `$${parseFloat(tx.paid_amount || 0).toFixed(2)}` },
    { label: t('transactions.qualityGrade'), value: tx.quality_grade || 'standard' },
    { label: t('common.notes'), value: tx.notes || '-' },
  ];

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${tx.transaction_number}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { font-size: 18px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        td:first-child { font-weight: bold; color: #6b7280; width: 40%; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>CIVICycle - ${t('transactions.transactionNumber')} ${tx.transaction_number}</h1>
      <table>${fields.map(f => `<tr><td>${f.label}</td><td>${f.value}</td></tr>`).join('')}</table>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Eye className="w-5 h-5" /> {t('transactions.transactionNumber')}: {tx.transaction_number}
          </h3>
          <div className="flex items-center gap-1">
            <button onClick={handlePrint} className="p-1 hover:bg-gray-100 rounded" title="Print">
              <Printer className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-4">
          <table className="w-full">
            <tbody>
              {fields.map(({ label, value }) => (
                <tr key={label} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-sm font-medium text-gray-500 whitespace-nowrap">{label}</td>
                  <td className="py-2 text-sm text-gray-900 break-words">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ===== Sale Detail Modal =====
function SaleDetailModal({ sale, onClose }: { sale: any; onClose: () => void }) {
  const { t } = useTranslation();
  const fields = [
    { label: t('sales.saleNumber'), value: sale.sale_number },
    { label: t('common.date'), value: sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : '-' },
    { label: t('sales.client'), value: sale.client_name || '-' },
    { label: t('common.location'), value: sale.location_name || '-' },
    { label: t('sales.material'), value: sale.material_category || '-' },
    { label: t('sales.weightKg'), value: `${Number(sale.weight_kg || 0).toFixed(2)} kg` },
    { label: t('sales.unitPrice'), value: `$${Number(sale.unit_price || 0).toFixed(2)}/kg` },
    { label: t('sales.totalAmount'), value: `$${Number(sale.total_amount || 0).toFixed(2)}` },
    { label: t('sales.paymentStatus'), value: sale.payment_status || 'pending' },
    { label: t('sales.paymentMethod'), value: sale.payment_method || '-' },
    { label: t('sales.paidAmount'), value: `$${Number(sale.paid_amount || 0).toFixed(2)}` },
    { label: t('sales.deliveryStatus'), value: sale.delivery_status || 'pending' },
    { label: t('common.notes'), value: sale.notes || '-' },
  ];

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>${sale.sale_number}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 40px; }
        h1 { font-size: 18px; margin-bottom: 20px; }
        table { width: 100%; border-collapse: collapse; }
        td { padding: 8px 12px; border-bottom: 1px solid #e5e7eb; font-size: 14px; }
        td:first-child { font-weight: bold; color: #6b7280; width: 40%; }
        @media print { body { padding: 20px; } }
      </style></head><body>
      <h1>CIVICycle - ${t('sales.saleNumber')} ${sale.sale_number}</h1>
      <table>${fields.map(f => `<tr><td>${f.label}</td><td>${f.value}</td></tr>`).join('')}</table>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Eye className="w-5 h-5" /> {t('sales.saleNumber')}: {sale.sale_number}
          </h3>
          <div className="flex items-center gap-1">
            <button onClick={handlePrint} className="p-1 hover:bg-gray-100 rounded" title="Print">
              <Printer className="w-5 h-5" />
            </button>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-4">
          <table className="w-full">
            <tbody>
              {fields.map(({ label, value }) => (
                <tr key={label} className="border-b border-gray-100">
                  <td className="py-2 pr-4 text-sm font-medium text-gray-500 whitespace-nowrap">{label}</td>
                  <td className="py-2 text-sm text-gray-900 break-words">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
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

  const [editingNotes, setEditingNotes] = useState<{ id: string; notes: string } | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [viewingTx, setViewingTx] = useState<any>(null);
  const [collapsedPairs, setCollapsedPairs] = useState<Set<string>>(new Set());

  useEffect(() => { loadData(); }, []);

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

  const handleMarkAsPaid = async (tx: any) => {
    try {
      await transactionsAPI.updatePayment(tx.transaction_id || tx.id, {
        paymentStatus: 'paid', paidAmount: tx.total_cost,
      });
      toast.success(t('transactions.paid'));
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('transactions.paymentUpdateError'));
    }
  };

  const handleUpdateNotes = async (notes: string) => {
    if (!editingNotes) return;
    try {
      await transactionsAPI.updateNotes(editingNotes.id, { notes });
      toast.success(t('transactions.notesUpdated'));
      setEditingNotes(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('transactions.notesUpdateError'));
    }
  };

  const handleVoid = async (reason: string) => {
    if (!voidingId) return;
    try {
      await transactionsAPI.voidTransaction(voidingId, { reason });
      toast.success(t('transactions.voided'));
      setVoidingId(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('transactions.voidError'));
    }
  };

  const filteredTransactions = transactions?.filter(transaction => {
    const matchesSearch = searchTerm === '' ||
      (transaction.source_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.material_category || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.location_name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (transaction.transaction_number || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || transaction.source_type === filterType;
    const matchesPayment = filterPayment === 'all' || transaction.payment_status === filterPayment;
    return matchesSearch && matchesType && matchesPayment;
  });

  // Group transactions: put reversals directly after their original
  const groupedTransactions = (() => {
    if (!filteredTransactions) return [];
    const originals = filteredTransactions.filter(tx => !(tx.transaction_number || '').startsWith('REV-'));
    const reversals = new Map<string, any>();
    filteredTransactions.filter(tx => (tx.transaction_number || '').startsWith('REV-')).forEach(tx => {
      const origNum = (tx.transaction_number || '').replace('REV-', '');
      reversals.set(origNum, tx);
    });
    const result: any[] = [];
    for (const tx of originals) {
      result.push(tx);
      const rev = reversals.get(tx.transaction_number);
      if (rev) {
        result.push(rev);
        reversals.delete(tx.transaction_number);
      }
    }
    // Append any orphan reversals
    for (const rev of reversals.values()) result.push(rev);
    return result;
  })();

  const hasReversal = (txNum: string) => transactions.some(t => t.transaction_number === `REV-${txNum}`);

  const toggleCollapse = (txNum: string) => {
    setCollapsedPairs(prev => {
      const next = new Set(prev);
      if (next.has(txNum)) {
        next.delete(txNum);
      } else {
        next.add(txNum);
      }
      return next;
    });
  };

  // By default reversals are collapsed. A pair is "expanded" only if the txNum is in collapsedPairs (toggled open).
  const isExpanded = (txNum: string) => collapsedPairs.has(txNum);

  const handlePrintTable = () => {
    window.print();
  };

  const stats = {
    total: transactions?.length || 0,
    apartment: transactions?.filter(tx => tx.source_type === 'apartment').length || 0,
    wastePicker: transactions?.filter(tx => tx.source_type === 'waste_picker').length || 0,
    pending: transactions?.filter(tx => tx.payment_status !== 'paid').length || 0,
  };

  return (
    <div className="space-y-6">
      {editingNotes && <NotesModal notes={editingNotes.notes} title={t('transactions.editNotes')} onSave={handleUpdateNotes} onClose={() => setEditingNotes(null)} />}
      {voidingId && <VoidConfirmModal message={t('transactions.voidConfirm')} reasonLabel={t('transactions.voidReason')} onConfirm={handleVoid} onClose={() => setVoidingId(null)} />}
      {viewingTx && <TransactionDetailModal transaction={viewingTx} onClose={() => setViewingTx(null)} />}

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
      <div className="bg-white p-4 rounded-lg shadow space-y-4 print:hidden">
        <div className="flex items-center gap-2 text-gray-700 font-medium">
          <Filter className="w-5 h-5" /> {t('transactions.filters')}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-gray-600 mb-2">{t('common.search')}</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
                placeholder={t('transactions.searchTransactions')}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">{t('transactions.sourceType')}</label>
            <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
              <option value="all">{t('common.allTypes')}</option>
              <option value="apartment">{t('transactions.apartment')}</option>
              <option value="waste_picker">{t('transactions.wastePicker')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-2">{t('transactions.paymentStatus')}</label>
            <select value={filterPayment} onChange={(e) => setFilterPayment(e.target.value as any)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none">
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
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 print:hidden">
          <h2 className="text-sm font-medium text-gray-700">{t('transactions.purchasesTab')}</h2>
          <button onClick={handlePrintTable} className="flex items-center gap-1 text-gray-600 hover:text-gray-800 p-1.5 hover:bg-gray-100 rounded" title="Print table">
            <Printer className="w-4 h-4" />
            <span className="text-xs">{t('common.print') || 'Print'}</span>
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.transactionNumber')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.date')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.material')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.source')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.weightKg')}</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">{t('transactions.totalCost')}</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('common.status')}</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider print:hidden">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">{t('transactions.loadingTransactions')}</td></tr>
              ) : !groupedTransactions || groupedTransactions.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">{t('transactions.noTransactions')}</td></tr>
              ) : (
                groupedTransactions.map((tx) => {
                  const txNum = tx.transaction_number || '';
                  const isRev = txNum.startsWith('REV-');
                  const txHasReversal = !isRev && hasReversal(txNum);

                  // If this is a reversal row and the original is collapsed, hide it
                  if (isRev) {
                    const origNum = txNum.replace('REV-', '');
                    if (!isExpanded(origNum)) {
                      return null;
                    }
                  }

                  return (
                    <tr key={tx.transaction_id || tx.id}
                      className={`hover:bg-gray-50 cursor-pointer ${isRev ? 'bg-red-50' : txHasReversal ? 'bg-orange-50' : ''}`}
                      onClick={() => setViewingTx(tx)}>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center">
                          {txHasReversal && (
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleCollapse(txNum); }}
                              className="mr-1 p-0.5 hover:bg-gray-200 rounded"
                            >
                              {isExpanded(txNum) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                            </button>
                          )}
                          {isRev && <span className="inline-block w-3 border-l-2 border-red-400 mr-1">&nbsp;</span>}
                          {!txHasReversal && !isRev && <span className="inline-block w-5 mr-1" />}
                          {txNum}
                          {isRev && <span className="ml-2 inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700">{t('transactions.reversing')}</span>}
                          {txHasReversal && <span className="ml-2 inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded bg-orange-100 text-orange-700">{t('transactions.reversed')}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{format(new Date(tx.transaction_date || tx.created_at), 'MMM dd, yyyy')}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{tx.material_category || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {tx.source_name || '-'}
                        <span className="block text-xs text-gray-500 capitalize">{(tx.source_type || '').replace('_', ' ')}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{parseFloat(tx.weight_kg || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-gray-900 text-right">${parseFloat(tx.total_cost || 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          tx.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          tx.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {tx.payment_status === 'paid' ? t('transactions.paid') : tx.payment_status === 'partial' ? t('transactions.partial') : t('transactions.pending')}
                        </span>
                      </td>
                      <td className="px-4 py-3 print:hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="flex gap-1">
                          <button onClick={() => setViewingTx(tx)} className="text-gray-600 hover:text-gray-800 p-1" title={t('common.view')}>
                            <Eye className="w-4 h-4" />
                          </button>
                          {tx.payment_status !== 'paid' && !isRev && (
                            <button onClick={() => handleMarkAsPaid(tx)} className="text-green-600 hover:text-green-800 p-1" title={t('transactions.markAsPaid')}>
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          <button onClick={() => setEditingNotes({ id: tx.transaction_id || tx.id, notes: tx.notes || '' })}
                            className="text-blue-600 hover:text-blue-800 p-1" title={t('transactions.editNotes')}>
                            <FileText className="w-4 h-4" />
                          </button>
                          {!isRev && !txHasReversal && (
                            <button onClick={() => setVoidingId(tx.transaction_id || tx.id)}
                              className="text-red-600 hover:text-red-800 p-1" title={t('transactions.voidTransaction')}>
                              <RotateCcw className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
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

  const [editingNotes, setEditingNotes] = useState<{ id: string; notes: string } | null>(null);
  const [voidingId, setVoidingId] = useState<string | null>(null);
  const [viewingSale, setViewingSale] = useState<any>(null);
  const [collapsedPairs, setCollapsedPairs] = useState<Set<string>>(new Set());

  useEffect(() => { loadData(); loadFormOptions(); }, []);

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
        clientsAPI.getAll(), materialsAPI.getAll(), locationsAPI.getAll(),
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

  const handleUpdateNotes = async (notes: string) => {
    if (!editingNotes) return;
    try {
      await salesAPI.updateNotes(editingNotes.id, { notes });
      toast.success(t('sales.notesUpdated'));
      setEditingNotes(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('sales.notesUpdateError'));
    }
  };

  const handleVoid = async (reason: string) => {
    if (!voidingId) return;
    try {
      await salesAPI.voidSale(voidingId, { reason });
      toast.success(t('sales.voided'));
      setVoidingId(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('sales.voidError'));
    }
  };

  const hasReversal = (saleNum: string) => sales.some(s => s.sale_number === `REV-${saleNum}`);

  const toggleCollapse = (saleNum: string) => {
    setCollapsedPairs(prev => {
      const next = new Set(prev);
      if (next.has(saleNum)) {
        next.delete(saleNum);
      } else {
        next.add(saleNum);
      }
      return next;
    });
  };

  // By default reversals are collapsed. A pair is "expanded" only if the saleNum is in collapsedPairs (toggled open).
  const isExpanded = (saleNum: string) => collapsedPairs.has(saleNum);

  const handlePrintTable = () => {
    window.print();
  };

  // Group sales: reversals directly after originals
  const groupedSales = (() => {
    const originals = sales.filter(s => !(s.sale_number || '').startsWith('REV-'));
    const reversals = new Map<string, Sale>();
    sales.filter(s => (s.sale_number || '').startsWith('REV-')).forEach(s => {
      const origNum = (s.sale_number || '').replace('REV-', '');
      reversals.set(origNum, s);
    });
    const result: Sale[] = [];
    for (const s of originals) {
      result.push(s);
      const rev = reversals.get(s.sale_number);
      if (rev) { result.push(rev); reversals.delete(s.sale_number); }
    }
    for (const rev of reversals.values()) result.push(rev);
    return result;
  })();

  const getStatusBadge = (status: string) => {
    const statusKeys: Record<string, string> = {
      paid: 'sales.paid', partial: 'sales.partial', pending: 'sales.pending',
      delivered: 'sales.delivered', in_transit: 'sales.inTransit', not_delivered: 'sales.notDelivered',
    };
    const colors: Record<string, string> = {
      paid: 'bg-green-100 text-green-800', delivered: 'bg-green-100 text-green-800',
      partial: 'bg-yellow-100 text-yellow-800', in_transit: 'bg-blue-100 text-blue-800',
      pending: 'bg-red-100 text-red-800', not_delivered: 'bg-gray-100 text-gray-800',
    };
    return (
      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${colors[status] || 'bg-gray-100 text-gray-800'}`}>
        {t(statusKeys[status || 'pending'] || 'sales.pending')}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {editingNotes && <NotesModal notes={editingNotes.notes} title={t('sales.editNotes')} onSave={handleUpdateNotes} onClose={() => setEditingNotes(null)} />}
      {voidingId && <VoidConfirmModal message={t('sales.voidConfirm')} reasonLabel={t('sales.voidReason')} onConfirm={handleVoid} onClose={() => setVoidingId(null)} />}
      {viewingSale && <SaleDetailModal sale={viewingSale} onClose={() => setViewingSale(null)} />}

      <div className="flex items-center gap-3">
        <p className="text-sm text-gray-500">{t('sales.totalSales', { count: total })}</p>
      </div>

      {showForm && (
        <SaleForm clients={clients} materials={materials} locations={locations} onSave={handleCreate} onCancel={() => setShowForm(false)} />
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('sales.loading')}</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 print:hidden">
            <h2 className="text-sm font-medium text-gray-700">{t('transactions.salesTab')}</h2>
            <button onClick={handlePrintTable} className="flex items-center gap-1 text-gray-600 hover:text-gray-800 p-1.5 hover:bg-gray-100 rounded" title="Print table">
              <Printer className="w-4 h-4" />
              <span className="text-xs">{t('common.print') || 'Print'}</span>
            </button>
          </div>
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
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase print:hidden">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {groupedSales.length === 0 ? (
                  <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-500">{t('sales.noResults')}</td></tr>
                ) : (
                  groupedSales.map((sale) => {
                    const isRev = sale.sale_number?.startsWith('REV-');
                    const saleHasReversal = !isRev && hasReversal(sale.sale_number);

                    // If this is a reversal row and the original is collapsed, hide it
                    if (isRev) {
                      const origNum = (sale.sale_number || '').replace('REV-', '');
                      if (!isExpanded(origNum)) {
                        return null;
                      }
                    }

                    return (
                      <tr key={sale.id}
                        className={`hover:bg-gray-50 cursor-pointer ${isRev ? 'bg-red-50' : saleHasReversal ? 'bg-orange-50' : ''}`}
                        onClick={() => setViewingSale(sale)}>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          <div className="flex items-center">
                            {saleHasReversal && (
                              <button
                                onClick={(e) => { e.stopPropagation(); toggleCollapse(sale.sale_number); }}
                                className="mr-1 p-0.5 hover:bg-gray-200 rounded"
                              >
                                {isExpanded(sale.sale_number) ? <ChevronDown className="w-4 h-4 text-gray-500" /> : <ChevronRight className="w-4 h-4 text-gray-500" />}
                              </button>
                            )}
                            {isRev && <span className="inline-block w-3 border-l-2 border-red-400 mr-1">&nbsp;</span>}
                            {!saleHasReversal && !isRev && <span className="inline-block w-5 mr-1" />}
                            {sale.sale_number}
                            {isRev && <span className="ml-2 inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded bg-red-100 text-red-700">{t('transactions.reversing')}</span>}
                            {saleHasReversal && <span className="ml-2 inline-flex px-1.5 py-0.5 text-[10px] font-semibold rounded bg-orange-100 text-orange-700">{t('transactions.reversed')}</span>}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900">{sale.sale_date ? new Date(sale.sale_date).toLocaleDateString() : '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{sale.client_name || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{sale.material_category || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 text-right">{Number(sale.weight_kg || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">${Number(sale.total_amount || 0).toFixed(2)}</td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(sale.payment_status)}</td>
                        <td className="px-4 py-3 text-center">{getStatusBadge(sale.delivery_status || 'not_delivered')}</td>
                        <td className="px-4 py-3 print:hidden" onClick={(e) => e.stopPropagation()}>
                          <div className="flex gap-1">
                            <button onClick={() => setViewingSale(sale)} className="text-gray-600 hover:text-gray-800 p-1" title={t('common.view')}>
                              <Eye className="w-4 h-4" />
                            </button>
                            {sale.payment_status !== 'paid' && !isRev && (
                              <button onClick={() => handleUpdatePayment(sale.id, 'paid')} className="text-green-600 hover:text-green-800 p-1" title={t('sales.markAsPaid')}>
                                <DollarSign className="w-4 h-4" />
                              </button>
                            )}
                            {sale.delivery_status !== 'delivered' && !isRev && (
                              <button onClick={() => handleUpdateDelivery(sale.id, 'delivered')} className="text-blue-600 hover:text-blue-800 p-1" title={t('sales.markAsDelivered')}>
                                <Truck className="w-4 h-4" />
                              </button>
                            )}
                            <button onClick={() => setEditingNotes({ id: sale.id, notes: sale.notes || '' })}
                              className="text-blue-600 hover:text-blue-800 p-1" title={t('sales.editNotes')}>
                              <FileText className="w-4 h-4" />
                            </button>
                            {!isRev && !saleHasReversal && (
                              <button onClick={() => setVoidingId(sale.id)} className="text-red-600 hover:text-red-800 p-1" title={t('sales.voidSale')}>
                                <RotateCcw className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
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
function SaleForm({ clients, materials, locations, onSave, onCancel }: {
  clients: any[]; materials: any[]; locations: any[]; onSave: (data: any) => void; onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    clientId: '', locationId: '', materialCategoryId: '', weightKg: '', unitPrice: '', paymentMethod: 'bank_transfer', notes: '',
  });
  const [stockWarning, setStockWarning] = useState<{ materialName: string; locationName: string; requested: number; available: number } | null>(null);
  const [pendingData, setPendingData] = useState<any>(null);
  const totalAmount = (parseFloat(formData.weightKg || '0') * parseFloat(formData.unitPrice || '0')).toFixed(2);

  const buildSaleData = () => ({
    clientId: formData.clientId, locationId: formData.locationId, materialCategoryId: formData.materialCategoryId,
    weightKg: parseFloat(formData.weightKg), unitPrice: parseFloat(formData.unitPrice) || undefined,
    paymentMethod: formData.paymentMethod, notes: formData.notes || undefined,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const data = buildSaleData();
    try {
      const res = await inventoryAPI.getAll({ locationId: formData.locationId });
      const items = res.data?.inventory || res.data || [];
      const match = items.find((item: any) => item.material_category_id === formData.materialCategoryId);
      const available = parseFloat(match?.quantity_kg || '0');
      const requested = parseFloat(formData.weightKg);
      if (requested > available) {
        const mat = materials.find(m => m.id === formData.materialCategoryId);
        const loc = locations.find(l => l.id === formData.locationId);
        setStockWarning({ materialName: mat?.name || '', locationName: loc?.name || '', requested, available });
        setPendingData(data);
        return;
      }
    } catch {
      // If inventory check fails, proceed without warning
    }
    onSave(data);
  };

  const handleConfirmOverstock = () => {
    if (pendingData) onSave(pendingData);
    setStockWarning(null);
    setPendingData(null);
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">{t('sales.create')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('sales.client')} *</label>
            <select value={formData.clientId} onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required>
              <option value="">{t('sales.selectClient')}</option>
              {clients.filter(c => c.is_active !== false).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('sales.location')} *</label>
            <select value={formData.locationId} onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required>
              <option value="">{t('sales.selectLocation')}</option>
              {locations.filter(l => l.is_active !== false).map((l) => <option key={l.id} value={l.id}>{l.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('sales.material')} *</label>
            <select value={formData.materialCategoryId} onChange={(e) => setFormData({ ...formData, materialCategoryId: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required>
              <option value="">{t('sales.selectMaterial')}</option>
              {materials.filter(m => m.is_active !== false).map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('sales.paymentMethod')}</label>
            <select value={formData.paymentMethod} onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
              <option value="cash">{t('sales.cash')}</option>
              <option value="bank_transfer">{t('sales.bankTransfer')}</option>
              <option value="mobile_money">{t('sales.mobileMoney')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('sales.weightKg')} *</label>
            <input type="number" step="0.01" value={formData.weightKg} onChange={(e) => setFormData({ ...formData, weightKg: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder="0.00" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('sales.unitPrice')}</label>
            <input type="number" step="0.01" value={formData.unitPrice} onChange={(e) => setFormData({ ...formData, unitPrice: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder={t('sales.autoFromDailyPrice')} />
          </div>
        </div>
        {formData.weightKg && formData.unitPrice && (
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-sm text-gray-600">{t('sales.totalAmount')}: <span className="font-semibold text-gray-900">${totalAmount}</span></p>
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sales.notes')}</label>
          <textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} rows={2}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder={t('sales.notesPlaceholder')} />
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

      {/* Stock warning confirmation modal */}
      {stockWarning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center gap-3 p-4 border-b border-gray-200">
              <div className="p-2 bg-amber-100 rounded-full">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{t('sales.stockWarningTitle')}</h3>
            </div>
            <div className="p-4">
              <p className="text-sm text-gray-700">
                {t('sales.stockWarningMessage', {
                  requested: stockWarning.requested.toFixed(2),
                  material: stockWarning.materialName,
                  available: stockWarning.available.toFixed(2),
                  location: stockWarning.locationName,
                })}
              </p>
              <p className="text-sm text-gray-500 mt-2">{t('sales.stockWarningContinue')}</p>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button onClick={() => { setStockWarning(null); setPendingData(null); }}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg">
                {t('common.no')}
              </button>
              <button onClick={handleConfirmOverstock}
                className="px-4 py-2 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded-lg">
                {t('common.yes')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
