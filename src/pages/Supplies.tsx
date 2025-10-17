import React, { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Truck, Package, Calendar, DollarSign, Edit, Trash2, Save, X } from 'lucide-react';
import { format } from 'date-fns';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchSupplies } from '../features/supplies/suppliesSlice';
import { fetchProducts } from '../features/products/productsSlice';
import { suppliesApi, productsApi } from '../services/apiClient';
import { Supply } from '../types';
import { useDialog } from '../contexts/DialogContext';
import { useToast } from '../contexts/ToastContext';

interface SupplyFormData {
  supplierName: string;
  productId: string;
  quantity: number;
  unitCost: number;
  receivedAt: string;
  status: 'received' | 'pending' | 'cancelled';
  notes: string;
}

const Supplies: React.FC = () => {
  const { userData } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingSupply, setEditingSupply] = useState<any | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [showLoadMore, setShowLoadMore] = useState(false);
  const dispatch = useAppDispatch();
  const supplies = useAppSelector(s => s.supplies.items as any[]);
  const suppliesLoading = useAppSelector(s => s.supplies.loading);
  const products = useAppSelector(s => s.products.items as any[]);
  useEffect(() => {
    dispatch(fetchProducts({ shopId: userData?.shopId } as any));
    dispatch(fetchSupplies({ shopId: userData?.shopId }));

  }, [dispatch, userData?.shopId]);
  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<SupplyFormData>();
  const { confirm } = useDialog();
  const { showToast } = useToast();

  const watchedQuantity = watch('quantity');
  const watchedUnitCost = watch('unitCost');
  const totalCost = (watchedQuantity || 0) * (watchedUnitCost || 0);

  // Memoize filtered supplies for better performance
  const filteredSupplies = useMemo(() => {
    if (!Array.isArray(supplies)) return [];
  
    return supplies
      .filter(supply => {
        const s: any = supply || {};
        const matchesSearch =
          (s.supplierName || s.supplier || '')
            .toLowerCase()
            .includes(searchQuery.toLowerCase()) ||
          (s.productName || '')
            .toLowerCase()
            .includes(searchQuery.toLowerCase());
  
        const matchesStatus =
          statusFilter === 'all' ||
          (s.status || 'received') === statusFilter;
  
        return matchesSearch && matchesStatus;
      })
      .sort((a: any, b: any) => {
        const dateA =
          a.receivedAt instanceof Date ? a.receivedAt : new Date(a.receivedAt);
        const dateB =
          b.receivedAt instanceof Date ? b.receivedAt : new Date(b.receivedAt);
        return dateB.getTime() - dateA.getTime();
      });
  }, [supplies, searchQuery, statusFilter]);
  

  // Show load more button if we have exactly 50 supplies (the limit)
  useEffect(() => {
    if (Array.isArray(supplies)) {
      setShowLoadMore(supplies.length === 50);
    } else {
      setShowLoadMore(false);
    }
  }, [supplies]);
  

  const onSubmit = async (data: SupplyFormData) => {
    setLoading(true);
    setError('');
    
    try {
      const product = products.find(p => p._id === data.productId);
      if (!product) {
        throw new Error('Product not found');
      }

      const supplyData = {
        supplierName: data.supplierName,
        shopId: userData?.shopId || 'default',
        receivedAt: new Date(data.receivedAt).toISOString(),
        createdBy: userData?.id || 'unknown',
      
        // Backend expects this
        items: [
          {
            productId: data.productId,
            productName: product.name,
            quantity: Number(data.quantity),
            unitCost: Number(data.unitCost),
            totalCost: Number(data.quantity) * Number(data.unitCost),
            status: data.status,
            notes: data.notes,
          },
        ],
      };
      

      if (editingSupply) {
        // Handle stock changes when editing supply
        const originalStatus = (editingSupply as any).status;
        const originalQuantity = (editingSupply as any).quantity;
        const newStatus = data.status;
        const newQuantity = Number(data.quantity);
        
        let stockChange = 0;
        
        // Calculate stock change based on status transitions
        if (originalStatus === 'received' && newStatus === 'pending') {
          // Remove stock when changing from received to pending
          stockChange = -originalQuantity;
          console.log(`Removing ${originalQuantity} units from stock (received → pending)`);
        } else if (originalStatus === 'received' && newStatus === 'cancelled') {
          // Remove stock when changing from received to cancelled
          stockChange = -originalQuantity;
          console.log(`Removing ${originalQuantity} units from stock (received → cancelled)`);
        } else if (originalStatus === 'pending' && newStatus === 'received') {
          // Add stock when changing from pending to received
          stockChange = newQuantity;
          console.log(`Adding ${newQuantity} units to stock (pending → received)`);
        } else if (originalStatus === 'cancelled' && newStatus === 'received') {
          // Add stock when changing from cancelled to received
          stockChange = newQuantity;
          console.log(`Adding ${newQuantity} units to stock (cancelled → received)`);
        } else if (originalStatus === 'received' && newStatus === 'received') {
          // Adjust stock when quantity changes but status remains received
          stockChange = newQuantity - originalQuantity;
          if (stockChange !== 0) {
            console.log(`Adjusting stock by ${stockChange} units (quantity change while received)`);
          }
        }
        
        // Update supply record
        await suppliesApi.update(editingSupply.id, supplyData as any);
        
        // Update product stock if there's a change
        if (stockChange !== 0) {
          const newStock = product.stock + stockChange;
          if (newStock < 0) {
            throw new Error(`Cannot reduce stock below 0. Current stock: ${product.stock}, attempted reduction: ${Math.abs(stockChange)}`);
          }
          
          await productsApi.update(data.productId, { stock: newStock } as any);
          console.log(`Stock updated: ${product.stock} → ${newStock} for ${product.name}`);
        }
        
        showToast({ type: 'success', title: 'Supply updated', message: 'Supply details saved successfully.' });
      } else {
        // Add new supply record
        await suppliesApi.create(supplyData as any);
        
        // Only add to stock if supply status is "received"
        if (data.status === 'received') {
          await productsApi.update(data.productId, { stock: product.stock + Number(data.quantity) } as any);
          console.log(`Added ${data.quantity} units to stock for ${product.name} (new supply received)`);
        } else {
          console.log(`Supply added as ${data.status} - no stock change for ${product.name}`);
        }
        
        showToast({ type: 'success', title: 'Supply added', message: 'New supply record has been added.' });
      }
      
      reset();
      setShowAddModal(false);
      setEditingSupply(null);
    } catch (err: any) {
      console.error('Error saving supply:', err);
      setError(err.message || 'Failed to save supply. Please try again.');
      showToast({ type: 'error', title: 'Save failed', message: 'Could not save supply.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (supply: any) => {
    setEditingSupply(supply);
    reset({
      supplierName: supply.supplierName,
      productId: supply.productId,
      quantity: supply.quantity,
      unitCost: supply.unitCost,
      receivedAt: format(supply.receivedAt, 'yyyy-MM-dd'),
      status: supply.status,
      notes: supply.notes || ''
    });
    setShowAddModal(true);
  };

  const handleDelete = async (supplyId: string) => {
    const ok = await confirm({ title: 'Delete supply', message: 'Are you sure you want to delete this supply record? This action cannot be undone.', tone: 'danger', confirmText: 'Delete', cancelText: 'Cancel' });
    if (ok) {
      try {
        await suppliesApi.delete(supplyId);
        await dispatch(fetchSupplies({}));
        showToast({ type: 'success', title: 'Supply deleted', message: 'The supply record has been removed.' });
      } catch (err) {
        console.error('Error deleting supply:', err);
        showToast({ type: 'error', title: 'Delete failed', message: 'Could not delete supply.' });
      }
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalCostSum = Array.isArray(supplies)
  ? supplies.reduce((sum, supply) => sum + (supply.totalCost || 0), 0)
  : 0;

const receivedSupplies = Array.isArray(supplies)
  ? supplies.filter(s => (s as any).status === 'received').length
  : 0;

const pendingSupplies = Array.isArray(supplies)
  ? supplies.filter(s => (s as any).status === 'pending').length
  : 0;


  if (suppliesLoading) {
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
          <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Supply Management</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">Track inventory supplies and manage suppliers</p>
        </div>
        <button
          onClick={() => {
            setEditingSupply(null);
            reset({
              receivedAt: format(new Date(), 'yyyy-MM-dd'),
              status: 'received'
            });
            setShowAddModal(true);
          }}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Add Supply</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Supplies</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">
  {Array.isArray(supplies) ? supplies.length : 0}
</p>

            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Received</p>
              <p className="text-2xl font-bold text-green-600">{receivedSupplies}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Truck size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{pendingSupplies}</p>
            </div>
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Calendar size={24} className="text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Cost</p>
              <p className="text-2xl font-bold text-purple-600">${totalCostSum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search supplies..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 dark:text-gray-100 dark:border-gray-700 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="received">Received</option>
            <option value="pending">Pending</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Supplies Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100 dark:bg-gray-900 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Quantity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Unit Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Total Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredSupplies.map(supply => (
                <tr key={(supply as any).id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Truck size={20} className="text-blue-600" />
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-800 dark:text-gray-100">{supply.supplierName}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-medium text-gray-800 dark:text-gray-100">{supply.productName}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-gray-800 dark:text-gray-100">{supply.quantity} units</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="text-gray-800 dark:text-gray-100">${supply.unitCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <p className="font-semibold text-gray-800 dark:text-gray-100">${supply.totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(supply.status)}`}>
                      {supply.status.charAt(0).toUpperCase() + supply.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {format(supply.receivedAt, 'MMM dd, yyyy')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      <button 
                        onClick={() => handleEdit(supply)}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete((supply as any).id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Load More Button */}
      {showLoadMore && (
        <div className="text-center">
          <p className="text-sm text-gray-600 mb-4">
            Showing recent 50 supply records. For older records, use the search or filter options.
          </p>
        </div>
      )}

      {filteredSupplies.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No supplies found</h3>
          <p className="text-gray-600">Add your first supply record to get started.</p>
        </div>
      )}

      {/* Add/Edit Supply Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                {editingSupply ? 'Edit Supply' : 'Add New Supply'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingSupply(null);
                  reset();
                  setError('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name</label>
                  <input
                    type="text"
                    {...register('supplierName', { required: 'Supplier name is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter supplier name"
                  />
                  {errors.supplierName && (
                    <p className="mt-1 text-sm text-red-600">{errors.supplierName.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                  <select 
  {...register('productId', { required: 'Product is required' })}
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
>
  <option value="">Select product...</option>
  {products.map(product => (
    <option key={product._id} value={product._id}>{product.name}</option>
  ))}
</select>
                  {errors.productId && (
                    <p className="mt-1 text-sm text-red-600">{errors.productId.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                  <input
                    type="number"
                    min="1"
                    {...register('quantity', { required: 'Quantity is required', min: 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0"
                    onChange={(e) => setValue('quantity', Number(e.target.value))}
                  />
                  {errors.quantity && (
                    <p className="mt-1 text-sm text-red-600">{errors.quantity.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    {...register('unitCost', { required: 'Unit cost is required', min: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="0.00"
                    onChange={(e) => setValue('unitCost', Number(e.target.value))}
                  />
                  {errors.unitCost && (
                    <p className="mt-1 text-sm text-red-600">{errors.unitCost.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={totalCost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    readOnly
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Received Date</label>
                  <input
                    type="date"
                    {...register('receivedAt', { required: 'Received date is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  />
                  {errors.receivedAt && (
                    <p className="mt-1 text-sm text-red-600">{errors.receivedAt.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select 
                    {...register('status', { required: 'Status is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  >
                    <option value="received">Received</option>
                    <option value="pending">Pending</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                  {errors.status && (
                    <p className="mt-1 text-sm text-red-600">{errors.status.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows={3}
                  {...register('notes')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  placeholder="Additional notes about this supply..."
                ></textarea>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingSupply(null);
                    reset();
                    setError('');
                  }}
                  className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <Save size={20} />
                  <span>{loading ? 'Saving...' : editingSupply ? 'Update Supply' : 'Add Supply'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Supplies;