import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { api, wastePickersAPI, apartmentsAPI, materialsAPI } from '@/lib/api';
import { Search, GitBranch, Filter } from 'lucide-react';
import toast from 'react-hot-toast';
import { useSettingsStore } from '@/store/settingsStore';
import { formatDate } from '@/lib/dateFormat';

interface TraceTransaction {
  transaction_id: string;
  transaction_number: string;
  transaction_date: string;
  source_type: string;
  source_name: string;
  apartment_id: string;
  apartment_name: string;
  apartment_unit_id: string;
  apartment_unit_number: string;
  apartment_resident_name: string;
  apartment_unit_legacy: string;
  waste_picker_id: string;
  waste_picker_name: string;
  location_id: number;
  location_name: string;
  material_id: number;
  material_category: string;
  weight_kg: number;
  quality_grade: string;
  unit_price: number;
  total_cost: number;
  payment_status: string;
}

interface TraceSummary {
  source_type: string;
  source_name: string;
  unit_number: string;
  resident_name: string;
  material_category: string;
  total_weight_kg: number;
  transaction_count: number;
  total_cost: number;
  first_transaction: string;
  last_transaction: string;
}

export default function Traceability() {
  const { t } = useTranslation();
  const { dateFormat: dfmt } = useSettingsStore();
  const [transactions, setTransactions] = useState<TraceTransaction[]>([]);
  const [summary, setSummary] = useState<TraceSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(true);

  const [wastePickers, setWastePickers] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [materials, setMaterials] = useState<any[]>([]);

  const [filters, setFilters] = useState({
    apartmentId: '',
    unitId: '',
    wastePickerId: '',
    materialId: '',
    startDate: '',
    endDate: '',
    days: '42',
  });

  useEffect(() => {
    loadFilterOptions();
    handleSearch();
  }, []);

  // Load units when apartment filter changes
  useEffect(() => {
    if (filters.apartmentId) {
      apartmentsAPI.getUnits(filters.apartmentId)
        .then(res => setUnits(res.data?.units || []))
        .catch(() => setUnits([]));
    } else {
      setUnits([]);
    }
  }, [filters.apartmentId]);

  const loadFilterOptions = async () => {
    try {
      const [wpRes, aptRes, matRes] = await Promise.all([
        wastePickersAPI.getAll(),
        apartmentsAPI.getAll(),
        materialsAPI.getAll(),
      ]);
      setWastePickers(Array.isArray(wpRes.data) ? wpRes.data : wpRes.data?.wastePickers || []);
      setApartments(Array.isArray(aptRes.data) ? aptRes.data : aptRes.data?.apartments || []);
      setMaterials(Array.isArray(matRes.data) ? matRes.data : matRes.data?.materials || []);
    } catch (error) {
      console.error('Failed to load filter options:', error);
    }
  };

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setLoading(true);
    try {
      const params: any = {};
      if (filters.apartmentId) params.apartmentId = filters.apartmentId;
      if (filters.unitId) params.unitId = filters.unitId;
      if (filters.wastePickerId) params.wastePickerId = filters.wastePickerId;
      if (filters.materialId) params.materialId = filters.materialId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (!filters.startDate && !filters.endDate && filters.days) params.days = filters.days;

      const response = await api.get('/reports/traceability', { params });
      setTransactions(response.data?.transactions || []);
      setSummary(response.data?.summary || []);
    } catch (error) {
      console.error('Failed to load traceability data:', error);
      toast.error('Failed to load traceability data');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setFilters({
      apartmentId: '',
      unitId: '',
      wastePickerId: '',
      materialId: '',
      startDate: '',
      endDate: '',
      days: '42',
    });
    setUnits([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="w-7 h-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('traceability.title')}</h1>
            <p className="text-sm text-gray-500">{t('traceability.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
        >
          <Filter className="w-4 h-4" />
          {showFilters ? t('traceability.hideFilters') : t('traceability.showFilters')}
        </button>
      </div>

      {showFilters && (
        <form onSubmit={handleSearch} className="bg-white p-6 rounded-lg shadow space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('traceability.sourceApartment')}</label>
              <select
                value={filters.apartmentId}
                onChange={(e) => setFilters({ ...filters, apartmentId: e.target.value, unitId: '' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">{t('traceability.allComplexes')}</option>
                {apartments.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('traceability.specificUnit')}</label>
              <select
                value={filters.unitId}
                onChange={(e) => setFilters({ ...filters, unitId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                disabled={!filters.apartmentId}
              >
                <option value="">{t('traceability.allUnits')}</option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {t('common.unit')} {u.unit_number}{u.resident_name ? ` - ${u.resident_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('traceability.wastePicker')}</label>
              <select
                value={filters.wastePickerId}
                onChange={(e) => setFilters({ ...filters, wastePickerId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">{t('traceability.allWastePickers')}</option>
                {wastePickers.map((wp) => (
                  <option key={wp.id} value={wp.id}>{wp.first_name} {wp.last_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('traceability.material')}</label>
              <select
                value={filters.materialId}
                onChange={(e) => setFilters({ ...filters, materialId: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              >
                <option value="">{t('traceability.allMaterials')}</option>
                {materials.map((m) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('reports.startDate')}</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => setFilters({ ...filters, startDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('reports.endDate')}</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => setFilters({ ...filters, endDate: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              <button type="submit" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
                <Search className="w-4 h-4" /> {t('common.search')}
              </button>
              <button type="button" onClick={clearFilters} className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
                {t('common.clear')}
              </button>
            </div>
            {!filters.startDate && !filters.endDate && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <span>{t('common.last')}</span>
                <input
                  type="number"
                  value={filters.days}
                  onChange={(e) => setFilters({ ...filters, days: e.target.value })}
                  className="w-16 px-2 py-1 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-center"
                />
                <span>{t('common.days')}</span>
              </div>
            )}
          </div>
        </form>
      )}

      {/* Summary Cards */}
      {summary.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">{t('traceability.summaryTitle')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {summary.map((s, i) => (
              <div key={i} className="bg-white rounded-lg shadow p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500">
                      {s.source_type === 'apartment' ? t('traceability.apartment') : t('transactions.wastePicker')}
                    </p>
                    <p className="text-base font-semibold text-gray-900">{s.source_name || 'Unknown'}</p>
                    {s.resident_name && (
                      <p className="text-xs text-gray-500">{t('reports.resident')}: {s.resident_name}</p>
                    )}
                  </div>
                  <span className="px-2 py-1 text-xs font-semibold rounded-full bg-primary-100 text-primary-800">
                    {s.material_category}
                  </span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-gray-500">{t('traceability.totalWeight')}</p>
                    <p className="font-medium">{Number(s.total_weight_kg).toFixed(2)} kg</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('traceability.transactionCount')}</p>
                    <p className="font-medium">{s.transaction_count}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('traceability.totalCost')}</p>
                    <p className="font-medium">${Number(s.total_cost || 0).toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">{t('traceability.period')}</p>
                    <p className="font-medium text-xs">
                      {formatDate(s.first_transaction, dfmt)}
                      {' - '}
                      {formatDate(s.last_transaction, dfmt)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Transactions Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('traceability.loading')}</div>
      ) : transactions.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-3">
            {t('traceability.transactionsCount', { count: transactions.length })}
          </h2>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('traceability.transactionNumber')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('reports.source')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('traceability.unitResident')}</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.material')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('reports.weightKg')}</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('reports.cost')}</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">{t('sales.payment')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {transactions.map((tx) => (
                    <tr key={tx.transaction_id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {formatDate(tx.transaction_date, dfmt)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-900">{tx.transaction_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>
                          <p>{tx.source_type === 'apartment' ? tx.apartment_name : tx.waste_picker_name || '-'}</p>
                          <p className="text-xs text-gray-500">
                            {tx.source_type === 'apartment' ? t('traceability.apartment') : t('transactions.wastePicker')}
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {tx.source_type === 'apartment' ? (
                          <div>
                            <p>{tx.apartment_unit_number ? `${t('common.unit')} ${tx.apartment_unit_number}` : tx.apartment_unit_legacy || '-'}</p>
                            {tx.apartment_resident_name && (
                              <p className="text-xs text-gray-500">{tx.apartment_resident_name}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div>
                          <p>{tx.material_category}</p>
                          {tx.quality_grade && tx.quality_grade !== 'standard' && (
                            <p className="text-xs text-gray-500">{t('traceability.grade')}: {tx.quality_grade}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        {Number(tx.weight_kg).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        ${Number(tx.total_cost || 0).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          tx.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                          tx.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {tx.payment_status || 'pending'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : !loading && (
        <div className="bg-white rounded-lg shadow p-12 text-center text-gray-500">
          <GitBranch className="w-12 h-12 mx-auto mb-4 text-gray-300" />
          <p className="text-lg font-medium">{t('traceability.noData')}</p>
          <p className="text-sm mt-1">{t('traceability.useFilters')}</p>
        </div>
      )}
    </div>
  );
}
