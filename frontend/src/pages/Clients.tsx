import { useState, useEffect } from 'react';
import { clientsAPI } from '@/lib/api';
import { Plus, Edit2, Trash2, Save, X, Search, Building2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Client {
  id: string;
  name: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  address: string;
  payment_terms: string;
  is_active: boolean;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<Client | null>(null);
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
      const response = await clientsAPI.getAll(params);
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.clients || [];
      setClients(data);
    } catch (error) {
      console.error('Failed to load clients:', error);
      toast.error('Failed to load clients');
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
        await clientsAPI.update(editingItem.id, data);
        toast.success('Client updated');
      } else {
        await clientsAPI.create(data);
        toast.success('Client created');
      }
      setShowForm(false);
      setEditingItem(null);
      loadData(searchQuery);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save client');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to deactivate this client?')) return;
    try {
      await clientsAPI.delete(id);
      toast.success('Client deactivated');
      loadData(searchQuery);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete client');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Building2 className="w-7 h-7 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">Clients</h1>
        </div>
        <button
          onClick={() => { setEditingItem(null); setShowForm(true); }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          Add Client
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
              placeholder="Search by name, contact, or email..."
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
        <ClientForm
          item={editingItem}
          onSave={handleSave}
          onCancel={() => { setShowForm(false); setEditingItem(null); }}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading clients...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Phone</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Payment Terms</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {clients.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">No clients found</td>
                  </tr>
                ) : (
                  clients.map((client) => (
                    <tr key={client.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">{client.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{client.contact_name || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{client.contact_phone || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{client.contact_email || '-'}</td>
                      <td className="px-4 py-3 text-sm text-gray-900">{client.payment_terms || '-'}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          client.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {client.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button onClick={() => { setEditingItem(client); setShowForm(true); }} className="text-blue-600 hover:text-blue-800" title="Edit">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDelete(client.id)} className="text-red-600 hover:text-red-800" title="Delete">
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

function ClientForm({ item, onSave, onCancel }: { item: Client | null; onSave: (data: any) => void; onCancel: () => void }) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    contactName: item?.contact_name || '',
    contactPhone: item?.contact_phone || '',
    contactEmail: item?.contact_email || '',
    address: item?.address || '',
    paymentTerms: item?.payment_terms || '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">{item ? 'Edit Client' : 'Add Client'}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Company Name *</label>
          <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
          <input type="text" value={formData.contactName} onChange={(e) => setFormData({ ...formData, contactName: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
          <input type="tel" value={formData.contactPhone} onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
          <input type="email" value={formData.contactEmail} onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
          <input type="text" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Payment Terms</label>
          <select value={formData.paymentTerms} onChange={(e) => setFormData({ ...formData, paymentTerms: e.target.value })} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none">
            <option value="">Select terms</option>
            <option value="cod">Cash on Delivery</option>
            <option value="net_7">Net 7</option>
            <option value="net_15">Net 15</option>
            <option value="net_30">Net 30</option>
            <option value="net_60">Net 60</option>
          </select>
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
