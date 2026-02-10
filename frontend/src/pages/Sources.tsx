import { useState, useEffect } from 'react';
import { apartmentsAPI } from '@/lib/api';
import { Plus, Edit2, Trash2, Save, X, Search, Home } from 'lucide-react';
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

export default function Sources() {
  const [apartments, setApartments] = useState<ApartmentComplex[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<ApartmentComplex | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

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
      toast.error('Failed to load sources');
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
        toast.success('Source updated');
      } else {
        await apartmentsAPI.create(data);
        toast.success('Source created');
      }
      setShowForm(false);
      setEditingItem(null);
      loadData(searchQuery);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save source');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this source?')) return;
    try {
      await apartmentsAPI.delete(id);
      toast.success('Source deactivated');
      loadData(searchQuery);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete source');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Home className="w-7 h-7 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Sources</h1>
            <p className="text-sm text-gray-500">Apartment complexes and buildings that generate waste</p>
          </div>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add Source
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
              placeholder="Search by name or address..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <button type="submit" className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg">
            <Search className="w-4 h-4" />
            Search
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
        <div className="text-center py-12 text-gray-500">Loading sources...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Address</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Units</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {apartments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No sources found</td>
                  </tr>
                ) : (
                  apartments.map((apt) => (
                    <tr key={apt.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{apt.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{apt.address || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{apt.total_units || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{apt.contact_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{apt.contact_phone || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          apt.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {apt.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingItem(apt); setShowForm(true); }} className="text-blue-600 hover:text-blue-800" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(apt.id)} className="text-red-600 hover:text-red-800" title="Delete">
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

function SourceForm({ item, onSave, onCancel }: { item: ApartmentComplex | null; onSave: (data: any) => void; onCancel: () => void }) {
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
      <h2 className="text-lg font-semibold text-gray-900">{item ? 'Edit Source' : 'Add Source'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
          <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
          <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Total Units</label>
          <input type="number" value={formData.totalUnits} onChange={(e) => setFormData({ ...formData, totalUnits: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contact Name</label>
          <input type="text" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
          <input type="tel" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contact Email</label>
          <input type="email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button type="submit" className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg">
          <Save className="w-4 h-4" /> Save
        </button>
        <button type="button" onClick={onCancel} className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg">
          <X className="w-4 h-4" /> Cancel
        </button>
      </div>
    </form>
  );
}
