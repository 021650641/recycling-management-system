import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { transactionsAPI, materialsAPI, locationsAPI, wastePickersAPI, apartmentsAPI, api } from '@/lib/api';
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
  const [wastePickers, setWastePickers] = useState<any[]>([]);
  const [apartments, setApartments] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loadingUnits, setLoadingUnits] = useState(false);

  useEffect(() => {
    loadFormData();
  }, []);

  const loadFormData = async () => {
    try {
      const [matRes, locRes, wpRes, aptRes] = await Promise.all([
        materialsAPI.getAll(),
        locationsAPI.getAll(),
        wastePickersAPI.getAll(),
        apartmentsAPI.getAll(),
      ]);
      const matData = Array.isArray(matRes.data) ? matRes.data : matRes.data?.materials || [];
      const locData = Array.isArray(locRes.data) ? locRes.data : locRes.data?.locations || [];
      const wpData = Array.isArray(wpRes.data) ? wpRes.data : wpRes.data?.wastePickers || [];
      const aptData = Array.isArray(aptRes.data) ? aptRes.data : aptRes.data?.apartments || [];
      setMaterials(matData.filter((m: any) => m.is_active !== false));
      setLocations(locData.filter((l: any) => l.is_active !== false));
      setWastePickers(wpData.filter((wp: any) => wp.is_active !== false));
      setApartments(aptData.filter((a: any) => a.is_active !== false));
    } catch (error) {
      console.error('Failed to load form data:', error);
    }
  };

  const [formData, setFormData] = useState({
    wastePickerId: '',
    apartmentComplexId: '',
    apartmentUnitId: '',
    materialId: '',
    locationId: '',
    quantity: '',
    unitPrice: '',
    qualityGrade: 'standard',
    paymentMethod: 'cash',
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

  // Load units when apartment complex changes
  useEffect(() => {
    if (formData.apartmentComplexId) {
      setLoadingUnits(true);
      apartmentsAPI.getUnits(formData.apartmentComplexId)
        .then(res => setUnits(res.data?.units || []))
        .catch(() => setUnits([]))
        .finally(() => setLoadingUnits(false));
    } else {
      setUnits([]);
    }
    setFormData(prev => ({ ...prev, apartmentUnitId: '' }));
  }, [formData.apartmentComplexId]);

  useEffect(() => {
    if (formData.materialId && isOnline) {
      fetchCurrentPrice();
    }
  }, [formData.materialId, isOnline]);

  const fetchCurrentPrice = async () => {
    try {
      const response = await api.get('/materials/prices', {
        params: { date: new Date().toISOString().split('T')[0] }
      });
      const prices = Array.isArray(response.data) ? response.data : response.data?.prices || [];
      const materialPrice = prices.find((p: any) => String(p.material_category_id) === String(formData.materialId));
      if (materialPrice && materialPrice.purchase_price_per_kg) {
        setFormData(prev => ({ ...prev, unitPrice: materialPrice.purchase_price_per_kg.toString() }));
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

    if (!formData.materialId || !formData.quantity || !formData.locationId) {
      toast.error('Please fill in all required fields');
      return;
    }

    if (!formData.wastePickerId) {
      toast.error('Please select a waste picker (vendor)');
      return;
    }

    const transactionData: any = {
      locationId: formData.locationId,
      materialCategoryId: formData.materialId,
      wastePickerId: formData.wastePickerId,
      weightKg: parseFloat(formData.quantity),
      qualityGrade: formData.qualityGrade,
      paymentMethod: formData.paymentMethod,
      notes: formData.notes || undefined,
    };

    // Source is optional - add if provided
    if (formData.apartmentComplexId) {
      transactionData.apartmentComplexId = formData.apartmentComplexId;
      if (formData.apartmentUnitId) {
        transactionData.apartmentUnitId = formData.apartmentUnitId;
      }
    }

    setIsSubmitting(true);
    try {
      if (isOnline) {
        await transactionsAPI.create(transactionData);
        toast.success('Transaction created successfully');
      } else {
        await db.transactions.add({
          ...transactionData,
          synced: false,
          localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          createdAt: new Date().toISOString(),
          userId: user!.id,
        });
        toast.success('Transaction saved locally - will sync when online');
      }
      navigate('/transactions');
    } catch (error: any) {
      const errMsg = error.response?.data?.error || 'Failed to save transaction';
      if (isOnline) {
        try {
          await db.transactions.add({
            ...transactionData,
            synced: false,
            localId: `local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            createdAt: new Date().toISOString(),
            userId: user!.id,
          });
          toast.success('Transaction saved locally - will sync later');
          navigate('/transactions');
        } catch (dbError) {
          toast.error(errMsg);
        }
      } else {
        toast.error(errMsg);
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
        {/* Waste Picker (Vendor) - Always Required */}
        <div>
          <label htmlFor="wastePickerId" className="block text-sm font-medium text-gray-700 mb-2">
            Waste Picker (Vendor) *
          </label>
          <select
            id="wastePickerId"
            name="wastePickerId"
            value={formData.wastePickerId}
            onChange={handleChange}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            required
          >
            <option value="">Select waste picker</option>
            {wastePickers.map((wp) => (
              <option key={wp.id} value={wp.id}>
                {wp.first_name} {wp.last_name}
                {wp.id_number ? ` (${wp.id_number})` : ''}
              </option>
            ))}
          </select>
        </div>

        {/* Source (Optional) - Where the material came from */}
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Source Origin (optional - where did the material come from?)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="apartmentComplexId" className="block text-xs text-gray-500 mb-1">
                Apartment Complex
              </label>
              <select
                id="apartmentComplexId"
                name="apartmentComplexId"
                value={formData.apartmentComplexId}
                onChange={(e) => setFormData(prev => ({ ...prev, apartmentComplexId: e.target.value, apartmentUnitId: '' }))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white"
              >
                <option value="">No source / Unknown</option>
                {apartments.map((apt) => (
                  <option key={apt.id} value={apt.id}>
                    {apt.name}
                    {apt.total_units ? ` (${apt.total_units} units)` : ''}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="apartmentUnitId" className="block text-xs text-gray-500 mb-1">
                Specific Unit {loadingUnits && '(loading...)'}
              </label>
              <select
                id="apartmentUnitId"
                name="apartmentUnitId"
                value={formData.apartmentUnitId}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-white"
                disabled={!formData.apartmentComplexId || loadingUnits}
              >
                <option value="">Any / Unknown unit</option>
                {units.filter(u => u.is_active).map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    Unit {unit.unit_number}
                    {unit.resident_name ? ` - ${unit.resident_name}` : ''}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Material & Location */}
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
              {materials.map((material) => (
                <option key={material.id} value={material.id}>
                  {material.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="locationId" className="block text-sm font-medium text-gray-700 mb-2">
              Drop-off Location *
            </label>
            <select
              id="locationId"
              name="locationId"
              value={formData.locationId}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
              required
            >
              <option value="">Select location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quantity, Price & Quality */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="quantity" className="block text-sm font-medium text-gray-700 mb-2">
              Weight (kg) *
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
              Unit Price (auto-filled)
            </label>
            <input
              id="unitPrice"
              name="unitPrice"
              type="number"
              step="0.01"
              value={formData.unitPrice}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50"
              placeholder="Auto"
              readOnly
            />
          </div>

          <div>
            <label htmlFor="qualityGrade" className="block text-sm font-medium text-gray-700 mb-2">
              Quality Grade
            </label>
            <select
              id="qualityGrade"
              name="qualityGrade"
              value={formData.qualityGrade}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="standard">Standard</option>
              <option value="premium">Premium</option>
              <option value="low">Low</option>
            </select>
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

        {/* Payment */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method
            </label>
            <select
              id="paymentMethod"
              name="paymentMethod"
              value={formData.paymentMethod}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="cash">Cash</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="mobile_money">Mobile Money</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Status *
            </label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, paymentStatus: 'paid', paidAmount: calculateTotal() }))}
                className={`p-2 border-2 rounded-lg text-sm font-medium transition-colors ${
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
                className={`p-2 border-2 rounded-lg text-sm font-medium transition-colors ${
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
                className={`p-2 border-2 rounded-lg text-sm font-medium transition-colors ${
                  formData.paymentStatus === 'pending'
                    ? 'border-red-600 bg-red-50 text-red-700'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                Pending
              </button>
            </div>
          </div>
        </div>

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
