import { apiGet, apiPost, apiPatch, apiDelete } from './api';

// Types based on backend models
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'shop_admin' | 'staff';
  shopId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Shop {
  id: string;
  name: string;
  description?: string;
  ownerId: string;
  status: 'pending' | 'approved' | 'rejected';
  approvedBy?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  sku?: string;
  barcode?: string;
  price: number;
  stock: number;
  shopId: string;
  categoryId?: string;
  images: Array<{
    url: string;
    publicId: string;
  }>;
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  shopId: string;
  customerName: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  subtotal: number;
  tax: number;
  total: number;
  dueDate?: string;
  status: 'draft' | 'sent' | 'paid' | 'void';
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  shopId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Supply {
  id: string;
  name: string;
  description?: string;
  supplier: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  shopId: string;
  receivedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'success';
  userId: string;
  shopId?: string;
  read: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  id: string;
  shopId: string;
  customerName: string;
  items: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// API Response types
export interface ApiResponse<T> {
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// Auth API
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiPost<{ user: User }>('/auth/login', credentials),
  
  register: (userData: { email: string; password: string; name: string; role?: string }) =>
    apiPost<{ user: User }>('/auth/register', userData),
  
  me: () => apiGet<{ user: User }>('/auth/me'),
  
  logout: () => apiPost('/auth/logout'),
};

// Shops API
export const shopsApi = {
  getAll: () => apiGet<{ shops: Shop[] }>('/shops'),
  
  getById: (id: string) => apiGet<{ shop: Shop }>(`/shops/${id}`),
  
  create: (shopData: { name: string; description?: string }) =>
    apiPost<{ shop: Shop }>('/shops', shopData),
  
  update: (id: string, shopData: Partial<Shop>) =>
    apiPatch<{ shop: Shop }>(`/shops/${id}`, shopData),
  
  delete: (id: string) => apiDelete(`/shops/${id}`),
  
  approve: (id: string) => apiPost<{ shop: Shop }>(`/shops/${id}/approve`),
  
  reject: (id: string) => apiPost<{ shop: Shop }>(`/shops/${id}/reject`),
};

// Products API
export const productsApi = {
  getAll: (shopId?: string) => {
    const params = shopId ? `?shopId=${shopId}` : '';
    return apiGet<{ products: Product[] }>(`/products${params}`);
  },
  
  getById: (id: string) => apiGet<{ product: Product }>(`/products/${id}`),
  
  create: (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiPost<{ product: Product }>('/products', productData),
  
  update: (id: string, productData: Partial<Product>) =>
    apiPatch<{ product: Product }>(`/products/${id}`, productData),
  
  delete: (id: string) => apiDelete(`/products/${id}`),
};

// Invoices API
export const invoicesApi = {
  getAll: (shopId?: string) => {
    const params = shopId ? `?shopId=${shopId}` : '';
    return apiGet<{ invoices: Invoice[] }>(`/invoices${params}`);
  },
  
  getById: (id: string) => apiGet<{ invoice: Invoice }>(`/invoices/${id}`),
  
  create: (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiPost<{ invoice: Invoice }>('/invoices', invoiceData),
  
  update: (id: string, invoiceData: Partial<Invoice>) =>
    apiPatch<{ invoice: Invoice }>(`/invoices/${id}`, invoiceData),
  
  delete: (id: string) => apiDelete(`/invoices/${id}`),
  
  markAsPaid: (id: string) => apiPost<{ invoice: Invoice }>(`/invoices/${id}/pay`),
};

// Categories API
export const categoriesApi = {
  getAll: (shopId?: string) => {
    const params = shopId ? `?shopId=${shopId}` : '';
    return apiGet<{ categories: Category[] }>(`/categories${params}`);
  },
  
  getById: (id: string) => apiGet<{ category: Category }>(`/categories/${id}`),
  
  create: (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiPost<{ category: Category }>('/categories', categoryData),
  
  update: (id: string, categoryData: Partial<Category>) =>
    apiPatch<{ category: Category }>(`/categories/${id}`, categoryData),
  
  delete: (id: string) => apiDelete(`/categories/${id}`),
};

// Supplies API
export const suppliesApi = {
  getAll: (shopId?: string) => {
    const params = shopId ? `?shopId=${shopId}` : '';
    return apiGet<{ supplies: Supply[] }>(`/supplies${params}`);
  },
  
  getById: (id: string) => apiGet<{ supply: Supply }>(`/supplies/${id}`),
  
  create: (supplyData: Omit<Supply, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiPost<{ supply: Supply }>('/supplies', supplyData),
  
  update: (id: string, supplyData: Partial<Supply>) =>
    apiPatch<{ supply: Supply }>(`/supplies/${id}`, supplyData),
  
  delete: (id: string) => apiDelete(`/supplies/${id}`),
};

// Notifications API
export const notificationsApi = {
  getAll: (userId?: string) => {
    const params = userId ? `?userId=${userId}` : '';
    return apiGet<{ notifications: Notification[] }>(`/notifications${params}`);
  },
  
  getById: (id: string) => apiGet<{ notification: Notification }>(`/notifications/${id}`),
  
  markAsRead: (id: string) => apiPatch<{ notification: Notification }>(`/notifications/${id}/read`),
  
  markAllAsRead: () => apiPost('/notifications/read-all'),
  
  delete: (id: string) => apiDelete(`/notifications/${id}`),
};

// Orders API
export const ordersApi = {
  getAll: (shopId?: string) => {
    const params = shopId ? `?shopId=${shopId}` : '';
    return apiGet<{ orders: Order[] }>(`/orders${params}`);
  },
  
  getById: (id: string) => apiGet<{ order: Order }>(`/orders/${id}`),
  
  create: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) =>
    apiPost<{ order: Order }>('/orders', orderData),
  
  update: (id: string, orderData: Partial<Order>) =>
    apiPatch<{ order: Order }>(`/orders/${id}`, orderData),
  
  delete: (id: string) => apiDelete(`/orders/${id}`),
};

// Reports API
export const reportsApi = {
  getDashboard: (shopId?: string) => {
    const params = shopId ? `?shopId=${shopId}` : '';
    return apiGet<{
      totalRevenue: number;
      totalProducts: number;
      totalInvoices: number;
      totalOrders: number;
      lowStockItems: number;
      pendingInvoices: number;
      recentInvoices: Invoice[];
      recentProducts: Product[];
      salesData: Array<{
        name: string;
        sales: number;
        revenue: number;
      }>;
      categoryData: Array<{
        name: string;
        value: number;
        color: string;
      }>;
    }>(`/reports/dashboard${params}`);
  },
  
  getSalesReport: (shopId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (shopId) params.append('shopId', shopId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiGet<{
      totalSales: number;
      totalRevenue: number;
      salesByMonth: Array<{
        month: string;
        sales: number;
        revenue: number;
      }>;
    }>(`/reports/sales?${params.toString()}`);
  },
};
