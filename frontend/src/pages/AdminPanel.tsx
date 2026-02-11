import { useState, useEffect } from 'react';
import { materialsAPI, locationsAPI, settingsAPI } from '@/lib/api';
import { api } from '@/lib/api';
import { Plus, Edit2, Trash2, Save, X, Mail } from 'lucide-react';
import toast from 'react-hot-toast';

type TabType = 'materials' | 'locations' | 'pricing' | 'email';

export default function AdminPanel() {
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
        // Load materials for the pricing form dropdown
        const matResponse = await materialsAPI.getAll();
        const matData = Array.isArray(matResponse.data) ? matResponse.data : matResponse.data?.materials || [];
        setMaterials(matData);

        const locResponse = await locationsAPI.getAll();
        const locData = Array.isArray(locResponse.data) ? locResponse.data : locResponse.data?.locations || [];
        setLocations(locData);

        // Prices are at /materials/prices, not /prices
        const priceResponse = await api.get('/materials/prices');
        const priceData = Array.isArray(priceResponse.data) ? priceResponse.data : priceResponse.data?.prices || [];
        setPrices(priceData);
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (data: any) => {
    try {
      if (activeTab === 'materials') {
        if (editingItem) {
          await materialsAPI.update(editingItem.id, data);
          toast.success('Material updated');
        } else {
          await materialsAPI.create(data);
          toast.success('Material created');
        }
      } else if (activeTab === 'locations') {
        if (editingItem) {
          await locationsAPI.update(editingItem.id, data);
          toast.success('Location updated');
        } else {
          await locationsAPI.create(data);
          toast.success('Location created');
        }
      } else if (activeTab === 'pricing') {
        // Prices endpoint is at /materials/prices
        await api.post('/materials/prices', data);
        toast.success(editingItem ? 'Price updated' : 'Price created');
      }
      setShowForm(false);
      setEditingItem(null);
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save');
    }
  };

  const handleDelete = async (id: number | string) => {
    if (!confirm('Are you sure you want to delete this item?')) return;

    try {
      if (activeTab === 'materials') {
        await materialsAPI.delete(id as number);
        toast.success('Material deleted');
      } else if (activeTab === 'locations') {
        await locationsAPI.delete(id as number);
        toast.success('Location deleted');
      }
      loadData();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete');
    }
  };

  const renderMaterialsTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Materials Management</h2>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add Material
        </button>
      </div>

      {showForm && <MaterialForm item={editingItem} onSave={handleSave} onCancel={() => setShowForm(false)} />}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Unit</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                    {material.is_active ? 'Active' : 'Inactive'}
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
        <h2 className="text-xl font-semibold text-gray-900">Locations Management</h2>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add Location
        </button>
      </div>

      {showForm && <LocationForm item={editingItem} onSave={handleSave} onCancel={() => setShowForm(false)} />}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Manager</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
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
                    {location.is_active ? 'Active' : 'Inactive'}
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

  const renderPricingTab = () => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-gray-900">Pricing Management</h2>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add Price
        </button>
      </div>

      {showForm && <PriceForm item={editingItem} materials={materials} locations={locations} onSave={handleSave} onCancel={() => setShowForm(false)} />}

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Material</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Purchase Price/kg</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sale Price/kg</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {prices.map((price, index) => (
              <tr key={price.id || index}>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {price.material_name || materials.find(m => m.id === price.material_category_id)?.name || 'Unknown'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  {price.location_id ? locations.find(l => l.id === price.location_id)?.name || '-' : 'All'}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  ${parseFloat(price.purchase_price_per_kg || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">
                  ${parseFloat(price.sale_price_per_kg || 0).toFixed(2)}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{price.date || '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Admin Panel</h1>

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
            Materials
          </button>
          <button
            onClick={() => setActiveTab('locations')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'locations'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Locations
          </button>
          <button
            onClick={() => setActiveTab('pricing')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'pricing'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pricing
          </button>
          <button
            onClick={() => setActiveTab('email')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-1.5 ${
              activeTab === 'email'
                ? 'border-primary-600 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Mail className="w-4 h-4" />
            Email Settings
          </button>
        </nav>
      </div>

      {/* Content */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <>
          {activeTab === 'materials' && renderMaterialsTab()}
          {activeTab === 'locations' && renderLocationsTab()}
          {activeTab === 'pricing' && renderPricingTab()}
          {activeTab === 'email' && <EmailSettingsTab />}
        </>
      )}
    </div>
  );
}

// Form Components
function MaterialForm({ item, onSave, onCancel }: any) {
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <input
            type="text"
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Unit *</label>
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
        <label className="text-sm text-gray-700">Active</label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
          <Save className="w-4 h-4" />
          Save
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg">
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </form>
  );
}

function LocationForm({ item, onSave, onCancel }: any) {
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Manager Name</label>
          <input
            type="text"
            value={formData.managerName}
            onChange={(e) => setFormData({ ...formData, managerName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
        <input
          type="text"
          value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          required
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
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
        <label className="text-sm text-gray-700">Active</label>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
          <Save className="w-4 h-4" />
          Save
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg">
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </form>
  );
}

function EmailSettingsTab() {
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
      toast.success('Email settings saved');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      toast.error('Enter a test email address');
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
      toast.success('Test email sent successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to send test email');
    } finally {
      setTesting(false);
    }
  };

  if (loading) return <div className="text-center py-12 text-gray-500">Loading...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900">Email (SMTP) Settings</h2>
        <p className="text-sm text-gray-500 mt-1">Configure email to send reports and notifications</p>
      </div>

      <form onSubmit={handleSave} className="bg-white p-6 rounded-lg shadow space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Host *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">SMTP Port *</label>
            <input
              type="number"
              value={smtpSettings.port}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, port: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="587"
              required
            />
            <p className="text-xs text-gray-500 mt-1">Usually 587 (TLS) or 465 (SSL)</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Username / Email *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">From Address</label>
            <input
              type="text"
              value={smtpSettings.from}
              onChange={(e) => setSmtpSettings({ ...smtpSettings, from: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
              placeholder="CIVICycle <noreply@example.com> (optional, defaults to username)"
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
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </form>

      {/* Test Email */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">Test Email Configuration</h3>
        <p className="text-sm text-gray-500">Send a test email to verify your SMTP settings are working</p>
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
            {testing ? 'Sending...' : 'Send Test'}
          </button>
        </div>
      </div>
    </div>
  );
}

function PriceForm({ item, materials, locations, onSave, onCancel }: any) {
  const [formData, setFormData] = useState({
    materialCategoryId: item?.material_category_id || '',
    locationId: item?.location_id || '',
    purchasePricePerKg: item?.purchase_price_per_kg || '',
    salePricePerKg: item?.sale_price_per_kg || '',
    date: item?.date || new Date().toISOString().split('T')[0],
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      materialCategoryId: formData.materialCategoryId,
      locationId: formData.locationId || null,
      purchasePricePerKg: parseFloat(formData.purchasePricePerKg),
      salePricePerKg: parseFloat(formData.salePricePerKg),
      date: formData.date,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Material *</label>
          <select
            value={formData.materialCategoryId}
            onChange={(e) => setFormData({ ...formData, materialCategoryId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          >
            <option value="">Select material</option>
            {materials.map((m: any) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Location (Optional)</label>
          <select
            value={formData.locationId}
            onChange={(e) => setFormData({ ...formData, locationId: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          >
            <option value="">All locations</option>
            {locations.map((l: any) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Purchase Price/kg *</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Sale Price/kg *</label>
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
          <label className="block text-sm font-medium text-gray-700 mb-2">Date *</label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
      </div>
      <div className="flex gap-2">
        <button type="submit" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
          <Save className="w-4 h-4" />
          Save
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg">
          <X className="w-4 h-4" />
          Cancel
        </button>
      </div>
    </form>
  );
}
