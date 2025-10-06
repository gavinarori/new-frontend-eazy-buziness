import React, { useEffect, useState } from 'react';
import { Package, AlertTriangle, TrendingUp, Search, Download, Edit, Save, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../contexts/ToastContext';
import { useDialog } from '../contexts/DialogContext';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchProducts } from '../features/products/productsSlice';
import { productsApi } from '../services/apiClient';

const Inventory: React.FC = () => {
  const { userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [stockFilter, setStockFilter] = useState('all');
  const [showStockModal, setShowStockModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [newStock, setNewStock] = useState<number | ''>('');
  const [saving, setSaving] = useState(false);

  const dispatch = useAppDispatch();
  const products = useAppSelector((s) => s.products.items);
  const productsLoading = useAppSelector((s) => s.products.loading);
  useEffect(() => { dispatch(fetchProducts({ shopId: userData?.shopId } as any)); }, [dispatch, userData?.shopId]);
  const { showToast } = useToast();
  const { confirm } = useDialog();

  const filteredProducts = products.filter(product => {
    const matchesSearch = (product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'all' || (product as any).categoryId === categoryFilter;
    
    let matchesStock = true;
    if (stockFilter === 'low') {
      matchesStock = (product.stock || 0) <= 5;
    } else if (stockFilter === 'out') {
      matchesStock = product.stock === 0;
    } else if (stockFilter === 'good') {
      matchesStock = (product.stock || 0) > 5;
    }
    
    return matchesSearch && matchesCategory && matchesStock;
  });

  const categories = [...new Set(products.map(p => (p as any).categoryId || ''))].filter(Boolean) as string[];
  const totalStockValue = products.reduce((sum, product) => sum + ((product.stock || 0) * (product.price || 0)), 0);
  const lowStockItems = products.filter(p => (p.stock || 0) <= 5);
  const outOfStockItems = products.filter(p => p.stock === 0);
  const totalUnits = products.reduce((sum, product) => sum + product.stock, 0);

  const getStockStatus = (product: any) => {
    if (product.stock === 0) return { status: 'Out of Stock', color: 'text-red-600 bg-red-100' };
    if (product.stock <= product.minStock) return { status: 'Low Stock', color: 'text-yellow-600 bg-yellow-100' };
    return { status: 'In Stock', color: 'text-green-600 bg-green-100' };
  };

  const openStockModal = (product: any) => {
    setEditingProduct(product);
    setNewStock(product.stock ?? 0);
    setShowStockModal(true);
  };

  const handleSaveStock = async () => {
    if (newStock === '' || Number.isNaN(Number(newStock)) || Number(newStock) < 0) {
      showToast({ type: 'warning', title: 'Invalid value', message: 'Please enter a valid non-negative stock value.' });
      return;
    }

    // Optional confirm if big decrease
    if (editingProduct && Number(newStock) < editingProduct.stock) {
      const ok = await confirm({
        title: 'Reduce stock',
        message: `Reduce stock of ${editingProduct.name} from ${editingProduct.stock} to ${newStock}?`,
        confirmText: 'Reduce',
        cancelText: 'Cancel',
        tone: 'danger'
      });
      if (!ok) return;
    }

    setSaving(true);
    try {
      await productsApi.update(editingProduct.id, { stock: Number(newStock) });
      await dispatch(fetchProducts({ shopId: userData?.shopId } as any));
      showToast({ type: 'success', title: 'Stock updated', message: `${editingProduct.name} stock set to ${newStock}.` });
      setShowStockModal(false);
      setEditingProduct(null);
      setNewStock('');
    } catch (err) {
      console.error('Failed to update stock', err);
      showToast({ type: 'error', title: 'Update failed', message: 'Could not update stock. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  if (productsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">Inventory Management</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Track stock levels and inventory value</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2">
          <Download size={20} />
          <span>Export Report</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Products</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{products.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Stock Units</p>
              <p className="text-2xl font-bold text-green-600">{totalUnits.toLocaleString()}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <TrendingUp size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Low Stock Items</p>
              <p className="text-2xl font-bold text-yellow-600">{lowStockItems.length}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle size={24} className="text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Inventory Value</p>
              <p className="text-2xl font-bold text-purple-600">${totalStockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(lowStockItems.length > 0 || outOfStockItems.length > 0) && (
        <div className="space-y-4">
          {outOfStockItems.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={20} className="text-red-600" />
                <h3 className="font-medium text-red-800">Out of Stock Alert</h3>
              </div>
              <p className="text-red-700 mt-1">
                {outOfStockItems.length} product(s) are completely out of stock
              </p>
              <div className="mt-2">
                <details className="text-sm">
                  <summary className="cursor-pointer text-red-800 font-medium">View Out of Stock Items</summary>
                  <div className="mt-2 space-y-1">
                    {outOfStockItems.map(product => (
                      <div key={product.id} className="flex justify-between items-center py-1">
                        <span className="text-red-700">{product.name}</span>
                        <span className="text-red-600 font-medium">0 units</span>
                      </div>
                    ))}
                  </div>
                </details>
              </div>
            </div>
          )}
          
          {lowStockItems.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertTriangle size={20} className="text-yellow-600" />
                <h3 className="font-medium text-yellow-800">Low Stock Alert</h3>
              </div>
              <p className="text-yellow-700 mt-1">
                {lowStockItems.length} product(s) are running low on stock
              </p>
            </div>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:text-gray-100 dark:border-gray-700 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:text-gray-100 dark:border-gray-700 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category} value={category}>{category}</option>
            ))}
          </select>
          <select
            value={stockFilter}
            onChange={(e) => setStockFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:text-gray-100 dark:border-gray-700 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Stock Levels</option>
            <option value="good">In Stock</option>
            <option value="low">Low Stock</option>
            <option value="out">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100 dark:bg-gray-900 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Min Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock Value</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredProducts.map(product => {
                const stockStatus = getStockStatus(product);
                const stockValue = (product.stock || 0) * (product.price || 0);
                
                return (
                  <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <img 
                          src={(Array.isArray(product.images) ? (product.images[0]?.url) : undefined) || 'https://images.pexels.com/photos/3394659/pexels-photo-3394659.jpeg?auto=compress&cs=tinysrgb&w=50'} 
                          alt={product.name}
                          className="w-10 h-10 rounded-lg object-cover mr-3"
                        />
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-100">{product.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">${product.price}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {(product as any).categoryId || '—'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-semibold ${(product.stock || 0) <= 5 ? 'text-red-600' : 'text-gray-800 dark:text-gray-100'}`}>
                        {product.stock} units
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">—</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      ${(product.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-green-600">
                        ${stockValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${stockStatus.color}`}>
                        {stockStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => openStockModal(product)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="Edit stock"
                      >
                        <Edit size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Stock Modal */}
      {showStockModal && editingProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-lg max-w-md w-full mx-4">
            <div className="p-6 border-b flex items-center justify-between dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Edit Stock</h2>
              <button
                onClick={() => { setShowStockModal(false); setEditingProduct(null); setNewStock(''); }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-300">Product</p>
                <p className="font-medium text-gray-800 dark:text-gray-100">{editingProduct.name}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New Stock Quantity</label>
                <input
                  type="number"
                  min="0"
                  value={newStock}
                  onChange={(e) => setNewStock(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  placeholder="Enter stock quantity"
                />
              </div>
            </div>
            <div className="p-6 border-t bg-gray-50 dark:bg-gray-900 dark:border-gray-700 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => { setShowStockModal(false); setEditingProduct(null); setNewStock(''); }}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={handleSaveStock}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
              >
                <Save size={20} />
                <span>{saving ? 'Saving...' : 'Save'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No products found</h3>
          <p className="text-gray-600">Try adjusting your search criteria.</p>
        </div>
      )}
    </div>
  );
};

export default Inventory;