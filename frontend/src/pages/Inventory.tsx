import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { inventoryAPI } from '@/lib/api';
import { Package, AlertTriangle, MapPin } from 'lucide-react';

export default function Inventory() {
  const [inventoryData, setInventoryData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<number | null>(null);

  const materials = useLiveQuery(() => db.materials.where('isActive').equals(1).toArray(), []);
  const locations = useLiveQuery(() => db.locations.where('isActive').equals(1).toArray(), []);

  useEffect(() => {
    loadInventory();
  }, [selectedLocation]);

  const loadInventory = async () => {
    setLoading(true);
    try {
      const params = selectedLocation ? { locationId: selectedLocation } : {};
      const response = await inventoryAPI.getAll(params);
      setInventoryData(response.data);
    } catch (error) {
      console.error('Failed to load inventory:', error);
      // Fallback to local data
      if (materials) {
        setInventoryData(
          materials.map((m) => ({
            materialId: m.id,
            materialName: m.name,
            category: m.category,
            unit: m.unit,
            currentStock: m.currentStock,
            minStockLevel: m.minStockLevel,
          }))
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const getTotalStock = () => {
    return inventoryData.reduce((sum, item) => sum + (item.currentStock || 0), 0);
  };

  const getLowStockCount = () => {
    return inventoryData.filter(
      (item) => item.minStockLevel && item.currentStock < item.minStockLevel
    ).length;
  };

  const getStockValue = () => {
    // Simplified calculation - would need pricing data for accuracy
    return inventoryData.reduce((sum, item) => sum + (item.currentStock || 0) * 0.5, 0);
  };

  const getMaterialCategories = () => {
    const categories: { [key: string]: number } = {};
    inventoryData.forEach((item) => {
      const category = item.category || 'uncategorized';
      categories[category] = (categories[category] || 0) + (item.currentStock || 0);
    });
    return categories;
  };

  const categories = getMaterialCategories();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Management</h1>
        <button
          onClick={loadInventory}
          className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Stock</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : getTotalStock().toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">kg</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-600">
                {loading ? '...' : getLowStockCount()}
              </p>
              <p className="text-xs text-gray-500 mt-1">items</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Stock Value</p>
              <p className="text-2xl font-bold text-gray-900">
                ${loading ? '...' : getStockValue().toFixed(2)}
              </p>
              <p className="text-xs text-gray-500 mt-1">estimated</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Package className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Material Types</p>
              <p className="text-2xl font-bold text-gray-900">
                {loading ? '...' : inventoryData.length}
              </p>
              <p className="text-xs text-gray-500 mt-1">active</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Location Filter */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center gap-4">
          <MapPin className="w-5 h-5 text-gray-600" />
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Filter by Location
            </label>
            <select
              value={selectedLocation || ''}
              onChange={(e) => setSelectedLocation(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full md:w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none"
            >
              <option value="">All Locations</option>
              {locations?.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name} ({location.type})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Category Breakdown */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Stock by Category</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Object.entries(categories).map(([category, quantity]) => (
            <div key={category} className="p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600 capitalize">{category}</p>
              <p className="text-xl font-bold text-gray-900">{quantity.toFixed(2)} kg</p>
            </div>
          ))}
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Current Stock Levels</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Material
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Current Stock
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Min Level
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    Loading inventory...
                  </td>
                </tr>
              ) : inventoryData.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                    No inventory data available
                  </td>
                </tr>
              ) : (
                inventoryData.map((item) => {
                  const isLowStock = item.minStockLevel && item.currentStock < item.minStockLevel;
                  const stockPercentage = item.minStockLevel
                    ? (item.currentStock / item.minStockLevel) * 100
                    : 100;

                  return (
                    <tr key={`${item.materialId}-${item.locationId || 'all'}`} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {item.materialName}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900 capitalize">
                        {item.category}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{item.currentStock.toFixed(2)}</span>
                          <span className="text-gray-500">{item.unit}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.minStockLevel ? `${item.minStockLevel.toFixed(2)} ${item.unit}` : '-'}
                      </td>
                      <td className="px-4 py-3">
                        {isLowStock ? (
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Low Stock
                            </span>
                            <span className="text-xs text-gray-500">
                              {stockPercentage.toFixed(0)}%
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Good
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-900">
                        {item.locationName || 'All Locations'}
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
