import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth as useApiAuth } from '../hooks/useApi';
import { User, shopsApi, Shop } from '../services/apiClient';

interface AuthContextType {
  currentUser: User | null;
  userData: User | null;
  shop: Shop | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => Promise<void>;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading, error, login: apiLogin, logout: apiLogout } = useApiAuth();
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [shop, setShop] = useState<Shop | null>(null);

  // Restore user and shop from localStorage on app start
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedShop = localStorage.getItem('shop');
    if (storedUser) setCurrentUser(JSON.parse(storedUser));
    if (storedShop) setShop(JSON.parse(storedShop));
  }, []);

  const login = async (email: string, password: string) => {
    const responseUser = await apiLogin({ email, password });

    // extract shop info (backend returns shopId as full object)
    const shopData = responseUser.shopId || null;

    // save to localStorage
    localStorage.setItem('user', JSON.stringify(responseUser));
    if (shopData) {
      localStorage.setItem('shop', JSON.stringify(shopData));
    }

    setCurrentUser(responseUser);
    setShop(shopData as unknown as Shop);

    return responseUser;
  };

  const logout = async () => {
    await apiLogout();
    setCurrentUser(null);
    setShop(null);
    localStorage.removeItem('user');
    localStorage.removeItem('shop');
  };

  // If backend auto-loads user, keep sync
  useEffect(() => {
    if (user) {
      setCurrentUser(user);
      if (user.shopId) {
        setShop(user.shopId as unknown as Shop);
        localStorage.setItem('shop', JSON.stringify(user.shopId));
      }
      localStorage.setItem('user', JSON.stringify(user));
    }
  }, [user]);

  const value = {
    currentUser,
    userData: currentUser,
    shop,
    login,
    logout,
    loading,
    error,
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      ) : error ? (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Connection Error</h1>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      ) : (
        children
      )}
    </AuthContext.Provider>
  );
};
