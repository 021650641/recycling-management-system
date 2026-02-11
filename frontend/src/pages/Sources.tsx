import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { apartmentsAPI } from '@/lib/api';
import { Plus, Edit2, Trash2, Save, X, Search, Home, ChevronRight, ArrowLeft, Users, Weight } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApartmentComplex {
  id: string;
  name: string;
  address: string;
  total_units: number;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  is_active: boolean;
}

interface ApartmentUnit {
  id: string;
  apartment_complex_id: string;
  unit_number: string;
  resident_name: string;
  resident_phone: string;
  resident_email: string;
  floor: string;
  notes: string;
  is_active: boolean;
  transaction_count: number;
  total_weight_kg: number;
}

export default function Sources() {
  const { t } = useTranslation();
  const [apartments, setApartments] = useState<ApartmentComplex[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ApartmentComplex | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedComplex, setSelectedComplex] = useState<ApartmentComplex | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (search?: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) params.search = search;
      const response = await apartmentsAPI.getAll(params);
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.apartments || [];
      setApartments(data);
    } catch (error) {
      console.error('Failed to load sources:', error);
      toast.error(t('sources.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadData(searchQuery);
  };

  const handleSave = async (data: any) => {
    try {
      if (editingItem) {
        await apartmentsAPI.update(editingItem.id, data);
        toast.success(t('sources.updated'));
      } else {
        await apartmentsAPI.create(data);
        toast.success(t('sources.created'));
      }
      setShowForm(false);
      setEditingItem(null);
      loadData(searchQuery);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('sources.failedToSave'));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('sources.confirmDeactivate'))) return;
    try {
      await apartmentsAPI.delete(id);
      toast.success(t('sources.deactivated'));
      loadData(searchQuery);
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('sources.failedToDelete'));
    }
  };

  // If a complex is selected, show its units
  if (selectedComplex) {
    return (
      <UnitsList
        complex={selectedComplex}
        onBack={() => setSelectedComplex(null)}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Home className="w-7 h-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('sources.title')}</h1>
            <p className="text-sm text-gray-500">{t('sources.subtitle')}</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          {t('sources.add')}
        </button>
      </div>

      <form onSubmit={handleSearch} className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('sources.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <button type="submit" className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
            <Search className="w-4 h-4" />
            {t('common.search')}
          </button>
        </div>
      </form>

      {showForm && (
        <SourceForm
          item={editingItem}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingItem(null); }}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('sources.loading')}</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.name')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.address')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sources.units')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sources.contact')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.phone')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {apartments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">{t('sources.noResults')}</td>
                  </tr>
                ) : (
                  apartments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedComplex(apt)}
                          className="text-sm font-medium text-primary-600 hover:text-primary-800 flex items-center gap-1"
                        >
                          {apt.name}
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">{apt.address || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{apt.total_units || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{apt.contact_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{apt.contact_phone || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          apt.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {apt.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingItem(apt); setShowForm(true); }} className="text-blue-600 hover:text-blue-800" title={t('common.edit')}>
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(apt.id)} className="text-red-600 hover:text-red-800" title={t('common.delete')}>
                            <Trash2 className="w-4 h-4" />
                          </button>
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

// ─── Units List (drill-down view for a complex) ───

