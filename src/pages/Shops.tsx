import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Store, Users, CheckCircle, Clock, AlertCircle, ToggleLeft, ToggleRight, Building2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchShops } from '../features/shops/shopsSlice';
import { shopsApi } from '../services/apiClient';
import { format } from 'date-fns';
// Email sending via Mailtrap REST API
import { useDialog } from '../contexts/DialogContext';
import { useToast } from '../contexts/ToastContext';

interface ShopFormData {
  name: string;
  address: string;
  phone: string;
  vatRate: string;
  currency: string;
  isActive: boolean;
}

const Shops: React.FC = () => {
  const { userData } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingShop, setEditingShop] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const dispatch = useAppDispatch();
  const shops = useAppSelector(s => s.shops.items as any[]);
  const shopsLoading = useAppSelector(s => s.shops.loading);
  const users: any[] = [];
  React.useEffect(() => { dispatch(fetchShops()); }, [dispatch]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ShopFormData>({
    defaultValues: {
      currency: 'USD',
      vatRate: '10',
      isActive: true
    }
  });
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, formState: { errors: editErrors } } = useForm<ShopFormData>();
  const { confirm } = useDialog();
  const { showToast } = useToast();

  const sendShopApprovalEmail = async (params: { toEmail: string; toName?: string; shopName: string; }) => {
    try {
      const res = await fetch('/api/send-approval', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toEmail: params.toEmail, toName: params.toName, shopName: params.shopName })
      });
      if (!res.ok) {
        const body = await res.text();
        throw new Error(`API send failed: ${res.status} ${body}`);
      }
      console.log('Approval email sent via API');
    } catch (err) {
      console.error('Failed to send approval email via API:', err);
    }
  };

  // Only super admin can access this page


  const onSubmit = async (data: ShopFormData) => {
    setLoading(true);
    setError('');
    
    try {
      if (editingShop) {
        await shopsApi.update(editingShop._id          , {
          name: data.name,
          description: `${data.address} | ${data.phone} | VAT ${data.vatRate}% | ${data.currency}`,
        });
        await dispatch(fetchShops());
        showToast({ type: 'success', title: 'Business updated', message: 'The business details were saved successfully.' });
        setEditingShop(null);
        setShowEditModal(false);
      } else {
        await shopsApi.create({ name: data.name, description: `${data.address} | ${data.phone} | VAT ${data.vatRate}% | ${data.currency}` });
        await dispatch(fetchShops());
        showToast({ type: 'success', title: 'Business created', message: 'The business has been added.' });
        setShowAddModal(false);
      }
      
      reset();
    } catch (err) {
      console.error('Error saving shop:', err);
      setError('Failed to save shop. Please try again.');
      showToast({ type: 'error', title: 'Save failed', message: 'Could not save the business. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const onEditSubmit = async (data: ShopFormData) => {
    setLoading(true);
    setError('');
    
    try {
      await shopsApi.update(editingShop._id
        , { name: data.name, description: `${data.address} | ${data.phone} | VAT ${data.vatRate}% | ${data.currency}` });
      await dispatch(fetchShops());
      
      showToast({ type: 'success', title: 'Business updated', message: 'The business details were saved successfully.' });
      resetEdit();
      setShowEditModal(false);
      setEditingShop(null);
    } catch (err) {
      console.error('Error updating shop:', err);
      setError('Failed to update shop. Please try again.');
      showToast({ type: 'error', title: 'Update failed', message: 'Could not update the business.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditShop = (shop: any) => {
    setEditingShop(shop);
    resetEdit({
      name: shop.name,
      address: shop.address,
      phone: shop.phone,
      vatRate: shop.vatRate?.toString() || '10',
      currency: shop.currency || 'USD',
      isActive: shop.isActive
    });
    setShowEditModal(true);
  };

  const toggleShopStatus = async (shopId: string, currentStatus: boolean) => {
    try {
      await shopsApi.update(shopId, { status: !currentStatus ? 'approved' : 'rejected' } as any);
      await dispatch(fetchShops());
      
      // If activating a shop, assign its admin and ensure active
      if (!currentStatus) {
        const shop = shops.find(s => s.id === shopId);
        let admin = shop?.adminId ? users.find(u => u.id === shop.adminId) : undefined;
        if (!admin) {
          admin = users.find(u => u.shopId === shopId && u.role === 'shop_admin');
        }
        if (admin) {
          showToast({ type: 'success', title: 'Business approved', message: 'Assigned admin and activated the business.' });
          // Send approval email to the admin
          if (admin.email) {
            await sendShopApprovalEmail({ toEmail: admin.email, toName: admin.name, shopName: shop?.name || 'Your Business' });
          }
        }
      }
      
      if (currentStatus) {
        showToast({ type: 'info', title: 'Business deactivated', message: 'The business is now inactive.' });
      }
    } catch (err) {
      console.error('Error updating shop status:', err);
      showToast({ type: 'error', title: 'Status update failed', message: 'Could not update business status.' });
    }
  };

  const handleDeleteShop = async (shopId: string) => {
    const shop = shops.find(s => s.id === shopId);
    const shopUsers = users.filter(user => user.shopId === shopId);
    
    const confirmMessage = shopUsers.length > 0 
      ? `This will also affect ${shopUsers.length} user(s) associated with this business.`
      : 'This action cannot be undone.';

    const ok = await confirm({
      title: 'Delete business',
      message: `${shop?.name || 'This business'} will be permanently deleted. ${confirmMessage}`,
      tone: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });

    if (ok) {
      try {
        await shopsApi.delete(shopId);
        await dispatch(fetchShops());
        showToast({ type: 'success', title: 'Business deleted', message: 'The business was removed.' });
      } catch (err) {
        console.error('Error deleting shop:', err);
        showToast({ type: 'error', title: 'Delete failed', message: 'Could not delete the business.' });
      }
    }
  };

  const getShopAdmin = (shop: any) => {
    return users.find(user => user.shopId === shop._id && user.role === 'shop_admin');
  };

  const filteredShops = Array.isArray(shops)
  ? shops
      .filter(shop => {
        const name = shop?.name?.toLowerCase() || "";
        const address = shop?.address?.toLowerCase() || "";
        const matchesSearch =
          name.includes(searchQuery.toLowerCase()) ||
          address.includes(searchQuery.toLowerCase());

        const matchesStatus =
          statusFilter === "all" ||
          (statusFilter === "active" && shop.isActive) ||
          (statusFilter === "inactive" && !shop.isActive) ||
          (statusFilter === "pending" && !shop.isActive);

        return matchesSearch && matchesStatus;
      })
      .sort((a, b) => {
        const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
        const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
        return dateB.getTime() - dateA.getTime();
      })
  : [];

  const shopList = Array.isArray(shops) ? shops : [];

  const activeShops = shopList.filter(shop => shop.status === 'approved').length;
  const pendingShops = shopList.filter(
    shop => shop.status === 'pending' || shop.status === 'rejected'
  ).length;
  const totalShops = shopList.length;
  const totalUsers = users.filter(user => shops.some(shop => shop.id === user.shopId)).length;

  if (shopsLoading) {
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
          <h1 className="text-3xl font-bold text-gray-800">Business Management</h1>
          <p className="mt-1 text-gray-600">Manage all registered businesses, onboarding, and approvals</p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Add Business</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Businesses</p>
              <p className="text-2xl font-bold text-blue-600">{totalShops}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Building2 size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Businesses</p>
              <p className="text-2xl font-bold text-green-600">{activeShops}</p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Onboarding</p>
              <p className="text-2xl font-bold text-orange-600">{pendingShops}</p>
            </div>
            <div className="p-3 bg-orange-100 rounded-lg">
              <Clock size={24} className="text-orange-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Users</p>
              <p className="text-2xl font-bold text-purple-600">{totalUsers}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Users size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Pending Onboarding Alert */}
      {pendingShops > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle size={20} className="text-orange-600" />
            <h3 className="font-medium text-orange-800">Businesses Awaiting Onboarding</h3>
          </div>
          <p className="text-orange-700 mt-1">
            {pendingShops} business(es) have registered and are waiting for approval
          </p>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="Search businesses..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending Onboarding</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Businesses Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100 dark:bg-gray-900 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Business</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Admin</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Registered</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {filteredShops.map(shop => {
                const admin = getShopAdmin(shop);
                const userCount = users.filter(user => user.shopId === shop._id).length;
                
                return (
                  <tr key={shop.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <Building2 size={20} className="text-blue-600" />
                        </div>
                        <div className="ml-4">
                          <p className="font-medium text-gray-800 dark:text-gray-100">{shop.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{shop.phone}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{userCount} user(s)</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {admin ? (
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-100">{admin.name}</p>
                          <p className="text-sm text-gray-600 dark:text-gray-300">{admin.email}</p>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            admin.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {admin.isActive ? 'Active' : 'Inactive'}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-500 dark:text-gray-400">No admin assigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                      <span
  className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
    shop.status === 'approved'
      ? 'bg-green-100 text-green-800'
      : 'bg-red-100 text-red-800'
  }`}
>
  {shop.status === 'approved' ? 'Approved' : 'Pending'}
</span>

<button
  onClick={() => toggleShopStatus(shop._id, shop.status === 'approved')}
  className={`p-1 rounded transition-colors ${
    shop.status === 'approved'
      ? 'text-green-600 hover:text-green-800'
      : 'text-red-600 hover:text-red-800'
  }`}
  title={shop.status === 'approved' ? 'Reject business' : 'Approve business'}
>
  {shop.status === 'approved' ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
</button>

                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {shop.createdAt ? format(
                        shop.createdAt instanceof Date ? shop.createdAt : new Date(shop.createdAt), 
                        'MMM dd, yyyy'
                      ) : 'Unknown'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      <div className="max-w-xs truncate" title={shop.address}>
                        {shop.address}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditShop(shop)}
                          className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                          title="Edit business"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => handleDeleteShop(shop.id)}
                          className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete business"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {filteredShops.length === 0 && (
        <div className="text-center py-12">
          <Building2 size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">No businesses found</h3>
          <p className="text-gray-600">
            {statusFilter === 'pending' 
              ? "No businesses are currently pending onboarding."
              : "Try adjusting your search criteria or add a new business."
            }
          </p>
        </div>
      )}

      {/* Add Business Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Add New Business</h2>
            </div>
            
            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  {...register('name', { required: 'Business name is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter business name"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  rows={3}
                  {...register('address', { required: 'Address is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter business address"
                />
                {errors.address && (
                  <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    {...register('phone', { required: 'Phone number is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    placeholder="Enter phone number"
                  />
                  {errors.phone && (
                    <p className="mt-1 text-sm text-red-600">{errors.phone.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    {...register('currency')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="KSH">KSH (KSh)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    {...register('vatRate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    {...register('isActive')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  >
                    <option value="true">Active</option>
                    <option value="false">Pending Onboarding</option>
                  </select>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-blue-700">
                  <strong>Note:</strong> After creating the business, you can assign an administrator by creating a new user with the "Shop Admin" role and linking them to this business.
                </p>
              </div>
            </form>

            <div className="p-6 border-t bg-gray-50 dark:bg-gray-900 dark:border-gray-700 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
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
                onClick={handleSubmit(onSubmit)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Create Business'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Business Modal */}
      {showEditModal && editingShop && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Edit Business</h2>
            </div>
            
            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}
            
            <form onSubmit={handleSubmitEdit(onEditSubmit)} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <input
                  type="text"
                  {...registerEdit('name', { required: 'Business name is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter business name"
                />
                {editErrors.name && (
                  <p className="mt-1 text-sm text-red-600">{editErrors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
                <textarea
                  rows={3}
                  {...registerEdit('address', { required: 'Address is required' })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter business address"
                />
                {editErrors.address && (
                  <p className="mt-1 text-sm text-red-600">{editErrors.address.message}</p>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    {...registerEdit('phone', { required: 'Phone number is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                  {editErrors.phone && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.phone.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
                  <select
                    {...registerEdit('currency')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="KSH">KSH (KSh)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">VAT Rate (%)</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    {...registerEdit('vatRate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="10"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    {...registerEdit('isActive')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  >
                    <option value="true">Active</option>
                    <option value="false">Pending Onboarding</option>
                  </select>
                </div>
              </div>
            </form>

            <div className="p-6 border-t bg-gray-50 dark:bg-gray-900 dark:border-gray-700 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowEditModal(false);
                  setEditingShop(null);
                  resetEdit();
                  setError('');
                }}
                className="px-4 py-2 text-gray-700 dark:text-gray-200 bg-white dark:bg-transparent border border-gray-300 dark:border-gray-700 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
              >
                Cancel
              </button>
              <button 
                type="submit"
                disabled={loading}
                onClick={handleSubmitEdit(onEditSubmit)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Updating...' : 'Update Business'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Shops;