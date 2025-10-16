import { apiGet, apiPost, apiPatch, apiDelete } from './api';

const getShopId = (): string | null => {
  try {
    const shop = localStorage.getItem('shop');
    if (!shop) return null;
    const parsed = JSON.parse(shop);
    return parsed._id || parsed.id || null;
  } catch {
    return null;
  }
};

// ====== TYPES ======
export interface User {
  id: string;
  email: string;
  name: string;
  role: 'customer' | 'seller' | 'admin' | 'superadmin';
  shopId?: string;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Shop {
  id: string;
  name: string;
  description?: string;
  address?: string;
  phone?: string;
  currency?: string;
  vatRate?: number;
  isActive?: boolean;
  status?: string;
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
  cost?: number;
  stock: number;
  minStock?: number;
  shopId: string;
  categoryId?: string;
  images: Array<{ url: string; publicId: string }>;
  ratingAverage: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Invoice {
  id: string;
  shopId: string;
  customerName: string;
  items: Array<{ description: string; quantity: number; unitPrice: number }>;
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
  items: Array<{ productId: string; quantity: number; unitPrice: number }>;
  total: number;
  status: 'pending' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

// ====== RESPONSE TYPES ======
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

// ====== AUTH API ======
export const authApi = {
  login: (credentials: { email: string; password: string }) =>
    apiPost<{ user: User }>('/auth/login', credentials),

  register: (userData: {
    email: string;
    password: string;
    name: string;
    role?: 'customer' | 'seller' | 'admin' | 'superadmin';
  }) => apiPost<{ user: User }>('/auth/register', userData),

  me: () => apiGet<{ user: User }>('/auth/me'),

  logout: () => apiPost('/auth/logout'),
};

// ====== SHOPS API ======
export const shopsApi = {
  getAll: () => apiGet<{ shops: Shop[] }>('/shops'),

  getById: (id: string) => apiGet<{ shop: Shop }>(`/shops/${id}`),

  create: (shopData: {
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    currency?: string;
    vatRate?: number;
    status?: string;
  }) => apiPost<{ shop: Shop }>('/shops', shopData),

  update: (id: string, shopData: Partial<Shop>) =>
    apiPatch<{ shop: Shop }>(`/shops/${id}`, shopData),

  delete: (id: string) => apiDelete(`/shops/${id}`),

  approve: (id: string) => apiPost<{ shop: Shop }>(`/shops/${id}/approve`),

  reject: (id: string) => apiPost<{ shop: Shop }>(`/shops/${id}/reject`),
};

// ====== PRODUCTS API ======
export const productsApi = {
  getAll: () => {
    const shopId = getShopId();
    const params = shopId ? `?shopId=${shopId}` : '';
    return apiGet<{ products: Product[] }>(`/products${params}`);
  },

  getById: (id: string) => apiGet<{ product: Product }>(`/products/${id}`),

  create: (formData: FormData) => {
    const shopId = getShopId();
    if (shopId) formData.append('shopId', shopId);
    return apiPost<{ product: Product }>('/products', formData);
  },

  update: (id: string, formData: FormData) =>
    apiPatch<{ product: Product }>(`/products/${id}`, formData),

  delete: (id: string) => apiDelete(`/products/${id}`),
};

// ====== INVOICES API ======
export const invoicesApi = {
  getAll: () => {
    const shopId = getShopId();
    const params = shopId ? `?shopId=${shopId}` : '';
    return apiGet<{ invoices: Invoice[] }>(`/invoices${params}`);
  },

  getById: (id: string) => apiGet<{ invoice: Invoice }>(`/invoices/${id}`),

  create: (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    const shopId = getShopId();
    const data = shopId ? { ...invoiceData, shopId } : invoiceData;
    return apiPost<{ invoice: Invoice }>('/invoices', data);
  },

  update: (id: string, invoiceData: Partial<Invoice>) =>
    apiPatch<{ invoice: Invoice }>(`/invoices/${id}`, invoiceData),

  delete: (id: string) => apiDelete(`/invoices/${id}`),

  markAsPaid: (id: string) => apiPost<{ invoice: Invoice }>(`/invoices/${id}/pay`),
};

// ====== CATEGORIES API ======
export const categoriesApi = {
  getAll: () => {
    const shopId = getShopId();
    const params = shopId ? `?shopId=${shopId}` : '';
    return apiGet<{ categories: Category[] }>(`/categories${params}`);
  },

  getById: (id: string) => apiGet<{ category: Category }>(`/categories/${id}`),

  create: (categoryData: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>) => {
    const shopId = getShopId();
    const data = shopId ? { ...categoryData, shopId } : categoryData;
    return apiPost<{ category: Category }>('/categories', data);
  },

  update: (id: string, categoryData: Partial<Category>) =>
    apiPatch<{ category: Category }>(`/categories/${id}`, categoryData),

  delete: (id: string) => apiDelete(`/categories/${id}`),
};

// ====== SUPPLIES API ======
export const suppliesApi = {
  getAll: () => {
    const shopId = getShopId();
    const params = shopId ? `?shopId=${shopId}` : '';
    return apiGet<{ supplies: Supply[] }>(`/supplies${params}`);
  },

  getById: (id: string) => apiGet<{ supply: Supply }>(`/supplies/${id}`),

  create: (supplyData: Omit<Supply, 'id' | 'createdAt' | 'updatedAt'>) => {
    const shopId = getShopId();
    const data = shopId ? { ...supplyData, shopId } : supplyData;
    return apiPost<{ supply: Supply }>('/supplies', data);
  },

  update: (id: string, supplyData: Partial<Supply>) =>
    apiPatch<{ supply: Supply }>(`/supplies/${id}`, supplyData),

  delete: (id: string) => apiDelete(`/supplies/${id}`),
};

// ====== NOTIFICATIONS API ======
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

// ====== USERS API ======
export const usersApi = {
  getAll: () => apiGet<{ users: User[] }>('/users'),
  getById: (id: string) => apiGet<{ user: User }>(`/users/${id}`),
  update: (id: string, userData: Partial<User>) =>
    apiPatch<{ user: User }>(`/users/${id}`, userData),
  delete: (id: string) => apiDelete(`/users/${id}`),
};

// ====== ORDERS API ======
export const ordersApi = {
  getAll: () => {
    const shopId = getShopId();
    const params = shopId ? `?shopId=${shopId}` : '';
    return apiGet<{ orders: Order[] }>(`/orders${params}`);
  },

  getById: (id: string) => apiGet<{ order: Order }>(`/orders/${id}`),

  create: (orderData: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>) => {
    const shopId = getShopId();
    const data = shopId ? { ...orderData, shopId } : orderData;
    return apiPost<{ order: Order }>('/orders', data);
  },

  update: (id: string, orderData: Partial<Order>) =>
    apiPatch<{ order: Order }>(`/orders/${id}`, orderData),

  delete: (id: string) => apiDelete(`/orders/${id}`),
};

// ====== REPORTS API ======
export const reportsApi = {
  getDashboard: () => {
    const shopId = getShopId();
    const params = shopId ? `?shopId=${shopId}` : '';
    return apiGet(`/reports/dashboard${params}`);
  },

  getSalesReport: (startDate?: string, endDate?: string) => {
    const shopId = getShopId();
    const params = new URLSearchParams();
    if (shopId) params.append('shopId', shopId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    return apiGet(`/reports/sales?${params.toString()}`);
  },
};
