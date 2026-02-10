import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionsAPI, materialsAPI, locationsAPI, api } from '@/lib/api';
import { db } from '@/lib/db';
import { useAuthStore } from '@/store/authStore';
import toast from 'react-hot-toast';
import { Save, ArrowLeft } from 'lucide-react';

export default function NewTransaction() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [materials, setMaterials] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      const [matRes, locRes] = await Promise.all([
        materialsAPI.getAll(),
        locationsAPI.getAll(),
      ]);
      const matData = Array.isArray(matRes.data) ? matRes.data : matRes.data?.materials || [];
      const locData = Array.isArray(locRes.data) ? locRes.data : locRes.data?.locations || [];
      setMaterials(matData.filter((m: any) => m.is_active !== false));
      setLocations(locData.filter((l: any) => l.is_active !== false));
    } catch (error) {
      console.error('Failed to load form data:', error);
    }
  };

  const [formData, setFormData] = useState({
    type: 'purchase' as 'purchase' | 'sale',
    materialId: '',
    sourceLocationId: '',
    destinationLocationId: '',
    quantity: '',
    unitPrice: '',
    supplierName: '',
    supplierContact: '',
    vehicleNumber: '',
    paymentStatus: 'paid' as 'paid' | 'pending' | 'partial',
    paidAmount: '',
    notes: '',
  });

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    // Auto-fetch current price when material is selected
    if (formData.materialId && isOnline) {
      fetchCurrentPrice();
    }
  }, [formData.materialId, formData.type, isOnline]);

  const fetchCurrentPrice = async () => {
    try {
      // Prices are at /materials/prices, not /prices/material/:id
      const response = await api.get('/materials/prices', {
        params: { date: new Date().toISOString().split('T')[0] }
      });
      const prices = Array.isArray(response.data) ? response.data : response.data?.prices || [];
      const materialPrice = prices.find((p: any) => p.material_category_id === formData.materialId);
      if (materialPrice) {
        const price = formData.type === 'purchase'
          ? materialPrice.purchase_price_per_kg
          : materialPrice.sale_price_per_kg;
        if (price) {
          setFormData(prev => ({ ...prev, unitPrice: price.toString() }));
        }
      }
    } catch (error) {
      console.error('Failed to fetch price:', error);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const calculateTotal = () => {
    const quantity = parseFloat(formData.quantity) || 0;
    const unitPrice = parseFloat(formData.unitPrice) || 0;
    return (quantity * unitPrice).toFixed(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.materialId || !formData.quantity || !formData.unitPrice) {
      toast.error('Please fill in all required fields');
      return;
    }

    const totalAmount = parseFloat(calculateTotal());
    const paidAmount = formData.paymentStatus === 'paid' 
      ? totalAmount 
      : parseFloat(formData.paidAmount) || 0;

    const transactionData = {
      type: formData.type,
      materialId: parseInt(formData.materialId),
      sourceLocationId: formData.sourceLocationId ? parseInt(formData.sourceLocationId) : undefined,
      destinationLocationId: formData.destinationLocationId ? parseInt(formData.destinationLocationId) : undefined,
      quantity: parseFloat(formData.quantity),
      unitPrice: parseFloat(formData.unitPrice),
      totalAmount,
      paymentStatus: formData.paymentStatus,
      paidAmount,
      supplierName: formData.supplierName || undefined,
      supplierContact: formData.supplierContact || undefined,
      vehicleNumber: formData.vehicleNumber || undefined,
      notes: formData.notes || undefined,
      userId: user!.id,
      createdAt: new Date().toISOString(),
      synced: false,
      localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };

    setIsSubmitting(true);
    try {
      if (isOnline) {
        // Try to save to server
        await transactionsAPI.create(transactionData);
        toast.success('Transaction created successfully');
      } else {
        // Save to local DB for offline sync
        await db.transactions.add(transactionData);
        toast.success('Transaction saved locally - will sync when online');
      }
      navigate('/transactions');
    } catch (error: any) {
      // If online save fails, fallback to local storage
      if (isOnline) {
        try {
          await db.transactions.add(transactionData);
          toast.success('Transaction saved locally - will sync later');
          navigate('/transactions');
        } catch (dbError) {
          toast.error('Failed to save transaction');
        }
      } else {
        toast.error('Failed to save transaction');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <button
          onClick={() => navigate('/transactions')}
          className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Transactions
        </button>
        <h1 className="text-2xl font-bold text-gray-900">New Transaction</h1>
        {!isOnline && (
          <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              You are offline. Transaction will be saved locally and synced when connection is restored.
            </p>
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-lg p-6 space-y-6">
        {/* Transaction Type */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Transaction Type *
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'purchase' }))}
              className={`p-4 border-2 rounded-lg font-medium transition-colors ${
                formData.type === 'purchase'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              Purchase (Buying)
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, type: 'sale' }))}
              className={`p-4 border-2 rounded-lg font-medium transition-colors ${
                formData.type === 'sale'
                  ? 'border-primary-600 bg-primary-50 text-primary-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              Sale (Selling)
            </button>
          </div>
        </div>

        {/* Material & Locations */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="materialId" className="block text-sm font-medium text-gray-700 mb-2">
              Material *
            </label>
            <select
              id="materialId"
              name="materialId"
              value={formData.materialId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              required
            >
              <option value="">Select material</option>
              {materials?.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name} ({material.category})
                </option>
              ))}
            </select>
          </div>

          {formData.type === 'purchase' ? (
            <div>
              <label htmlFor="destinationLocationId" className="block text-sm font-medium text-gray-700 mb-2">
                Destination Location
              </label>
              <select
                id="destinationLocationId"
                name="destinationLocationId"
                value={formData.destinationLocationId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">Select location</option>
                {locations?.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.type})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label htmlFor="sourceLocationId" className="block text-sm font-medium text-gray-700 mb-2">
                Source Location
              </label>
              <select
                id="sourceLocationId"
                name="sourceLocationId"
                value={formData.sourceLocationId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              >
                <option value="">Select location</option>
                {locations?.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name} ({location.type})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Quantity & Price */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
              Quantity (kg) *
            </label>
            <input
              id="quantity"
              name="quantity"
              type="number"
              step="0.01"
              value={formData.quantity}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label htmlFor="unitPrice" className="block text-sm font-medium text-gray-700 mb-2">
              Unit Price ($) *
            </label>
            <input
              id="unitPrice"
              name="unitPrice"
              type="number"
              step="0.01"
              value={formData.unitPrice}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Total Amount
            </label>
            <div className="px-4 py-2 bg-gray-100 border border-gray-300 rounded-lg font-semibold text-lg">
              ${calculateTotal()}
            </div>
          </div>
        </div>

        {/* Supplier Info (for purchases) */}
        {formData.type === 'purchase' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="supplierName" className="block text-sm font-medium text-gray-700 mb-2">
                Supplier Name
              </label>
              <input
                id="supplierName"
                name="supplierName"
                type="text"
                value={formData.supplierName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="John Doe"
              />
            </div>

            <div>
              <label htmlFor="supplierContact" className="block text-sm font-medium text-gray-700 mb-2">
                Contact Number
              </label>
              <input
                id="supplierContact"
                name="supplierContact"
                type="text"
                value={formData.supplierContact}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="+1234567890"
              />
            </div>

            <div>
              <label htmlFor="vehicleNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Vehicle Number
              </label>
              <input
                id="vehicleNumber"
                name="vehicleNumber"
                type="text"
                value={formData.vehicleNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
                placeholder="ABC-1234"
              />
            </div>
          </div>
        )}

        {/* Payment Status */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Payment Status *
          </label>
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, paymentStatus: 'paid', paidAmount: calculateTotal() }))}
              className={`p-3 border-2 rounded-lg font-medium transition-colors ${
                formData.paymentStatus === 'paid'
                  ? 'border-green-600 bg-green-50 text-green-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              Paid
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, paymentStatus: 'partial', paidAmount: '' }))}
              className={`p-3 border-2 rounded-lg font-medium transition-colors ${
                formData.paymentStatus === 'partial'
                  ? 'border-yellow-600 bg-yellow-50 text-yellow-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              Partial
            </button>
            <button
              type="button"
              onClick={() => setFormData(prev => ({ ...prev, paymentStatus: 'pending', paidAmount: '0' }))}
              className={`p-3 border-2 rounded-lg font-medium transition-colors ${
                formData.paymentStatus === 'pending'
                  ? 'border-red-600 bg-red-50 text-red-700'
                  : 'border-gray-300 hover:border-gray-400'
              }`}
            >
              Pending
            </button>
          </div>
        </div>

        {/* Paid Amount (for partial payments) */}
        {formData.paymentStatus === 'partial' && (
          <div>
            <label htmlFor="paidAmount" className="block text-sm font-medium text-gray-700 mb-2">
              Paid Amount ($)
            </label>
            <input
              id="paidAmount"
              name="paidAmount"
              type="number"
              step="0.01"
              value={formData.paidAmount}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              placeholder="0.00"
              max={calculateTotal()}
            />
          </div>
        )}

        {/* Notes */}
        <div>
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
            Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            placeholder="Additional notes..."
          />
        </div>

        {/* Submit Button */}
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => navigate('/transactions')}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 flex items-center justify-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="w-5 h-5" />
            {isSubmitting ? 'Saving...' : 'Save Transaction'}
          </button>
        </div>
      </form>
    </div>
  );
}
