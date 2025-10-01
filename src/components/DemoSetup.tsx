import React, { useState } from 'react';
import { Database, Users, Package, Store, CheckCircle, AlertCircle } from 'lucide-react';
import { createDemoAccounts } from '../utils/demoData';

interface DemoSetupProps {
  onComplete?: () => void;
}

const DemoSetup: React.FC<DemoSetupProps> = ({ onComplete }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [error, setError] = useState('');

  const handleCreateDemo = async () => {
    setIsCreating(true);
    setError('');
    
    try {
      const success = await createDemoAccounts();
      if (success) {
        setIsComplete(true);
      } else {
        setError('Failed to create demo accounts. Please check the console for details.');
      }
    } catch (err) {
      setError('An error occurred while creating demo accounts.');
      console.error(err);
    } finally {
      setIsCreating(false);
    }
  };

  if (isComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Demo Setup Complete!</h1>
            <p className="text-gray-600 mb-6">
              Your demo accounts and data have been successfully created. You can now log in with any of the demo accounts.
            </p>
            <button
              onClick={() => {
                setIsComplete(false);
                if (onComplete) {
                  onComplete();
                }
              }}
              className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Database size={32} className="text-blue-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Setup Demo Data</h1>
            <p className="text-gray-600 mt-2">Create demo accounts and sample data to get started</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center">
              <AlertCircle size={20} className="mr-2" />
              {error}
            </div>
          )}

          <div className="space-y-4 mb-8">
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Users size={20} className="text-blue-600" />
              <div>
                <p className="font-medium text-gray-800">Demo Users</p>
                <p className="text-sm text-gray-600">Super Admin, Shop Admin, and Staff accounts</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Store size={20} className="text-green-600" />
              <div>
                <p className="font-medium text-gray-800">Sample Shops</p>
                <p className="text-sm text-gray-600">Main Store and Downtown Branch</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
              <Package size={20} className="text-purple-600" />
              <div>
                <p className="font-medium text-gray-800">Sample Products</p>
                <p className="text-sm text-gray-600">Electronics, office supplies, and more</p>
              </div>
            </div>
          </div>

          <button
            onClick={handleCreateDemo}
            disabled={isCreating}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            <Database size={20} />
            <span>{isCreating ? 'Creating Demo Data...' : 'Create Demo Data'}</span>
          </button>

          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h3 className="font-medium text-gray-800 mb-2">Demo Accounts to be Created:</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <p><strong>Super Admin:</strong> admin@demo.com / admin123</p>
              <p><strong>Shop Admin:</strong> shop@demo.com / shop123</p>
              <p><strong>Staff:</strong> staff@demo.com / staff123</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DemoSetup;