function UnitsList({ complex, onBack }: { complex: ApartmentComplex; onBack: () => void }) {
  const { t } = useTranslation();
  const [units, setUnits] = useState<ApartmentUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUnit, setEditingUnit] = useState<ApartmentUnit | null>(null);
  const [showBulkForm, setShowBulkForm] = useState(false);

  useEffect(() => {
    loadUnits();
  }, [complex.id]);

  const loadUnits = async () => {
    setLoading(true);
    try {
      const response = await apartmentsAPI.getUnits(complex.id);
      setUnits(response.data?.units || []);
    } catch (error) {
      console.error('Failed to load units:', error);
      toast.error(t('sources.failedToLoadUnits'));
    } finally {
      setLoading(false);
    }
  };

  const handleSaveUnit = async (data: any) => {
    try {
      if (editingUnit) {
        await apartmentsAPI.updateUnit(complex.id, editingUnit.id, data);
        toast.success(t('sources.unitUpdated'));
      } else {
        await apartmentsAPI.createUnit(complex.id, data);
        toast.success(t('sources.unitCreated'));
      }
      setShowForm(false);
      setEditingUnit(null);
      loadUnits();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('sources.failedToSaveUnit'));
    }
  };

  const handleDeleteUnit = async (unitId: string) => {
    if (!confirm(t('sources.confirmDeactivateUnit'))) return;
    try {
      await apartmentsAPI.deleteUnit(complex.id, unitId);
      toast.success(t('sources.unitDeactivated'));
      loadUnits();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('sources.failedToDeleteUnit'));
    }
  };

  const handleBulkCreate = async (startNum: number, endNum: number, prefix: string, floor: string) => {
    const unitsList = [];
    for (let i = startNum; i <= endNum; i++) {
      unitsList.push({
        unitNumber: prefix ? `${prefix}${i}` : String(i),
        floor: floor || undefined,
      });
    }
    try {
      const result = await apartmentsAPI.bulkCreateUnits(complex.id, unitsList);
      toast.success(t('sources.bulkCreated', { count: result.data?.created || 0 }));
      setShowBulkForm(false);
      loadUnits();
    } catch (error: any) {
      toast.error(error.response?.data?.error || t('sources.failedToCreateUnits'));
    }
  };

  const activeUnits = units.filter(u => u.is_active);
  const totalWeight = units.reduce((sum, u) => sum + Number(u.total_weight_kg || 0), 0);
  const totalTransactions = units.reduce((sum, u) => sum + Number(u.transaction_count || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <button onClick={onBack} className="flex items-center text-gray-600 hover:text-gray-900 mb-3">
          <ArrowLeft className="w-4 h-4 mr-2" />
          {t('sources.backToSources')}
        </button>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Home className="w-7 h-7 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{complex.name}</h1>
              <p className="text-sm text-gray-500">{complex.address || t('sources.noAddress')}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowBulkForm(true)}
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
            >
              <Users className="w-4 h-4" />
              {t('sources.bulkAdd')}
            </button>
            <button
              onClick={() => { setEditingUnit(null); setShowForm(true); }}
              className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
            >
              <Plus className="w-4 h-4" />
              {t('sources.addUnit')}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">{t('sources.activeUnits')}</p>
          <p className="text-2xl font-bold text-gray-900">{activeUnits.length}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">{t('sources.totalTransactions')}</p>
          <p className="text-2xl font-bold text-gray-900">{totalTransactions}</p>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <p className="text-sm text-gray-500">{t('sources.totalWeightCollected')}</p>
          <p className="text-2xl font-bold text-gray-900">{totalWeight.toFixed(2)} kg</p>
        </div>
      </div>

      {showBulkForm && (
        <BulkUnitForm
          onSave={handleBulkCreate}
          onCancel={() => setShowBulkForm(false)}
        />
      )}

      {showForm && (
        <UnitForm
          item={editingUnit}
          onSave={handleSaveUnit}
          onCancel={() => { setShowForm(false); setEditingUnit(null); }}
        />
      )}

      {/* Units Table */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('sources.loadingUnits')}</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sources.unitNumber')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sources.floor')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('sources.residentName')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.phone')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('sources.transactions')}</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('sources.totalWeight')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {units.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                      {t('sources.noUnits')}
                    </td>
                  </tr>
                ) : (
                  units.map((unit) => (
                    <tr key={unit.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{unit.unit_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{unit.floor || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{unit.resident_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{unit.resident_phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{unit.transaction_count || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">
                        <span className="flex items-center justify-end gap-1">
                          <Weight className="w-3 h-3 text-gray-400" />
                          {Number(unit.total_weight_kg || 0).toFixed(2)} kg
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          unit.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {unit.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingUnit(unit); setShowForm(true); }} className="text-blue-600 hover:text-blue-800" title={t('common.edit')}>
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteUnit(unit.id)} className="text-red-600 hover:text-red-800" title={t('common.deactivate')}>
                            <Trash2 className="w-4 h-4" />
                          </button>
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

// ─── Forms ───

function SourceForm({ item, onSave, onCancel }: { item: ApartmentComplex | null; onSave: (data: any) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: item?.name || '',
    address: item?.address || '',
    totalUnits: item?.total_units?.toString() || '',
    contactName: item?.contact_name || '',
    contactPhone: item?.contact_phone || '',
    contactEmail: item?.contact_email || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...formData,
      totalUnits: formData.totalUnits ? parseInt(formData.totalUnits) : undefined,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{item ? t('sources.editSource') : t('sources.add')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.name')} *</label>
          <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.address')}</label>
          <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sources.totalUnitsLabel')}</label>
          <input type="number" value={formData.totalUnits} onChange={(e) => setFormData({ ...formData, totalUnits: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sources.contactName')}</label>
          <input type="text" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sources.contactPhone')}</label>
          <input type="tel" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sources.contactEmail')}</label>
          <input type="email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
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

function UnitForm({ item, onSave, onCancel }: { item: ApartmentUnit | null; onSave: (data: any) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    unitNumber: item?.unit_number || '',
    residentName: item?.resident_name || '',
    residentPhone: item?.resident_phone || '',
    residentEmail: item?.resident_email || '',
    floor: item?.floor || '',
    notes: item?.notes || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{item ? t('sources.editUnit') : t('sources.addUnit')}</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sources.unitNumber')} *</label>
          <input type="text" value={formData.unitNumber} onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required placeholder={t('sources.unitNumberPlaceholder')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sources.floor')}</label>
          <input type="text" value={formData.floor} onChange={(e) => setFormData({ ...formData, floor: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder={t('sources.floorPlaceholder')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sources.residentName')}</label>
          <input type="text" value={formData.residentName} onChange={(e) => setFormData({ ...formData, residentName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sources.residentPhone')}</label>
          <input type="tel" value={formData.residentPhone} onChange={(e) => setFormData({ ...formData, residentPhone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.email')}</label>
          <input type="email" value={formData.residentEmail} onChange={(e) => setFormData({ ...formData, residentEmail: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.notes')}</label>
          <input type="text" value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
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

function BulkUnitForm({ onSave, onCancel }: { onSave: (startNum: number, endNum: number, prefix: string, floor: string) => void; onCancel: () => void }) {
  const { t } = useTranslation();
  const [startNum, setStartNum] = useState('1');
  const [endNum, setEndNum] = useState('');
  const [prefix, setPrefix] = useState('');
  const [floor, setFloor] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const start = parseInt(startNum);
    const end = parseInt(endNum);
    if (isNaN(start) || isNaN(end) || end < start) {
      toast.error(t('sources.invalidRange'));
      return;
    }
    if (end - start > 500) {
      toast.error(t('sources.maxUnits'));
      return;
    }
    onSave(start, end, prefix, floor);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{t('sources.bulkAddUnits')}</h2>
      <p className="text-sm text-gray-500">{t('sources.bulkAddDescription')}</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sources.startNumber')} *</label>
          <input type="number" value={startNum} onChange={(e) => setStartNum(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required min="1" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sources.endNumber')} *</label>
          <input type="number" value={endNum} onChange={(e) => setEndNum(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required min="1" placeholder={t('sources.endNumberPlaceholder')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sources.prefix')}</label>
          <input type="text" value={prefix} onChange={(e) => setPrefix(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder={t('sources.prefixPlaceholder')} />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('sources.floorOptional')}</label>
          <input type="text" value={floor} onChange={(e) => setFloor(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" placeholder={t('sources.floorPlaceholder')} />
        </div>
      </div>
      {startNum && endNum && (
        <p className="text-sm text-gray-600">
          {t('sources.willCreate', { count: Math.max(0, parseInt(endNum) - parseInt(startNum) + 1) })}:
          {' '}{prefix}{startNum}, {prefix}{parseInt(startNum) + 1}, ... {prefix}{endNum}
        </p>
      )}
      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
          <Plus className="w-4 h-4" /> {t('sources.createUnits')}
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg">
          <X className="w-4 h-4" /> {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
