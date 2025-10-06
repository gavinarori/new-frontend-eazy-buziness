import React, { useState, useEffect } from 'react';
import { Plus, Search, Edit, Trash2, Package, AlertCircle, Save, X, Tag } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { useAuth } from '../contexts/AuthContext';
import { useDialog } from '../contexts/DialogContext';
import { useToast } from '../contexts/ToastContext';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchProducts } from '../features/products/productsSlice';
import { fetchCategories } from '../features/categories/categoriesSlice';
import { productsApi, categoriesApi } from '../services/apiClient';
import type { Product } from '../types';

interface ProductFormData {
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  cost: number;
  stock: number;
  minStock: number;
  image?: File;
}

interface CategoryFormData {
  name: string;
}

const Products: React.FC = () => {
  const { userData } = useAuth();
  const dispatch = useAppDispatch();
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(false);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [error, setError] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [imagePreview, setImagePreview] = useState<string>('');
  const [imageUploading, setImageUploading] = useState(false);

  const products = useAppSelector((s) => s.products.items);
  const productsLoading = useAppSelector((s) => s.products.loading);
  const categories = useAppSelector((s) => s.categories.items);

  useEffect(() => {
    dispatch(fetchProducts({ shopId: userData?.shopId } as any));
    dispatch(fetchCategories());
  }, [dispatch, userData?.shopId]);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<ProductFormData>();
  const { register: registerCategory, handleSubmit: handleSubmitCategory, reset: resetCategory, formState: { errors: categoryErrors } } = useForm<CategoryFormData>();
  const { confirm } = useDialog();
  const { showToast } = useToast();

  // Force refresh products data when component mounts
  useEffect(() => {
    console.log('Products data updated:', products.length, 'products loaded');
  }, [products]);

  // Convert file to base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size must be less than 2MB');
        return;
      }
      
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setImageUploading(true);
      try {
        const base64 = await convertToBase64(file);
        setImagePreview(base64);
        setError('');
      } catch (err) {
        setError('Failed to process image');
      } finally {
        setImageUploading(false);
      }
    }
  };

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    setError('');
    
    try {
      // Use uploaded image or default image
      const imageUrl = imagePreview || 'https://images.pexels.com/photos/3394659/pexels-photo-3394659.jpeg?auto=compress&cs=tinysrgb&w=400';

      const productData = {
        name: data.name,
        description: data.description,
        sku: data.sku,
        price: Number(data.price),
        stock: Number(data.stock),
        images: [{ url: imageUrl, publicId: '' }],
        shopId: userData?.shopId || 'default',
        // Map category by id if provided
        categoryId: data.category || undefined,
      } as any;

      if (editingProduct) {
        await productsApi.update(editingProduct.id, productData);
        await dispatch(fetchProducts({ shopId: userData?.shopId } as any));
        showToast({ type: 'success', title: 'Product updated', message: 'Product details saved successfully.' });
      } else {
        await productsApi.create(productData);
        await dispatch(fetchProducts({ shopId: userData?.shopId } as any));
        showToast({ type: 'success', title: 'Product added', message: 'New product has been added.' });
      }
      
      reset();
      setShowAddModal(false);
      setEditingProduct(null);
      setImagePreview('');
    } catch (err) {
      console.error('Error saving product:', err);
      setError('Failed to save product. Please try again.');
      showToast({ type: 'error', title: 'Save failed', message: 'Could not save product. Try again.' });
    } finally {
      setLoading(false);
    }
  };

  const onCategorySubmit = async (data: CategoryFormData) => {
    setCategoryLoading(true);
    setCategoryError('');
    
    try {
      await categoriesApi.create({ name: data.name, shopId: userData?.shopId || 'default' } as any);
      await dispatch(fetchCategories());
      
      showToast({ type: 'success', title: 'Category added', message: 'New category has been added.' });
      resetCategory();
      setShowCategoryModal(false);
    } catch (err) {
      console.error('Error adding category:', err);
      setCategoryError('Failed to add category. Please try again.');
      showToast({ type: 'error', title: 'Add failed', message: 'Could not add category.' });
    } finally {
      setCategoryLoading(false);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setImagePreview(product.images?.[0] || product.image || '');
    reset({
      name: product.name,
      description: product.description,
      sku: product.sku,
      category: product.category,
      price: product.price,
      cost: product.cost,
      stock: product.stock,
      minStock: product.minStock
    });
    setShowAddModal(true);
  };

  const handleDelete = async (productId: string) => {
    const ok = await confirm({ title: 'Delete product', message: 'Are you sure you want to delete this product? This action cannot be undone.', tone: 'danger', confirmText: 'Delete', cancelText: 'Cancel' });
    if (ok) {
      try {
        await productsApi.delete(productId);
        await dispatch(fetchProducts({ shopId: userData?.shopId } as any));
        showToast({ type: 'success', title: 'Product deleted', message: 'The product has been removed.' });
      } catch (err) {
        console.error('Error deleting product:', err);
        showToast({ type: 'error', title: 'Delete failed', message: 'Could not delete product.' });
      }
    }
  };

  const handleDeleteCategory = async (categoryId: string, categoryName: string) => {
    // Check if any products use this category
    const productsUsingCategory = products.filter(product => product.categoryId === categoryId);
    
    if (productsUsingCategory.length > 0) {
      showToast({ type: 'warning', title: 'Cannot delete', message: `Category "${categoryName}" is used by ${productsUsingCategory.length} product(s).` });
      return;
    }

    const ok = await confirm({ title: 'Delete category', message: `Are you sure you want to delete the category "${categoryName}"?`, tone: 'danger', confirmText: 'Delete', cancelText: 'Cancel' });
    if (ok) {
      try {
        await categoriesApi.delete(categoryId);
        await dispatch(fetchCategories());
        showToast({ type: 'success', title: 'Category deleted', message: 'The category has been removed.' });
      } catch (err) {
        console.error('Error deleting category:', err);
        showToast({ type: 'error', title: 'Delete failed', message: 'Could not delete category.' });
      }
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = (product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                         (product.sku || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || product.categoryId === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const lowStockThreshold = 5;
  const lowStockProducts = products.filter(product => (product.stock || 0) <= lowStockThreshold);

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
          <h1 className="text-3xl font-bold text-white">Products</h1>
          <p className="mt-1 text-gray-300">Manage your product inventory and categories</p>
        </div>
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCategoryModal(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
          >
            <Tag size={20} />
            <span>Manage Categories</span>
          </button>
          <button
            onClick={() => {
              setEditingProduct(null);
              reset();
              setImagePreview('');
              setShowAddModal(true);
            }}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
          >
            <Plus size={20} />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {/* Low Stock Alert */}
      {lowStockProducts.length > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle size={20} className="text-yellow-600" />
            <h3 className="font-medium text-yellow-800">Low Stock Alert</h3>
          </div>
          <p className="mt-1 text-yellow-700">
            {lowStockProducts.length} product(s) are running low on stock
          </p>
          <div className="mt-2">
            <details className="text-sm">
              <summary className="cursor-pointer font-medium text-yellow-800">View Low Stock Items</summary>
              <div className="mt-2 space-y-1">
                {lowStockProducts.map(product => (
                  <div key={product.id} className="flex justify-between items-center py-1">
                    <span className="text-yellow-700">{product.name}</span>
                    <span className="font-medium text-yellow-600">
                      {product.stock} / {product.minStock} units
                    </span>
                  </div>
                ))}
              </div>
            </details>
          </div>
        </div>
      )}

      {/* Inventory Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Products</p>
              <p className="text-2xl font-bold text-gray-600 dark:text-gray-100">{products.length}</p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Package size={24} className="text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Total Stock Units</p>
              <p className="text-2xl font-bold text-green-600">
                {products.reduce((sum, product) => sum + product.stock, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Package size={24} className="text-green-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Low Stock Items</p>
              <p className="text-2xl font-bold text-red-600">{lowStockProducts.length}</p>
            </div>
            <div className="p-3 bg-red-100 rounded-lg">
              <AlertCircle size={24} className="text-red-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 dark:border-gray-700  rounded-lg shadow-sm border border-gray-100 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">Inventory Value</p>
              <p className="text-2xl font-bold text-purple-600">${products.reduce((sum, product) => sum + (product.stock * product.cost), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <Package size={24} className="text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 dark:border-gray-700 rounded-lg shadow-sm border border-gray-100 p-6">
        <div className="flex flex-col sm:flex-row space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1 ">
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
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:text-gray-100 dark:bg-gray-800 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredProducts.map(product => (
          <div key={product.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border  border-gray-100 dark:border-gray-700 overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative">
              <img 
                src={product.images?.[0] || 'https://images.pexels.com/photos/3394659/pexels-photo-3394659.jpeg?auto=compress&cs=tinysrgb&w=200'} 
                alt={product.name}
                className="w-full h-48 object-cover"
              />
              {product.stock <= product.minStock && (
                <div className="absolute top-2 right-2 bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs font-medium">
                  Low Stock
                </div>
              )}
            </div>
            
            <div className="p-4">
              <div className="flex items-start justify-between mb-2">
                <h3 className="font-semibold text-sm text-gray-800">{product.name}</h3>
                <div className="flex space-x-1">
                  <button 
                    onClick={() => handleEdit(product)}
                    className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    onClick={() => handleDelete(product.id)}
                    className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-2">SKU: {product.sku}</p>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">{product.category}</p>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300 ">Price:</span>
                  <span className="font-semibold text-green-600">${product.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300 ">Stock:</span>
                  <span className={`font-semibold ${(product.stock || 0) <= lowStockThreshold ? 'text-red-600' : 'text-gray-800'}`}>
                    {product.stock} units
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300">Category:</span>
                  <span className="text-gray-600 dark:text-gray-300 ">{categories.find(c => c.id === (product as any).categoryId)?.name || '—'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-300 ">Value:</span>
                  <span className="font-semibold text-blue-600">
                    ${(((product.stock || 0) * (product.price || 0))).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <div className="text-center py-12">
          <Package size={48} className="mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-800 dark:text-gray-100 mb-2">No products found</h3>
          <p className="text-gray-600 dark:text-gray-300">Try adjusting your search criteria or add a new product.</p>
        </div>
      )}

      {/* Add/Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setEditingProduct(null);
                  reset();
                  setImagePreview('');
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    {...register('name', { required: 'Product name is required' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:text-gray-100 dark:border-gray-700 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter product name"
                  />
                  {errors.name && (
                    <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
                  <input
                    type="text"
                    {...register('sku', { required: 'SKU is required' })}
                    className="w-full px-3 py-2 border border-gray-300 dark:text-gray-100 dark:border-gray-700 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter SKU"
                  />
                  {errors.sku && (
                    <p className="mt-1 text-sm text-red-600">{errors.sku.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  {...register('description')}
                  className="w-full px-3 py-2 border border-gray-300 dark:text-gray-100 dark:border-gray-700 dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter product description"
                ></textarea>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select 
                    {...register('category', { required: 'Category is required' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                  >
                    <option value="">Select category</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>{category.name}</option>
                    ))}
                  </select>
                  {errors.category && (
                    <p className="mt-1 text-sm text-red-600">{errors.category.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Price ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('price', { required: 'Price is required', min: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    placeholder="0.00"
                  />
                  {errors.price && (
                    <p className="mt-1 text-sm text-red-600">{errors.price.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('cost', { required: 'Cost is required', min: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    placeholder="0.00"
                  />
                  {errors.cost && (
                    <p className="mt-1 text-sm text-red-600">{errors.cost.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Stock Quantity</label>
                  <input
                    type="number"
                    {...register('stock', { required: 'Stock quantity is required', min: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    placeholder="0"
                  />
                  {errors.stock && (
                    <p className="mt-1 text-sm text-red-600">{errors.stock.message}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Stock</label>
                  <input
                    type="number"
                    {...register('minStock', { required: 'Minimum stock is required', min: 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    placeholder="0"
                  />
                  {errors.minStock && (
                    <p className="mt-1 text-sm text-red-600">{errors.minStock.message}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product Image</label>
                <div className="space-y-3">
                  {imagePreview && (
                    <div className="relative">
                      <img 
                        src={imagePreview} 
                        alt="Preview" 
                        className="w-32 h-32 object-cover rounded-lg border border-gray-300"
                      />
                      <button
                        type="button"
                        onClick={() => setImagePreview('')}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                    disabled={imageUploading}
                  />
                  {imageUploading && (
                    <p className="text-sm text-blue-600">Processing image...</p>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Upload an image (max 2MB). Supported formats: JPG, PNG, GIF, WebP
                  </p>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingProduct(null);
                    reset();
                    setImagePreview('');
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
                  <span>
                    {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Add Product'}
                  </span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 dark:border dark:border-gray-700 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b flex items-center justify-between dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">Manage Categories</h2>
              <button
                onClick={() => {
                  setShowCategoryModal(false);
                  resetCategory();
                  setCategoryError('');
                }}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            {categoryError && (
              <div className="mx-6 mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {categoryError}
              </div>
            )}
            
            <div className="p-6">
              {/* Add Category Form */}
              <form onSubmit={handleSubmitCategory(onCategorySubmit)} className="mb-6">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <input
                      type="text"
                      {...registerCategory('name', { required: 'Category name is required' })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-gray-100"
                      placeholder="Enter category name"
                    />
                    {categoryErrors.name && (
                      <p className="mt-1 text-sm text-red-600">{categoryErrors.name.message}</p>
                    )}
                  </div>
                  <button 
                    type="submit"
                    disabled={categoryLoading}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center space-x-2"
                  >
                    <Plus size={20} />
                    <span>{categoryLoading ? 'Adding...' : 'Add Category'}</span>
                  </button>
                </div>
              </form>

              {/* Categories List */}
              <div className="space-y-2">
                <h3 className="font-medium text-gray-800 dark:text-gray-100 mb-3">Existing Categories</h3>
                {categories.length === 0 ? (
                  <p className="text-center py-4 text-gray-600 dark:text-gray-300">No categories found. Add your first category above.</p>
                ) : (
                  categories.map(category => (
                    <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Tag size={16} className="text-gray-600 dark:text-gray-300" />
                        <span className="font-medium text-gray-800 dark:text-gray-100">{category.name}</span>
                        <span className="text-sm text-gray-600 dark:text-gray-300">
                          ({products.filter(p => p.category === category.name).length} products)
                        </span>
                      </div>
                      <button
                        onClick={() => handleDeleteCategory(category.id, category.name)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete category"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Products;