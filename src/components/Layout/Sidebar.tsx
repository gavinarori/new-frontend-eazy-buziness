import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Home, 
  Package, 
  FileText, 
  BarChart3, 
  Users, 
  Truck, 
  Bell,
  Settings,
  LogOut,
  Store,
  Clipboard
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

const Sidebar: React.FC = () => {
  const { userData, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const menuItems = [
    { icon: Home, label: 'Dashboard', path: '/dashboard' },
    ...(userData?.role !== 'super_admin' ? [
      { icon: Package, label: 'Products', path: '/products' },
      { icon: Clipboard, label: 'Inventory', path: '/inventory' },
      { icon: FileText, label: 'Sales', path: '/invoices' },
      { icon: Truck, label: 'Supplies', path: '/supplies' },
      { icon: BarChart3, label: 'Reports', path: '/reports' },
    ] : []),
    { icon: Users, label: 'Users', path: '/users' },
    ...(userData?.role === 'super_admin' ? [
      { icon: Store, label: 'Shops', path: '/shops' },
    ] : []),
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="w-16 sm:w-64 bg-white dark:bg-gray-800 shadow-lg h-screen flex flex-col">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200 hidden sm:block">BusinessHub</h1>
        <h1 className="text-xl font-bold text-gray-800 dark:text-gray-200 sm:hidden">BH</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 capitalize hidden sm:block">{userData?.role?.replace('_', ' ')}</p>
      </div>

      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <Link
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive(item.path)
                    ? 'bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200'
                }`}
              >
                <item.icon size={20} />
                <span className="font-medium hidden sm:inline">{item.label}</span>
              </Link>
              <div className="sm:hidden text-xs text-center mt-1 text-gray-500 dark:text-gray-400">{item.label}</div>
            </li>
          ))}
        </ul>
      </nav>

      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={logout}
          className="flex items-center space-x-3 px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded-lg transition-colors w-full"
        >
          <LogOut size={20} />
          <span className="font-medium hidden sm:inline">Logout</span>
          <div className="sm:hidden text-xs text-center mt-1 text-red-500 dark:text-red-400">Logout</div>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;