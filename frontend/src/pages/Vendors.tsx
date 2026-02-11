import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { wastePickersAPI } from '@/lib/api';
import { Plus, Edit2, Trash2, Save, X, Search, UserCheck } from 'lucide-react';
import toast from 'react-hot-toast';

interface WastePicker {
  id: string;
  first_name: string;
  last_name: string;
  id_number: string;
  phone: string;
  email: string;
  address: string;
  is_affiliated: boolean;
  bank_name: string;
  bank_account: string;
  payment_method: string;
  is_active: boolean;
}

export default function Vendors() {
  const { t } = useTranslation();
  const [wastePickers, setWastePickers] = useState<WastePicker[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingItem, setEditingItem] = useState<WastePicker | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async (search?: string) => {
    setLoading(true);
    try {
      const params: any = {};
      if (search) {
        params.search = search;
      }
      const response = await wastePickersAPI.getAll(params);
      const data = Array.isArray(response.data)
        ? response.data
        : response.data?.wastePickers || [];
      setWastePickers(data);
    } catch (error) {
      console.error('Failed to load waste pickers:', error);
      toast.error('Failed to load waste pickers');
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
        await wastePickersAPI.update(editingItem.id, data);
        toast.success(t('vendors.updated'));
      } else {
        await wastePickersAPI.create(data);
        toast.success(t('vendors.created'));
      }
      setShowForm(false);
      setEditingItem(null);
      loadData(searchQuery);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save waste picker');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(t('vendors.confirmDelete'))) return;
    try {
      await wastePickersAPI.delete(id);
      toast.success(t('vendors.deleted'));
      loadData(searchQuery);
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to delete waste picker');
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'cash':
        return t('transactions.cash');
      case 'bank_transfer':
        return t('transactions.bankTransfer');
      case 'mobile_money':
        return t('transactions.mobileMoney');
      default:
        return method || '-';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <UserCheck className="w-7 h-7 text-primary-600" />
          <h1 className="text-2xl font-bold text-gray-900">{t('vendors.title')}</h1>
        </div>
        <button
          onClick={() => {
            setEditingItem(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
        >
          <Plus className="w-4 h-4" />
          {t('vendors.add')}
        </button>
      </div>

      {/* Search Bar */}
      <form onSubmit={handleSearch} className="bg-white p-4 rounded-lg shadow">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('vendors.searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg"
          >
            <Search className="w-4 h-4" />
            {t('common.search')}
          </button>
        </div>
      </form>

      {showForm && (
        <VendorForm
          item={editingItem}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false);
            setEditingItem(null);
          }}
        />
      )}

      {loading ? (
        <div className="text-center py-12 text-gray-500">{t('vendors.loading')}</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('common.name')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('vendors.idNumber')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('common.phone')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('common.email')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('vendors.paymentMethod')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('common.status')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {wastePickers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                      {t('vendors.noResults')}
                    </td>
                  </tr>
                ) : (
                  wastePickers.map((picker) => (
                    <tr key={picker.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        <div className="flex items-center gap-2">
                          {picker.first_name} {picker.last_name}
                          {picker.is_affiliated && (
                            <span className="px-1.5 py-0.5 text-xs rounded bg-blue-100 text-blue-700">
                              {t('vendors.isAffiliated')}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {picker.id_number || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {picker.phone || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {picker.email || '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {getPaymentMethodLabel(picker.payment_method)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            picker.is_active
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {picker.is_active ? t('common.active') : t('common.inactive')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingItem(picker);
                              setShowForm(true);
                            }}
                            className="text-blue-600 hover:text-blue-800"
                            title="Edit"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(picker.id)}
                            className="text-red-600 hover:text-red-800"
                            title="Delete"
                          >
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

function VendorForm({
  item,
  onSave,
  onCancel,
}: {
  item: WastePicker | null;
  onSave: (data: any) => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({
    firstName: item?.first_name || '',
    lastName: item?.last_name || '',
    idNumber: item?.id_number || '',
    phone: item?.phone || '',
    email: item?.email || '',
    address: item?.address || '',
    isAffiliated: item?.is_affiliated || false,
    bankName: item?.bank_name || '',
    bankAccount: item?.bank_account || '',
    paymentMethod: item?.payment_method || 'cash',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      firstName: formData.firstName,
      lastName: formData.lastName,
      idNumber: formData.idNumber,
      phone: formData.phone,
      email: formData.email,
      address: formData.address,
      isAffiliated: formData.isAffiliated,
      bankName: formData.bankName,
      bankAccount: formData.bankAccount,
      paymentMethod: formData.paymentMethod,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white p-6 rounded-lg shadow space-y-4">
      <h2 className="text-lg font-semibold text-gray-900">
        {item ? t('vendors.editTitle') : t('vendors.addTitle')}
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('vendors.firstName')} *</label>
          <input
            type="text"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('vendors.lastName')} *</label>
          <input
            type="text"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('vendors.idNumber')} *</label>
          <input
            type="text"
            value={formData.idNumber}
            onChange={(e) => setFormData({ ...formData, idNumber: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.phone')} *</label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.email')}</label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('common.address')}</label>
          <input
            type="text"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('vendors.paymentMethod')} *</label>
          <select
            value={formData.paymentMethod}
            onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
            required
          >
            <option value="cash">{t('transactions.cash')}</option>
            <option value="bank_transfer">{t('transactions.bankTransfer')}</option>
            <option value="mobile_money">{t('transactions.mobileMoney')}</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('vendors.bankName')}</label>
          <input
            type="text"
            value={formData.bankName}
            onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('vendors.bankAccount')}</label>
          <input
            type="text"
            value={formData.bankAccount}
            onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none"
          />
        </div>
        <div className="flex items-center pt-7">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.isAffiliated}
              onChange={(e) => setFormData({ ...formData, isAffiliated: e.target.checked })}
              className="w-4 h-4 text-primary-600 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-sm font-medium text-gray-700">{t('vendors.isAffiliated')}</span>
          </label>
        </div>
      </div>
      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg"
        >
          <Save className="w-4 h-4" />
          {t('common.save')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex items-center gap-2 bg-gray-300 hover:bg-gray-400 text-gray-700 px-4 py-2 rounded-lg"
        >
          <X className="w-4 h-4" />
          {t('common.cancel')}
        </button>
      </div>
    </form>
  );
}
