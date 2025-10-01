import React, { useState } from 'react';
import { Plus, Search, Edit, Trash2, Users as UsersIcon, Shield, UserCheck, Save, X, Target, Percent, ToggleLeft, ToggleRight } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useUsers, useShops } from '../hooks/useFirestore';
import { createUserDocument, updateUser, deleteUser } from '../utils/firebaseHelpers';
import { useDialog } from '../contexts/DialogContext';
import { useToast } from '../contexts/ToastContext';

interface UserFormData {
  name: string;
  email: string;
  role: 'shop_admin' | 'staff';
  shopId?: string;
  permissions: string[];
  salesTarget?: number;
  commissionRate?: number;
  phone?: string;
}

interface EditUserFormData {
  name: string;
  email: string;
  role: 'shop_admin' | 'staff';
  shopId?: string;
  permissions: string[];
  salesTarget: number;
  commissionRate: number;
  isActive: boolean;
  phone?: string;
}

const Users: React.FC = () => {
  const { userData } = useAuth();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { data: users, loading: usersLoading } = useUsers(userData?.role === 'shop_admin' ? userData.shopId : undefined);
  const { data: shops } = useShops();
  const { register, handleSubmit, reset, watch, formState: { errors } } = useForm<UserFormData>();
  const { register: registerEdit, handleSubmit: handleSubmitEdit, reset: resetEdit, formState: { errors: editErrors } } = useForm<EditUserFormData>();
  const { confirm } = useDialog();
  const { showToast } = useToast();

  const selectedRole = watch('role');

  const getFilteredUsers = () => {
    if (userData?.role === 'super_admin') {
      return users.filter(user => user.role === 'shop_admin');
    } else if (userData?.role === 'shop_admin') {
      return users.filter(user =>
        user.shopId === userData.shopId && user.role === 'staff'
      );
    } else {
      return []; 
    }
  };

  const onSubmit = async (data: UserFormData) => {
    setLoading(true);
    setError('');

    try {
      const userId = await createUserDocument({
        email: data.email,
        name: data.name,
        role: data.role,
        shopId: userData?.role === 'shop_admin' ? userData.shopId : data.shopId,
        permissions: data.permissions,
        isActive: userData?.role === 'super_admin', // Super admin can create active users, shop admin creates inactive users
        salesTarget: Number(data.salesTarget) || 100,
        commissionRate: Number(data.commissionRate) || 5,
        phone: data.phone || ''
      });

      console.log('User created successfully:', userId);
      reset();
      setShowAddModal(false);
      
      // Show success message
      const statusMessage = userData?.role === 'super_admin' 
        ? 'User created successfully! They can now log in and will be prompted to set up their password.'
        : 'User created successfully! The user will need admin approval to become active and set up their password.';
      showToast({ type: 'success', title: 'User created', message: statusMessage });
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Failed to create user. Please try again.');
      showToast({ type: 'error', title: 'Create failed', message: 'Could not create user.' });
    } finally {
      setLoading(false);
    }
  };

  const onEditSubmit = async (data: EditUserFormData) => {
    setLoading(true);
    setError('');

    try {
      await updateUser(editingUser.id, {
        name: data.name,
        email: data.email,
        role: data.role,
        shopId: userData?.role === 'shop_admin' ? userData.shopId : data.shopId,
        permissions: data.permissions,
        salesTarget: Number(data.salesTarget),
        commissionRate: Number(data.commissionRate),
        isActive: data.isActive,
        phone: data.phone || ''
      });

      showToast({ type: 'success', title: 'User updated', message: 'User details saved successfully.' });
      resetEdit();
      setShowEditModal(false);
      setEditingUser(null);
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user. Please try again.');
      showToast({ type: 'error', title: 'Update failed', message: 'Could not update user.' });
    } finally {
      setLoading(false);
    }
  };

  const handleEditUser = (user: any) => {
    setEditingUser(user);
    resetEdit({
      name: user.name,
      email: user.email,
      role: user.role,
      shopId: user.shopId,
      permissions: user.permissions || [],
      salesTarget: user.salesTarget || 100,
      commissionRate: user.commissionRate || 5,
      isActive: user.isActive,
      phone: user.phone || ''
    });
    setShowEditModal(true);
  };

  const toggleUserStatus = async (userId: string, currentStatus: boolean) => {
    try {
      await updateUser(userId, { isActive: !currentStatus });
      console.log('User status updated successfully');
    } catch (err) {
      console.error('Error updating user status:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    const user = users.find(u => u.id === userId);
    const ok = await confirm({
      title: 'Delete user',
      message: `Are you sure you want to delete ${user?.name || 'this user'}? This action cannot be undone.`,
      tone: 'danger',
      confirmText: 'Delete',
      cancelText: 'Cancel'
    });
    if (ok) {
      try {
        await deleteUser(userId);
        showToast({ type: 'success', title: 'User deleted', message: 'The user has been removed.' });
      } catch (err) {
        console.error('Error deleting user:', err);
        showToast({ type: 'error', title: 'Delete failed', message: 'Could not delete user.' });
      }
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'super_admin': return 'bg-purple-100 text-purple-800';
      case 'shop_admin': return 'bg-blue-100 text-blue-800';
      case 'staff': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'super_admin': return <Shield size={16} className="text-purple-600" />;
      case 'shop_admin': return <UserCheck size={16} className="text-blue-600" />;
      case 'staff': return <UsersIcon size={16} className="text-green-600" />;
      default: return <UsersIcon size={16} className="text-gray-600" />;
    }
  };

  // Apply role-based filtering
  const roleFilteredUsers = getFilteredUsers().filter(user => {
    const matchesSearch = (user.name?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
      (user.email?.toLowerCase() || '').includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && user.isActive) || 
      (statusFilter === 'inactive' && !user.isActive);
    return matchesSearch && matchesRole && matchesStatus;
  }).sort((a, b) => {
    const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt);
    const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt);
    return dateB.getTime() - dateA.getTime();
  });

  const canManageUser = (user: any) => {
    if (userData?.role === 'super_admin') {
      return user.role === 'shop_admin'; // Super admin can only manage shop admins
    } else if (userData?.role === 'shop_admin') {
      return user.shopId === userData.shopId && user.role === 'staff'; // Shop admin can only manage their staff
    }
    return false;
  };

  // Show message if staff tries to access users page
  if (userData?.role === 'staff') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-800">User Management</h1>
            <p className="mt-1 text-gray-600">Access restricted</p>
          </div>
        </div>
        <div className="text-center py-12">
          <UsersIcon size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 mb-2">Access Restricted</h3>
          <p className="text-gray-600">You don't have permission to view user management.</p>
        </div>
      </div>
    );
  }

  if (usersLoading) {
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
          <h1 className="text-3xl font-bold text-gray-800 dark:text-gray-100">User Management</h1>
          <p className="mt-1 text-gray-600 dark:text-gray-300">
            {userData?.role === 'super_admin'
              ? 'Manage shop administrators and assign them to businesses'
              : 'Manage your shop staff members'
            }
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
        >
          <Plus size={20} />
          <span>Add User</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Users</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-gray-100">{roleFilteredUsers.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <UsersIcon size={24} className="text-blue-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Active Users</p>
              <p className="text-2xl font-bold text-green-600">
                {roleFilteredUsers.filter(u => u.isActive).length}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <UserCheck size={24} className="text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Inactive Users</p>
              <p className="text-2xl font-bold text-red-600">
                {roleFilteredUsers.filter(u => !u.isActive).length}
              </p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <Shield size={24} className="text-red-600" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-6 dark:bg-gray-800 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium ttext-gray-600 dark:text-gray-300">
                {userData?.role === 'super_admin' ? 'Shop Admins' : 'Staff Members'}
              </p>
              <p className="text-2xl font-bold text-purple-600">
                {userData?.role === 'super_admin'
                  ? roleFilteredUsers.filter(u => u.role === 'shop_admin').length
                  : roleFilteredUsers.filter(u => u.role === 'staff').length
                }
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <UsersIcon size={24} className="text-purple-600" />
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
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            />
          </div>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
          >
            <option value="all">All Roles</option>
            {userData?.role === 'super_admin' && <option value="shop_admin">Shop Admin</option>}
            {userData?.role === 'shop_admin' && <option value="staff">Staff</option>}
          </select>
          {userData?.role === 'super_admin' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
            >
              <option value="all">All Status</option>
              <option value="active">Active Only</option>
              <option value="inactive">Inactive Only</option>
            </select>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden dark:bg-gray-800 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100 dark:bg-gray-900 dark:border-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Role</th>
                {userData?.role === 'super_admin' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Business</th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider dark:text-gray-300">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
              {roleFilteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-blue-600 font-medium text-sm">
                        {user?.name ? user.name.split(' ').map(n => n[0]).join('') : '?'}
                        </span>
                      </div>
                      <div className="ml-4">
                        <p className="font-medium text-gray-800 dark:text-gray-100">{user.name}</p>
                        <p className="text-sm text-gray-600 dark:text-gray-300">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="ml-1 capitalize">{user.role.replace('_', ' ')}</span>
                    </span>
                  </td>
                  {userData?.role === 'super_admin' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                      {user.shopId ? (
                        <div>
                          <p className="font-medium text-gray-800 dark:text-gray-100">
                            {shops.find(shop => shop.id === user.shopId)?.name || 'Unknown Business'}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{user.shopId}</p>
                        </div>
                      ) : (
                        <span className="text-gray-400">No business assigned</span>
                      )}
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                      {userData?.role === 'super_admin' && (
                        <button
                          onClick={() => toggleUserStatus(user.id, user.isActive)}
                          className={`p-1 rounded transition-colors ${user.isActive
                              ? 'text-green-600 hover:text-green-800'
                              : 'text-red-600 hover:text-red-800'
                            }`}
                          title={user.isActive ? 'Deactivate user' : 'Activate user'}
                        >
                          {user.isActive ? <ToggleRight size={16} /> : <ToggleLeft size={16} />}
                        </button>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 dark:text-gray-300">
                    {user.createdAt ? (
                      user.createdAt instanceof Date
                        ? user.createdAt.toLocaleDateString()
                        : new Date(user.createdAt).toLocaleDateString()
                    ) : 'N/A'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex space-x-2">
                      {canManageUser(user) && (
                        <>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit user"
                          >
                            <Edit size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete user"
                          >
                            <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b">
              <h2 className="text-xl font-semibold text-gray-800">Add New User</h2>
            </div>

            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    {...register('name', { required: 'Full name is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    {...register('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <p className="mt-1 text-sm text-red-600">{errors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    {...register('role', { required: 'Role is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select role...</option>
                    {userData?.role === 'super_admin' && (
                      <option value="shop_admin">Shop Admin</option>
                    )}
                    {userData?.role === 'shop_admin' && (
                      <option value="staff">Staff</option>
                    )}
                  </select>
                  {errors.role && (
                    <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    {...register('phone')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              {userData?.role === 'super_admin' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Business Assignment</label>
                  <select
                    {...register('shopId', {
                      required: selectedRole === 'shop_admin' || selectedRole === 'staff' ? 'Business assignment is required' : false
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="">Select business...</option>
                    {shops.map(shop => (
                      <option key={shop.id} value={shop.id}>{shop.name}</option>
                    ))}
                  </select>
                  {errors.shopId && (
                    <p className="mt-1 text-sm text-red-600">{errors.shopId.message}</p>
                  )}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Target size={16} className="mr-1" />
                    Sales Target (monthly)
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...register('salesTarget')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="100"
                    defaultValue="100"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Percent size={16} className="mr-1" />
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    {...register('commissionRate')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="5.0"
                    defaultValue="5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="manage_products"
                      {...register('permissions')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Manage Products</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="create_invoices"
                      {...register('permissions')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Create Invoices</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="manage_supplies"
                      {...register('permissions')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Manage Supplies</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="view_reports"
                      {...register('permissions')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">View Reports</span>
                  </label>
                </div>
              </div>
            </form>

            <div className="p-6 border-t bg-gray-50 flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setShowAddModal(false);
                  reset();
                  setError('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                onClick={handleSubmit(onSubmit)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {loading ? 'Creating...' : 'Add User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && editingUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-800">Edit User</h2>
              <button
                onClick={() => {
                  setShowEditModal(false);
                  setEditingUser(null);
                  resetEdit();
                  setError('');
                }}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmitEdit(onEditSubmit)} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    {...registerEdit('name', { required: 'Full name is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                  {editErrors.name && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    {...registerEdit('email', {
                      required: 'Email is required',
                      pattern: {
                        value: /^\S+@\S+$/i,
                        message: 'Invalid email address'
                      }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                  />
                  {editErrors.email && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.email.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select
                    {...registerEdit('role', { required: 'Role is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={userData?.role !== 'super_admin'}
                  >
                    <option value="">Select role...</option>
                    {userData?.role === 'super_admin' && <option value="shop_admin">Shop Admin</option>}
                    {userData?.role === 'shop_admin' && <option value="staff">Staff</option>}
                  </select>
                  {editErrors.role && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.role.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    {...registerEdit('phone')}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter phone number"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select
                    {...registerEdit('isActive', { setValueAs: (v) => v === 'true' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={userData?.role !== 'super_admin'}
                  >
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                {userData?.role === 'super_admin' && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Business Assignment</label>
                    <select
                      {...registerEdit('shopId')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="">Select business...</option>
                      {shops.map(shop => (
                        <option key={shop.id} value={shop.id}>{shop.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Target size={16} className="mr-1" />
                    Sales Target (monthly)
                  </label>
                  <input
                    type="number"
                    min="0"
                    {...registerEdit('salesTarget', { required: 'Sales target is required', min: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="100"
                  />
                  {editErrors.salesTarget && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.salesTarget.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    <Percent size={16} className="mr-1" />
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    {...registerEdit('commissionRate', { required: 'Commission rate is required', min: 0, max: 100 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="5.0"
                  />
                  {editErrors.commissionRate && (
                    <p className="mt-1 text-sm text-red-600">{editErrors.commissionRate.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="manage_products"
                      {...registerEdit('permissions')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Manage Products</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="create_invoices"
                      {...registerEdit('permissions')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Create Invoices</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="manage_supplies"
                      {...registerEdit('permissions')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Manage Supplies</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      value="view_reports"
                      {...registerEdit('permissions')}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">View Reports</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                    resetEdit();
                    setError('');
                  }}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                >
                  <Save size={20} />
                  <span>{loading ? 'Updating...' : 'Update User'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;