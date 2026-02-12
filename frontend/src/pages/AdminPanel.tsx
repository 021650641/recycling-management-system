import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { materialsAPI, locationsAPI, settingsAPI, pricesAPI, usersAPI, logsAPI, schedulesAPI } from '@/lib/api';
import { api } from '@/lib/api';
import { Plus, Edit2, Trash2, Save, X, Mail, Settings, Clock, Calendar, Users, FileText, CalendarClock, Bell, Download, Pause, Play, RefreshCw } from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { useSettingsStore, type DateFormat, type TimeFormat } from '@/store/settingsStore';
import { formatDate } from '@/lib/dateFormat';

type TabType = 'materials' | 'locations' | 'pricing' | 'users' | 'email' | 'display' | 'logs' | 'scheduling' | 'confirmations';

export default function AdminPanel() {
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('materials');
  const [materials, setMaterials] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [prices, setPrices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'materials') {
        const response = await materialsAPI.getAll();
        const data = Array.isArray(response.data) ? response.data : response.data?.materials || [];
        setMaterials(data);
      } else if (activeTab === 'locations') {
        const response = await locationsAPI.getAll();
        const data = Array.isArray(response.data) ? response.data : response.data?.locations || [];
        setLocations(data);
      } else if (activeTab === 'pricing') {
        const matResponse = await materialsAPI.getAll();
        const matData = Array.isArray(matResponse.data) ? matResponse.data : matResponse.data?.materials || [];
        setMaterials(matData);

        const locResponse = await locationsAPI.getAll();
        const locData = Array.isArray(locResponse.data) ? locResponse.data : locResponse.data?.locations || [];
        setLocations(locData);

        const priceResponse = await pricesAPI.getLatest();
        const priceData = Array.isArray(priceResponse.data) ? priceResponse.data : priceResponse.data?.prices || [];
        setPrices(priceData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error(t('common.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (activeTab === 'materials') {
        if (editingItem) {
          await materialsAPI.update(editingItem.id, data);
          toast.success(t('admin.materialUpdated'));
        } else {
          await materialsAPI.create(data);
          toast.success(t('admin.materialCreated'));
        }
      } else if (activeTab === 'locations') {
        if (editingItem) {
          await locationsAPI.update(editingItem.id, data);
          toast.success(t('admin.locationUpdated'));
        } else {
          await locationsAPI.create(data);
          toast.success(t('admin.locationCreated'));
        }
      } else if (activeTab === 'pricing') {
        await api.post('/materials/prices', data);
        toast.success(editingItem ? t('admin.priceUpdated') : t('admin.priceCreated'));
      }
      setShowForm(false);
      setEditingItem(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('common.failedToSave'));
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm(t('common.confirmDelete'))) return;

    try {
      if (activeTab === 'materials') {
        await materialsAPI.delete(id as number);
        toast.success(t('admin.materialDeleted'));
      } else if (activeTab === 'locations') {
        await locationsAPI.delete(id as number);
        toast.success(t('admin.locationDeleted'));
      }
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('common.failedToDelete'));
    }
  };

  const renderMaterialsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">{t('admin.materialsManagement')}</h2>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          {t('admin.addMaterial')}
        </button>
      </div>

      {showForm && <MaterialForm item={editingItem} onSave={handleSave} onCancel={() => setShowForm(false)} />}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.name')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.description')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.unit')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {materials.map((material) => (
              <tr key={material.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{material.name}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{material.description || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{material.unit}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${material.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {material.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingItem(material); setShowForm(true); }} className="text-blue-600 hover:text-blue-800">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(material.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderLocationsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">{t('admin.locationsManagement')}</h2>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          {t('admin.addLocation')}
        </button>
      </div>

      {showForm && <LocationForm item={editingItem} onSave={handleSave} onCancel={() => setShowForm(false)} />}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.name')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.address')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('admin.managerName')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {locations.map((location) => (
              <tr key={location.id}>
                <td className="px-4 py-3 text-sm text-gray-900">{location.name}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{location.address || '-'}</td>
                <td className="px-4 py-3 text-sm text-gray-900">{location.manager_name || '-'}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 text-xs rounded-full ${location.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {location.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => { setEditingItem(location); setShowForm(true); }} className="text-blue-600 hover:text-blue-800">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(location.id)} className="text-red-600 hover:text-red-800">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">{t('admin.title')}</h1>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('materials')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'materials'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('admin.materials')}
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'locations'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('admin.locations')}
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'pricing'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t('admin.pricing')}
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${
                activeTab === 'users'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Users className="w-4 h-4" />
              {t('nav.users')}
            </button>
          )}
          <button
            onClick={() => setActiveTab('email')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${
              activeTab === 'email'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Mail className="w-4 h-4" />
            {t('admin.emailSettings')}
          </button>
          <button
            onClick={() => setActiveTab('display')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${
              activeTab === 'display'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Settings className="w-4 h-4" />
            {t('admin.displaySettings')}
          </button>
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('logs')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${
                activeTab === 'logs'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <FileText className="w-4 h-4" />
              {t('admin.logs')}
            </button>
          )}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('scheduling')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${
                activeTab === 'scheduling'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <CalendarClock className="w-4 h-4" />
              {t('admin.scheduling')}
            </button>
          )}
          {currentUser?.role === 'admin' && (
            <button
              onClick={() => setActiveTab('confirmations')}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${
                activeTab === 'confirmations'
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Bell className="w-4 h-4" />
              {t('admin.confirmations')}
            </button>
          )}
        </nav>
      </div>

      {/* Content */}
      {loading && activeTab !== 'pricing' ? (
        <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
      ) : (
        <>
          {activeTab === 'materials' && renderMaterialsTab()}
          {activeTab === 'locations' && renderLocationsTab()}
          {activeTab === 'pricing' && <PricingTab materials={materials} locations={locations} initialPrices={prices} onReload={loadData} loading={loading} />}
          {activeTab === 'users' && <UsersTab />}
          {activeTab === 'email' && <EmailSettingsTab />}
          {activeTab === 'display' && <DisplaySettingsTab />}
          {activeTab === 'logs' && <LogsTab />}
          {activeTab === 'scheduling' && <SchedulingTab />}
          {activeTab === 'confirmations' && <ConfirmationsTab />}
        </>
      )}
    </div>
  );
}

// ===== Pricing Tab (revamped) =====
function PricingTab({ materials, locations, initialPrices, onReload, loading: parentLoading }: {
  materials: any[];
  locations: any[];
  initialPrices: any[];
  onReload: () => void;
  loading: boolean;
}) {
  const { t } = useTranslation();
  const { dateFormat } = useSettingsStore();
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showExpired, setShowExpired] = useState(false);
  const [filterDate, setFilterDate] = useState('');
  const [allPrices, setAllPrices] = useState<any[]>([]);
  const [loadingAll, setLoadingAll] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);

  // Load all prices when filters change
  useEffect(() => {
    loadAllPrices();
  }, [showExpired, filterDate]);

  const loadAllPrices = async () => {
    setLoadingAll(true);
    try {
      const params: any = {};
      if (showExpired) params.showExpired = 'true';
      if (filterDate) params.filterDate = filterDate;
      const response = await pricesAPI.getAll(params);
      const data = Array.isArray(response.data) ? response.data : response.data?.prices || [];
      setAllPrices(data);
    } catch (error: any) {
      console.error('Failed to load prices:', error);
      toast.error(t('admin.failedLoadPrices'));
    } finally {
      setLoadingAll(false);
    }
  };

  const handleSingleSave = async (data: any) => {
    try {
      await pricesAPI.create(data);
      toast.success(t('admin.priceSaved'));
      setShowAddForm(false);
      loadAllPrices();
      onReload();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('common.failedToSave'));
    }
  };

  const handleBulkSaved = () => {
    setShowBulkModal(false);
    loadAllPrices();
    onReload();
  };

  const isAllDay = (from: string, to: string) => {
    return (!from || from === '00:00:00') && (!to || to === '23:59:59');
  };

  const formatTime12 = (time: string) => {
    if (!time) return '';
    const [h, m] = time.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${h12}:${m} ${ampm}`;
  };

  const formatTimeDisplay = (time: string) => {
    const { timeFormat } = useSettingsStore.getState();
    if (!time) return '';
    if (timeFormat === '12h') return formatTime12(time);
    return time.substring(0, 5); // HH:mm
  };

  if (parentLoading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;

  return (
    <div className="space-y-4">
      {/* Header with actions */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-xl font-semibold text-gray-900">{t('admin.pricingManagement')}</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm"
          >
            <Plus className="w-4 h-4" />
            {t('admin.addSinglePrice')}
          </button>
          <button
            onClick={() => setShowBulkModal(true)}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg text-sm"
          >
            <Calendar className="w-4 h-4" />
            {t('admin.setDailyPrices')}
          </button>
        </div>
      </div>

      {/* Single price form */}
      {showAddForm && (
        <PriceForm
          materials={materials}
          locations={locations}
          onSave={handleSingleSave}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {/* Bulk price modal */}
      {showBulkModal && (
        <BulkPriceModal
          materials={materials}
          latestPrices={initialPrices}
          onClose={() => setShowBulkModal(false)}
          onSaved={handleBulkSaved}
        />
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showExpired}
            onChange={(e) => setShowExpired(e.target.checked)}
            className="rounded text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">{t('common.showExpired')}</span>
        </label>

        {showExpired && (
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-700">{t('common.filterByDate')}</label>
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
            {filterDate && (
              <button
                onClick={() => setFilterDate('')}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                {t('common.clear')}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Price list */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.material')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.location')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.purchasePerKg')}</th>
              <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">{t('common.salePerKg')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.date')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.validity')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loadingAll ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t('common.loading')}</td></tr>
            ) : allPrices.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-500">{t('common.noResults')}</td></tr>
            ) : (
              allPrices.map((price, index) => {
                const today = new Date().toISOString().split('T')[0];
                const priceDate = price.date ? price.date.split('T')[0] : '';
                const isExpired = priceDate < today;

                return (
                  <tr key={price.id || index} className={isExpired ? 'bg-gray-50 text-gray-400' : ''}>
                    <td className="px-4 py-3 text-sm">
                      {price.material_name || 'Unknown'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {price.location_id ? locations.find(l => l.id === price.location_id)?.name || '-' : t('common.all')}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      ${parseFloat(price.purchase_price_per_kg || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-mono">
                      ${parseFloat(price.sale_price_per_kg || 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {formatDate(priceDate, dateFormat)}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {isAllDay(price.valid_from_time, price.valid_to_time) ? (
                        <span className="text-gray-500">{t('common.allDay')}</span>
                      ) : (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-gray-400" />
                          {formatTimeDisplay(price.valid_from_time)} - {formatTimeDisplay(price.valid_to_time)}
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ===== Bulk Price Modal =====
function BulkPriceModal({ materials, latestPrices, onClose, onSaved }: {
  materials: any[];
  latestPrices: any[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const { t } = useTranslation();
  const { dateFormat } = useSettingsStore();
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(today);
  const [saving, setSaving] = useState(false);

  // Build editable rows: one per active material, pre-populated with latest prices
  const [rows, setRows] = useState<Array<{
    materialCategoryId: string;
    materialName: string;
    purchasePricePerKg: string;
    salePricePerKg: string;
    allDay: boolean;
    validFromTime: string;
    validToTime: string;
  }>>([]);

  useEffect(() => {
    const editableRows = materials
      .filter(m => m.is_active !== false)
      .map(m => {
        const existing = latestPrices.find(p => p.material_category_id === m.id);
        return {
          materialCategoryId: m.id,
          materialName: m.name,
          purchasePricePerKg: existing ? String(existing.purchase_price_per_kg) : '',
          salePricePerKg: existing ? String(existing.sale_price_per_kg) : '',
          allDay: true,
          validFromTime: '00:00',
          validToTime: '23:59',
        };
      });
    setRows(editableRows);
  }, [materials, latestPrices]);

  const updateRow = (index: number, field: string, value: any) => {
    setRows(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveAll = async () => {
    // Filter out rows with no prices set
    const validRows = rows.filter(r => r.purchasePricePerKg && r.salePricePerKg);
    if (validRows.length === 0) {
      toast.error(t('common.noResults'));
      return;
    }

    setSaving(true);
    try {
      const pricesToSave = validRows.map(r => ({
        materialCategoryId: r.materialCategoryId,
        locationId: null,
        date: selectedDate,
        purchasePricePerKg: parseFloat(r.purchasePricePerKg),
        salePricePerKg: parseFloat(r.salePricePerKg),
        validFromTime: r.allDay ? '00:00:00' : `${r.validFromTime}:00`,
        validToTime: r.allDay ? '23:59:59' : `${r.validToTime}:59`,
      }));

      await pricesAPI.bulkSave(pricesToSave);
      toast.success(t('admin.pricesSaved', { count: pricesToSave.length, date: formatDate(selectedDate, dateFormat) }));
      onSaved();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('common.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const setAllToAllDay = (allDay: boolean) => {
    setRows(prev => prev.map(r => ({
      ...r,
      allDay,
      validFromTime: allDay ? '00:00' : r.validFromTime,
      validToTime: allDay ? '23:59' : r.validToTime,
    })));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal header */}
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{t('admin.setDailyPrices')}</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {t('admin.setDailyPricesDesc')}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Date selector and time toggle */}
        <div className="px-6 py-3 border-b border-gray-100 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <label className="text-sm font-medium text-gray-700">{t('common.date')}:</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              onClick={() => setAllToAllDay(true)}
              className="text-xs px-3 py-1 rounded border border-gray-300 text-gray-600 hover:bg-gray-50"
            >
              {t('admin.setAllToAllDay')}
            </button>
          </div>
        </div>

        {/* Price table */}
        <div className="flex-1 overflow-auto px-6 py-3">
          <table className="w-full table-fixed">
            <colgroup>
              <col className="w-[35%]" />
              <col className="w-[20%]" />
              <col className="w-[20%]" />
              <col className="w-[25%]" />
            </colgroup>
            <thead className="bg-gray-50 sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">{t('common.material')}</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('common.purchasePerKg')}</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('common.salePerKg')}</th>
                <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">{t('common.validity')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, index) => (
                <tr key={row.materialCategoryId} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm font-medium text-gray-900">
                    {row.materialName}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.purchasePricePerKg}
                      onChange={(e) => updateRow(index, 'purchasePricePerKg', e.target.value)}
                      className="w-28 px-2 py-1 text-right text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={row.salePricePerKg}
                      onChange={(e) => updateRow(index, 'salePricePerKg', e.target.value)}
                      className="w-28 px-2 py-1 text-right text-sm border border-gray-300 rounded focus:ring-2 focus:ring-primary-500 outline-none font-mono"
                      placeholder="0.00"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-2">
                      <label className="flex items-center gap-1 cursor-pointer text-xs">
                        <input
                          type="checkbox"
                          checked={row.allDay}
                          onChange={(e) => updateRow(index, 'allDay', e.target.checked)}
                          className="rounded text-primary-600 focus:ring-primary-500"
                        />
                        {t('common.allDay')}
                      </label>
                      {!row.allDay && (
                        <div className="flex items-center gap-1 text-xs">
                          <input
                            type="time"
                            value={row.validFromTime}
                            onChange={(e) => updateRow(index, 'validFromTime', e.target.value)}
                            className="px-1 py-0.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 outline-none"
                          />
                          <span className="text-gray-400">-</span>
                          <input
                            type="time"
                            value={row.validToTime}
                            onChange={(e) => updateRow(index, 'validToTime', e.target.value)}
                            className="px-1 py-0.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-primary-500 outline-none"
                          />
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Modal footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            {t('admin.materialsWithPrices', { count: rows.filter(r => r.purchasePricePerKg && r.salePricePerKg).length, total: rows.length })}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg"
            >
              {t('common.cancel')}
            </button>
            <button
              onClick={handleSaveAll}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 text-sm text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {saving ? t('common.loading') : t('admin.saveAllPrices')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===== Single Price Form =====
function PriceForm({ item, materials, locations, onSave, onCancel }: any) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    materialCategoryId: item?.material_category_id || '',
    locationId: item?.location_id || '',
    purchasePricePerKg: item?.purchase_price_per_kg || '',
    salePricePerKg: item?.sale_price_per_kg || '',
    date: item?.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    allDay: true,
    validFromTime: '00:00',
    validToTime: '23:59',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      materialCategoryId: formData.materialCategoryId,
      locationId: formData.locationId || null,
      purchasePricePerKg: parseFloat(formData.purchasePricePerKg),
      salePricePerKg: parseFloat(formData.salePricePerKg),
      date: formData.date,
      validFromTime: formData.allDay ? '00:00:00' : `${formData.validFromTime}:00`,
      validToTime: formData.allDay ? '23:59:59' : `${formData.validToTime}:59`,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.material')} *</label>
          <select
            value={formData.materialCategoryId}
            onChange={(e) => setFormData({ ...formData, materialCategoryId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          >
            <option value="">{t('transactions.selectMaterial')}</option>
            {materials.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.location')} ({t('common.optional')})</label>
          <select
            value={formData.locationId}
            onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">{t('common.allLocations')}</option>
            {locations.map((l: any) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.purchasePrice')} *</label>
          <input
            type="number"
            step="0.01"
            value={formData.purchasePricePerKg}
            onChange={(e) => setFormData({ ...formData, purchasePricePerKg: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.salePrice')} *</label>
          <input
            type="number"
            step="0.01"
            value={formData.salePricePerKg}
            onChange={(e) => setFormData({ ...formData, salePricePerKg: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.date')} *</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.timeValidity')}</label>
          <div className="space-y-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.allDay}
                onChange={(e) => setFormData({ ...formData, allDay: e.target.checked })}
                className="rounded text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">{t('common.allDay')}</span>
            </label>
            {!formData.allDay && (
              <div className="flex items-center gap-2">
                <input
                  type="time"
                  value={formData.validFromTime}
                  onChange={(e) => setFormData({ ...formData, validFromTime: e.target.value })}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
                <span className="text-gray-400">to</span>
                <input
                  type="time"
                  value={formData.validToTime}
                  onChange={(e) => setFormData({ ...formData, validToTime: e.target.value })}
                  className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
                />
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
          <Save className="w-4 h-4" />
          {t('common.save')}
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg">
          <X className="w-4 h-4" />
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

// ===== Form Components =====
function MaterialForm({ item, onSave, onCancel }: any) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    unit: item?.unit || 'kg',
    isActive: item?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.name')} *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.description')}</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.unit')} *</label>
          <select
            value={formData.unit}
            onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="kg">kg</option>
            <option value="ton">ton</option>
            <option value="unit">unit</option>
          </select>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="rounded"
        />
        <label className="text-sm text-gray-700">{t('common.active')}</label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
          <Save className="w-4 h-4" />
          {t('common.save')}
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg">
          <X className="w-4 h-4" />
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

function LocationForm({ item, onSave, onCancel }: any) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    name: item?.name || '',
    address: item?.address || '',
    managerName: item?.manager_name || '',
    phone: item?.phone || '',
    isActive: item?.is_active ?? true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.name')} *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.managerName')}</label>
          <input
            type="text"
            value={formData.managerName}
            onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.address')} *</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.phone')}</label>
        <input
          type="text"
          value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
        />
      </div>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={formData.isActive}
          onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
          className="rounded"
        />
        <label className="text-sm text-gray-700">{t('common.active')}</label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
          <Save className="w-4 h-4" />
          {t('common.save')}
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg">
          <X className="w-4 h-4" />
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

// ===== Users Tab =====
function UsersTab() {
  const { t } = useTranslation();
  const [users, setUsers] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const [usersRes, locsRes] = await Promise.all([
        usersAPI.getAll(),
        locationsAPI.getAll(),
      ]);
      const userData = Array.isArray(usersRes.data) ? usersRes.data : usersRes.data?.users || [];
      setUsers(userData);
      const locData = Array.isArray(locsRes.data) ? locsRes.data : locsRes.data?.locations || [];
      setLocations(locData);
    } catch (error) {
      console.error('Failed to load users:', error);
      toast.error(t('common.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (editingUser) {
        await usersAPI.update(editingUser.id, data);
        toast.success(t('users.updated'));
      } else {
        await usersAPI.create(data);
        toast.success(t('users.created'));
      }
      setShowForm(false);
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('common.failedToSave'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm(t('users.confirmDelete'))) return;
    try {
      await usersAPI.delete(id);
      toast.success(t('users.deleted'));
      loadUsers();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('common.failedToDelete'));
    }
  };

  const getLocationName = (locationId: string) => {
    const loc = locations.find(l => l.id === locationId);
    return loc?.name || '-';
  };

  const getRoleBadgeClass = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'manager': return 'bg-blue-100 text-blue-800';
      case 'operator': return 'bg-green-100 text-green-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">{t('users.title')}</h2>
        <button
          onClick={() => { setEditingUser(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          {t('users.add')}
        </button>
      </div>

      {showForm && (
        <UserForm
          item={editingUser}
          locations={locations}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingUser(null); }}
        />
      )}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.name')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.email')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('users.role')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.location')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {users.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                  {t('users.noResults')}
                </td>
              </tr>
            ) : (
              users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">
                    {user.first_name} {user.last_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${getRoleBadgeClass(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {getLocationName(user.location_id)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {user.is_active ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button onClick={() => { setEditingUser(user); setShowForm(true); }} className="text-blue-600 hover:text-blue-800">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(user.id)} className="text-red-600 hover:text-red-800">
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
  );
}

function UserForm({ item, locations, onSave, onCancel }: any) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    email: item?.email || '',
    password: '',
    firstName: item?.first_name || '',
    lastName: item?.last_name || '',
    role: item?.role || 'operator',
    locationId: item?.location_id || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = {
      email: formData.email,
      firstName: formData.firstName,
      lastName: formData.lastName,
      role: formData.role,
      locationId: formData.locationId || null,
    };
    if (formData.password) {
      data.password = formData.password;
    }
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('users.firstName')} *</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('users.lastName')} *</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.email')} *</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('users.password')} {item ? t('users.passwordHint') : '*'}
          </label>
          <input
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required={!item}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('users.role')} *</label>
          <select
            value={formData.role}
            onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="admin">{t('users.roleAdmin')}</option>
            <option value="manager">{t('users.roleManager')}</option>
            <option value="operator">{t('users.roleOperator')}</option>
            <option value="viewer">{t('users.roleViewer')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.location')}</label>
          <select
            value={formData.locationId}
            onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">-</option>
            {locations.map((l: any) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
          <Save className="w-4 h-4" />
          {t('common.save')}
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg">
          <X className="w-4 h-4" />
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}

function EmailSettingsTab() {
  const { t } = useTranslation();
  const [smtpSettings, setSmtpSettings] = useState({
    host: '',
    port: '587',
    user: '',
    password: '',
    from: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testEmail, setTestEmail] = useState('');
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    settingsAPI.get('smtp')
      .then(res => {
        const data = res.data;
        if (data && Object.keys(data).length > 0) {
          setSmtpSettings({
            host: data.host || '',
            port: data.port || '587',
            user: data.user || '',
            password: data.password || '',
            from: data.from || '',
          });
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await settingsAPI.save('smtp', smtpSettings);
      toast.success(t('admin.emailSaved'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('common.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error(t('common.required'));
      return;
    }
    setTesting(true);
    try {
      await api.post('/reports/email', {
        to: testEmail,
        subject: 'CIVICycle Test Email',
        message: 'This is a test email from CIVICycle to verify your SMTP configuration is working.',
        reportType: 'purchases',
        format: 'csv',
      });
      toast.success(t('admin.testEmailSent'));
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('common.failedToSave'));
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{t('admin.smtpSettings')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('admin.smtpSettingsDesc')}</p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.smtpHost')} *</label>
            <input
              type="text"
              value={smtpSettings.host}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, host: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="smtp.gmail.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.smtpPort')} *</label>
            <input
              type="number"
              value={smtpSettings.port}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="587"
              required
            />
            <p className="text-xs text-gray-500 mt-1">{t('admin.smtpPortHint')}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.smtpUser')} *</label>
            <input
              type="text"
              value={smtpSettings.user}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, user: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="your-email@gmail.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.smtpPassword')} *</label>
            <input
              type="password"
              value={smtpSettings.password}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, password: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="App password or SMTP password"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-2">{t('admin.fromAddress')}</label>
            <input
              type="text"
              value={smtpSettings.from}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, from: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder={t('admin.fromAddressHint')}
            />
          </div>
        </div>
        <div className="flex gap-2">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? t('common.loading') : t('admin.saveSettings')}
          </button>
        </div>
      </form>

      {/* Test Email */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">{t('admin.testEmail')}</h3>
        <p className="text-sm text-gray-500">{t('admin.testEmailDesc')}</p>
        <div className="flex gap-2">
          <input
            type="email"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            placeholder="test@example.com"
          />
          <button
            onClick={handleTestEmail}
            disabled={testing || !smtpSettings.host}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            <Mail className="w-4 h-4" />
            {testing ? t('common.loading') : t('admin.sendTest')}
          </button>
        </div>
      </div>
    </div>
  );
}

function DisplaySettingsTab() {
  const { t } = useTranslation();
  const { dateFormat, timeFormat, setDateFormat, setTimeFormat } = useSettingsStore();

  const dateFormats: { value: DateFormat; label: string; example: string }[] = [
    { value: 'DD/MM/YYYY', label: 'DD/MM/YYYY', example: '11/02/2026' },
    { value: 'MM/DD/YYYY', label: 'MM/DD/YYYY', example: '02/11/2026' },
    { value: 'YYYY-MM-DD', label: 'YYYY-MM-DD', example: '2026-02-11' },
  ];

  const timeFormats: { value: TimeFormat; label: string; example: string }[] = [
    { value: '24h', label: '24-hour', example: '16:30' },
    { value: '12h', label: '12-hour', example: '4:30 PM' },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{t('admin.displaySettings')}</h2>
        <p className="text-sm text-gray-500 mt-1">{t('admin.displaySettingsDesc')}</p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">{t('admin.dateFormat')}</label>
          <div className="space-y-2">
            {dateFormats.map((fmt) => (
              <label key={fmt.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                dateFormat === fmt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="dateFormat"
                  checked={dateFormat === fmt.value}
                  onChange={() => setDateFormat(fmt.value)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="font-medium text-gray-900">{fmt.label}</span>
                <span className="text-sm text-gray-500 ml-auto">{fmt.example}</span>
              </label>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">{t('admin.timeFormat')}</label>
          <div className="space-y-2">
            {timeFormats.map((fmt) => (
              <label key={fmt.value} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                timeFormat === fmt.value ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:bg-gray-50'
              }`}>
                <input
                  type="radio"
                  name="timeFormat"
                  checked={timeFormat === fmt.value}
                  onChange={() => setTimeFormat(fmt.value)}
                  className="text-primary-600 focus:ring-primary-500"
                />
                <span className="font-medium text-gray-900">{fmt.label}</span>
                <span className="text-sm text-gray-500 ml-auto">{fmt.example}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500">{t('admin.settingsAutoSave')}</p>
        </div>
      </div>
    </div>
  );
}

