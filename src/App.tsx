import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Layout from './components/Layout/Layout';
import Login from './components/Auth/Login';
import { LoginForm } from './components/login-form';
import Register from './pages/Register';
import PendingApproval from './pages/PendingApproval';
// import Dashboard from './pages/Dashboard';
import Products from './pages/Products';
import Invoices from './pages/Invoices';
import Supplies from './pages/Supplies';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Shops from './pages/Shops';
import Notifications from './pages/Notifications';
import Settings from './pages/Settings';
import Inventory from './pages/Inventory';
import { DialogProvider } from './contexts/DialogContext';
import { ToastProvider } from './contexts/ToastContext';
import Dashboard from './app/dashboard/dash';

const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, userData } = useAuth();
  
  if (!currentUser) {
    return <Navigate to="/login" />;
  }
  
  // If a shop admin has no assigned business yet, keep them on the registration flow to create a shop
  if (userData ) {
    return <Navigate to="/register" />;
  }
  
  return <Layout>{children}</Layout>;
};

const AppRoutes: React.FC = () => {
  const { currentUser, userData } = useAuth();

  // Show login/register pages for unauthenticated users
  if (!currentUser) {
    return (
      <Routes>
        <Route path="/login" element={<LoginForm  />} />
        <Route path="/register" element={<Register />} />
        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" />} />
      <Route path="/pending-approval" element={<PendingApproval />} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/products" element={<ProtectedRoute><Products /></ProtectedRoute>} />
      <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
      <Route path="/invoices" element={<ProtectedRoute><Invoices /></ProtectedRoute>} />
      <Route path="/supplies" element={<ProtectedRoute><Supplies /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/users" element={<ProtectedRoute><Users /></ProtectedRoute>} />
      <Route path="/shops" element={<ProtectedRoute><Shops /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/login" element={<Navigate to="/dashboard" />} />
      <Route path="/register" element={<Register />} />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <DialogProvider>
              <AppRoutes />
            </DialogProvider>
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </Router>
  );
}

export default App;