import { useState, useEffect, useCallback } from 'react';
import { 
  authApi, 
  shopsApi, 
  productsApi, 
  invoicesApi, 
  categoriesApi, 
  suppliesApi, 
  notificationsApi, 
  ordersApi,
  reportsApi,
  User, 
  Shop, 
  Product, 
  Invoice, 
  Category, 
  Supply, 
  Notification, 
  Order 
} from '../services/apiClient';

// Generic hook for API calls with loading and error states
export const useApiCall = <T>(
  apiCall: () => Promise<T>,
  dependencies: any[] = []
) => {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await apiCall();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, dependencies);

  useEffect(() => {
    execute();
  }, [execute]);

  return { data, loading, error, refetch: execute };
};

// Auth hooks
export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const login = async (credentials: { email: string; password: string }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.login(credentials);
      setUser(response.user);
      return response.user;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Login failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: { email: string; password: string; name: string; role?: string }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.register(userData);
      setUser(response.user);
      return response.user;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Registration failed';
      setError(errorMessage);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
      setUser(null);
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const fetchMe = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await authApi.me();
      setUser(response.user);
      return response.user;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch user';
      setError(errorMessage);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  return {
    user,
    loading,
    error,
    login,
    register,
    logout,
    fetchMe,
  };
};

// Shops hooks
export const useShops = () => {
  return useApiCall(() => shopsApi.getAll().then(res => res.shops));
};

export const useShop = (id: string) => {
  return useApiCall(() => shopsApi.getById(id).then(res => res.shop), [id]);
};

// Products hooks
export const useProducts = (shopId?: string) => {
  return useApiCall(() => productsApi.getAll(shopId).then(res => res.products), [shopId]);
};

export const useProduct = (id: string) => {
  return useApiCall(() => productsApi.getById(id).then(res => res.product), [id]);
};

// Invoices hooks
export const useInvoices = (shopId?: string) => {
  return useApiCall(() => invoicesApi.getAll(shopId).then(res => res.invoices), [shopId]);
};

export const useInvoice = (id: string) => {
  return useApiCall(() => invoicesApi.getById(id).then(res => res.invoice), [id]);
};

// Categories hooks
export const useCategories = (shopId?: string) => {
  return useApiCall(() => categoriesApi.getAll(shopId).then(res => res.categories), [shopId]);
};

export const useCategory = (id: string) => {
  return useApiCall(() => categoriesApi.getById(id).then(res => res.category), [id]);
};

// Supplies hooks
export const useSupplies = (shopId?: string) => {
  return useApiCall(() => suppliesApi.getAll(shopId).then(res => res.supplies), [shopId]);
};

export const useSupply = (id: string) => {
  return useApiCall(() => suppliesApi.getById(id).then(res => res.supply), [id]);
};

// Notifications hooks
export const useNotifications = (userId?: string) => {
  return useApiCall(() => notificationsApi.getAll(userId).then(res => res.notifications), [userId]);
};

export const useNotification = (id: string) => {
  return useApiCall(() => notificationsApi.getById(id).then(res => res.notification), [id]);
};

// Orders hooks
export const useOrders = (shopId?: string) => {
  return useApiCall(() => ordersApi.getAll(shopId).then(res => res.orders), [shopId]);
};

export const useOrder = (id: string) => {
  return useApiCall(() => ordersApi.getById(id).then(res => res.order), [id]);
};

// Reports hooks
export const useDashboard = (shopId?: string) => {
  return useApiCall(() => reportsApi.getDashboard(shopId), [shopId]);
};

export const useSalesReport = (shopId?: string, startDate?: string, endDate?: string) => {
  return useApiCall(() => reportsApi.getSalesReport(shopId, startDate, endDate), [shopId, startDate, endDate]);
};

// Users hook (for super admin)
export const useUsers = (shopId?: string) => {
  // Note: This would need to be implemented in the backend
  // For now, we'll return empty array
  return useApiCall(() => Promise.resolve([]), [shopId]);
};

// Sales hook (for dashboard - this would be orders with status 'completed')
export const useSales = (shopId?: string) => {
  return useApiCall(() => 
    ordersApi.getAll(shopId).then(res => 
      res.orders.filter(order => order.status === 'completed')
    ), 
    [shopId]
  );
};