// ===== Logs Tab =====
function LogsTab() {
  const { t } = useTranslation();
  const [level, setLevel] = useState<'info' | 'error' | 'debug'>('info');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [search, setSearch] = useState('');
  const [entries, setEntries] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<string[]>([]);

  useEffect(() => {
    loadFiles();
  }, []);

  useEffect(() => {
    loadEntries();
  }, [level, date]);

  const loadFiles = async () => {
    try {
      const res = await logsAPI.getFiles();
      const data = Array.isArray(res.data) ? res.data : res.data?.files || [];
      setFiles(data);
    } catch {
      // ignore
    }
  };

  const loadEntries = async () => {
    setLoading(true);
    try {
      const res = await logsAPI.getEntries({ level, date, search: search || undefined, limit: 200 });
      const data = res.data;
      const entryList = Array.isArray(data) ? data : data?.entries || [];
      setEntries(entryList);
      setTotal(data?.total ?? entryList.length);
    } catch (error) {
      console.error('Failed to load log entries:', error);
      toast.error(t('common.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    loadEntries();
  };

  const handleDownload = async (filename: string) => {
    try {
      const res = await logsAPI.download(filename);
      const blob = new Blob([res.data], { type: 'application/octet-stream' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download log file:', error);
      toast.error('Failed to download log file');
    }
  };

  const formatEntry = (entry: any): string => {
    if (typeof entry === 'string') return entry;
    const ts = entry.timestamp || entry.date || '';
    const lvl = (entry.level || '').toUpperCase();
    const msg = entry.message || JSON.stringify(entry);
    return `[${ts}] ${lvl}: ${msg}`;
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">{t('admin.logs')}</h2>
        <button
          onClick={loadEntries}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-800 px-3 py-2 rounded-lg border border-gray-300 hover:bg-gray-50 text-sm"
        >
          <RefreshCw className="w-4 h-4" />
          {t('common.refresh') || 'Refresh'}
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Level</label>
          <select
            value={level}
            onChange={(e) => setLevel(e.target.value as 'info' | 'error' | 'debug')}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="info">Info</option>
            <option value="error">Error</option>
            <option value="debug">Debug</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.date')}</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.search') || 'Search'}</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Filter log entries..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 outline-none"
            />
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white text-sm rounded-lg"
            >
              {t('common.search') || 'Search'}
            </button>
          </div>
        </div>
      </div>

      {/* Log entries */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
          <span className="text-sm text-gray-500">
            {total} {total === 1 ? 'entry' : 'entries'}
          </span>
        </div>
        {loading ? (
          <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-12 text-gray-500">{t('common.noResults')}</div>
        ) : (
          <pre className="p-4 text-xs font-mono text-gray-800 bg-gray-50 overflow-auto max-h-[500px] whitespace-pre-wrap break-words">
            {entries.map((entry) => formatEntry(entry)).join('\n')}
          </pre>
        )}
      </div>

      {/* Log files for download */}
      {files.length > 0 && (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-200">
            <h3 className="text-sm font-medium text-gray-700">Log Files</h3>
          </div>
          <ul className="divide-y divide-gray-100">
            {files.map((file: any) => {
              const filename = typeof file === 'string' ? file : file.name || file.filename || '';
              return (
                <li key={filename} className="px-4 py-3 flex items-center justify-between hover:bg-gray-50">
                  <span className="text-sm text-gray-800 font-mono">{filename}</span>
                  <button
                    onClick={() => handleDownload(filename)}
                    className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-800"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// ===== Scheduling Tab =====
function SchedulingTab() {
  const { t } = useTranslation();
  const [schedules, setSchedules] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<any>(null);
  const [formData, setFormData] = useState({
    reportType: 'purchases',
    format: 'pdf',
    frequency: 'daily',
    recipients: '',
  });

  useEffect(() => {
    loadSchedules();
  }, []);

  const loadSchedules = async () => {
    setLoading(true);
    try {
      const res = await schedulesAPI.getAll();
      const data = Array.isArray(res.data) ? res.data : res.data?.schedules || [];
      setSchedules(data);
    } catch (error) {
      console.error('Failed to load schedules:', error);
      toast.error(t('common.failedToLoad'));
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (id: string) => {
    try {
      await schedulesAPI.toggle(id);
      setSchedules(prev =>
        prev.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s)
      );
      toast.success('Schedule updated');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to toggle schedule');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('common.confirmDelete'))) return;
    try {
      await schedulesAPI.delete(id);
      setSchedules(prev => prev.filter(s => s.id !== id));
      toast.success('Schedule deleted');
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('common.failedToDelete'));
    }
  };

  const resetForm = () => {
    setFormData({ reportType: 'purchases', format: 'pdf', frequency: 'daily', recipients: '' });
    setEditingSchedule(null);
    setShowForm(false);
  };

  const handleEdit = (schedule: any) => {
    setEditingSchedule(schedule);
    setFormData({
      reportType: schedule.report_type || schedule.reportType || 'purchases',
      format: schedule.format || 'pdf',
      frequency: schedule.frequency || 'daily',
      recipients: Array.isArray(schedule.recipients) ? schedule.recipients.join(', ') : (schedule.recipients || ''),
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      reportType: formData.reportType,
      format: formData.format,
      frequency: formData.frequency,
      recipients: formData.recipients.split(',').map((r: string) => r.trim()).filter(Boolean),
    };
    try {
      if (editingSchedule) {
        await schedulesAPI.update(editingSchedule.id, payload);
        toast.success('Schedule updated');
      } else {
        await schedulesAPI.create(payload);
        toast.success('Schedule created');
      }
      resetForm();
      loadSchedules();
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('common.failedToSave'));
    }
  };

  const formatFrequency = (freq: string) => {
    switch (freq) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return freq;
    }
  };

  const formatReportType = (type: string) => {
    switch (type) {
      case 'purchases': return 'Purchases';
      case 'sales': return 'Sales';
      case 'inventory': return 'Inventory';
      case 'traceability': return 'Traceability';
      default: return type;
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">{t('admin.scheduling')}</h2>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          New Schedule
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
          <h3 className="text-lg font-medium text-gray-900">
            {editingSchedule ? 'Edit Schedule' : 'New Schedule'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Report Type *</label>
              <select
                value={formData.reportType}
                onChange={(e) => setFormData({ ...formData, reportType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                required
              >
                <option value="purchases">Purchases</option>
                <option value="sales">Sales</option>
                <option value="inventory">Inventory</option>
                <option value="traceability">Traceability</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Format *</label>
              <select
                value={formData.format}
                onChange={(e) => setFormData({ ...formData, format: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                required
              >
                <option value="pdf">PDF</option>
                <option value="csv">CSV</option>
                <option value="excel">Excel</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Frequency *</label>
              <select
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                required
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Recipients *</label>
              <input
                type="text"
                value={formData.recipients}
                onChange={(e) => setFormData({ ...formData, recipients: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                placeholder="email1@example.com, email2@example.com"
                required
              />
              <p className="text-xs text-gray-500 mt-1">Comma-separated email addresses</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="submit" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
              <Save className="w-4 h-4" />
              {t('common.save')}
            </button>
            <button type="button" onClick={resetForm} className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg">
              <X className="w-4 h-4" />
              {t('common.cancel')}
            </button>
          </div>
        </form>
      )}

      {/* Schedules table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Report Type</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Format</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frequency</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Recipients</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.status')}</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Run</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{t('common.actions')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {schedules.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  {t('common.noResults')}
                </td>
              </tr>
            ) : (
              schedules.map((schedule) => {
                const recipients = Array.isArray(schedule.recipients)
                  ? schedule.recipients.join(', ')
                  : (schedule.recipients || '-');
                const lastRun = schedule.last_run || schedule.lastRun;
                return (
                  <tr key={schedule.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatReportType(schedule.report_type || schedule.reportType || '')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 uppercase">
                      {schedule.format || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {formatFrequency(schedule.frequency || '')}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate" title={recipients}>
                      {recipients}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleToggle(schedule.id)}
                        className={`flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-full transition-colors ${
                          schedule.enabled
                            ? 'bg-green-100 text-green-800 hover:bg-green-200'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {schedule.enabled ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        {schedule.enabled ? t('common.active') : t('common.inactive')}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {lastRun ? new Date(lastRun).toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleEdit(schedule)} className="text-blue-600 hover:text-blue-800">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(schedule.id)} className="text-red-600 hover:text-red-800">
                          <Trash2 className="w-4 h-4" />
                        </button>
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
  );
}

// ===== Confirmations Tab =====
function ConfirmationsTab() {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState({
    purchaseEmailEnabled: false,
    saleEmailEnabled: false,
    purchaseRecipientField: 'vendor' as 'vendor' | 'custom',
    saleRecipientField: 'client' as 'client' | 'custom',
    customPurchaseEmail: '',
    customSaleEmail: '',
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await settingsAPI.get('confirmations');
      const data = res.data;
      if (data && Object.keys(data).length > 0) {
        setSettings({
          purchaseEmailEnabled: data.purchaseEmailEnabled ?? false,
          saleEmailEnabled: data.saleEmailEnabled ?? false,
          purchaseRecipientField: data.purchaseRecipientField || 'vendor',
          saleRecipientField: data.saleRecipientField || 'client',
          customPurchaseEmail: data.customPurchaseEmail || '',
          customSaleEmail: data.customSaleEmail || '',
        });
      }
    } catch {
      // settings may not exist yet, that's fine
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await settingsAPI.save('confirmations', settings);
      toast.success(t('admin.settingsSaved') || 'Settings saved');
    } catch (error: any) {
      toast.error(error.response?.data?.message || t('common.failedToSave'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">{t('common.loading')}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">{t('admin.confirmations')}</h2>
        <p className="text-sm text-gray-500 mt-1">
          Configure email confirmations sent after purchases and sales.
        </p>
      </div>

      <div className="bg-white p-6 rounded-lg shadow space-y-6">
        {/* Purchase confirmations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Purchase Confirmations</h3>
              <p className="text-sm text-gray-500">Send email confirmations for purchase transactions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.purchaseEmailEnabled}
                onChange={(e) => setSettings({ ...settings, purchaseEmailEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {settings.purchaseEmailEnabled && (
            <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipient</label>
                <select
                  value={settings.purchaseRecipientField}
                  onChange={(e) => setSettings({ ...settings, purchaseRecipientField: e.target.value as 'vendor' | 'custom' })}
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="vendor">Vendor email (from waste picker record)</option>
                  <option value="custom">Custom email address</option>
                </select>
              </div>
              {settings.purchaseRecipientField === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Email</label>
                  <input
                    type="email"
                    value={settings.customPurchaseEmail}
                    onChange={(e) => setSettings({ ...settings, customPurchaseEmail: e.target.value })}
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="receipts@example.com"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        <hr className="border-gray-200" />

        {/* Sale confirmations */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Sale Confirmations</h3>
              <p className="text-sm text-gray-500">Send email confirmations for sale transactions</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.saleEmailEnabled}
                onChange={(e) => setSettings({ ...settings, saleEmailEnabled: e.target.checked })}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>

          {settings.saleEmailEnabled && (
            <div className="ml-4 pl-4 border-l-2 border-gray-200 space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Recipient</label>
                <select
                  value={settings.saleRecipientField}
                  onChange={(e) => setSettings({ ...settings, saleRecipientField: e.target.value as 'client' | 'custom' })}
                  className="w-full max-w-xs px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                >
                  <option value="client">Client email (from client record)</option>
                  <option value="custom">Custom email address</option>
                </select>
              </div>
              {settings.saleRecipientField === 'custom' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Custom Email</label>
                  <input
                    type="email"
                    value={settings.customSaleEmail}
                    onChange={(e) => setSettings({ ...settings, customSaleEmail: e.target.value })}
                    className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
                    placeholder="sales@example.com"
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Save button */}
        <div className="pt-4 border-t border-gray-200">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? t('common.loading') : t('common.save')}
          </button>
        </div>
      </div>
    </div>
  );
}
