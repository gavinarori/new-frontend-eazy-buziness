import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc, Timestamp, collection } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { Building2, User, ArrowLeft, CheckCircle } from 'lucide-react';
import { auth, db } from '../config/firebase';
import { useAuth } from '../contexts/AuthContext';

interface UserFormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone?: string;
}

interface ShopFormData {
  name: string;
  address: string;
  phone: string;
  vatRate: string;
  currency: string;
}

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser, userData, logout } = useAuth();
  const [step, setStep] = useState<'user' | 'shop' | 'done'>('user');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [createdUserId, setCreatedUserId] = useState<string>('');
  const [success, setSuccess] = useState(false);

  const { register: registerUser, handleSubmit: handleSubmitUser, watch, formState: { errors: userErrors } } = useForm<UserFormData>();
  const { register: registerShop, handleSubmit: handleSubmitShop, formState: { errors: shopErrors } } = useForm<ShopFormData>({
    defaultValues: { currency: 'USD', vatRate: '10' }
  });

  const password = watch('password');

  // If already authenticated as shop_admin without a shop, jump straight to shop creation
  useEffect(() => {
    if (currentUser && userData?.role === 'shop_admin') {
      setCreatedUserId(currentUser.uid);
      if (!userData.shopId) {
        setStep('shop');
      }
    }
  }, [currentUser, userData]);

  const onSubmitUser = async (data: UserFormData) => {
    setLoading(true);
    setError('');
    try {
      if (data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
      const userId = userCredential.user.uid;
      setCreatedUserId(userId);

      await setDoc(doc(db, 'users', userId), {
        name: data.name,
        email: data.email,
        phone: data.phone || '',
        role: 'shop_admin',
        shopId: '', // no business assigned yet
        permissions: [
          'manage_products',
          'create_invoices',
          'manage_supplies',
          'view_reports',
          'manage_staff'
        ],
        isActive: true,
        createdAt: Timestamp.now(),
        salesTarget: 100,
        commissionRate: 5
      });

      setStep('shop');
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('This email address is already registered.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak. Use at least 6 characters.');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address format.');
      } else {
        setError(err.message || 'Failed to create account.');
      }
    } finally {
      setLoading(false);
    }
  };

  const onSubmitShop = async (data: ShopFormData) => {
    setLoading(true);
    setError('');
    try {
      const shopRef = doc(collection(db, 'shops'));

      await setDoc(shopRef, {
        name: data.name,
        address: data.address,
        phone: data.phone,
        vatRate: parseFloat(data.vatRate) || 10,
        currency: data.currency,
        isActive: false,
        createdAt: Timestamp.now(),
        registeredBy: createdUserId,
        adminId: createdUserId
      });

      setSuccess(true);
      setStep('done');
      setTimeout(() => navigate('/pending-approval'), 2000);
    } catch (err: any) {
      setError(err.message || 'Failed to create business.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'done' && success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle size={32} className="text-green-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Setup Complete</h1>
            <p className="text-gray-600 mb-6">Your business was created and is pending approval.</p>
            <div className="animate-pulse text-blue-600 text-sm">Redirecting...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-8 py-6 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold">{step === 'user' ? 'Create your account' : 'Create your business'}</h1>
                <p className="text-blue-100 mt-1">{step === 'user' ? 'Start by creating your user account' : 'Now, set up your business details'}</p>
              </div>
              <div className="w-12 h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                <Building2 size={24} />
              </div>
            </div>
          </div>

          <div className="p-8">
            <button
              onClick={async () => { try { await logout(); } finally { navigate('/login'); } }}
              className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6 transition-colors"
            >
              <ArrowLeft size={16} className="mr-2" />
              Back to Login
            </button>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">{error}</div>
            )}

            {step === 'user' && (
              <form onSubmit={handleSubmitUser(onSubmitUser)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Full Name *</label>
                    <input
                      type="text"
                      {...registerUser('name', { required: 'Full name is required' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your full name"
                    />
                    {userErrors.name && <p className="mt-1 text-sm text-red-600">{userErrors.name.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                    <input
                      type="email"
                      {...registerUser('email', { required: 'Email is required', pattern: { value: /^\S+@\S+$/i, message: 'Invalid email address' } })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your email"
                    />
                    {userErrors.email && <p className="mt-1 text-sm text-red-600">{userErrors.email.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                    <input
                      type="password"
                      {...registerUser('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Create a password"
                    />
                    {userErrors.password && <p className="mt-1 text-sm text-red-600">{userErrors.password.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                    <input
                      type="password"
                      {...registerUser('confirmPassword', { required: 'Please confirm your password', validate: value => value === password || 'Passwords do not match' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Confirm your password"
                    />
                    {userErrors.confirmPassword && <p className="mt-1 text-sm text-red-600">{userErrors.confirmPassword.message}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number</label>
                    <input
                      type="tel"
                      {...registerUser('phone')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your phone number"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Creating Account...</span>
                    </>
                  ) : (
                    <>
                      <User size={20} />
                      <span>Create Account</span>
                    </>
                  )}
                </button>
              </form>
            )}

            {step === 'shop' && (
              <form onSubmit={handleSubmitShop(onSubmitShop)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
                    <input
                      type="text"
                      {...registerShop('name', { required: 'Business name is required' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter business name"
                    />
                    {shopErrors.name && <p className="mt-1 text-sm text-red-600">{shopErrors.name.message}</p>}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address *</label>
                    <textarea
                      rows={3}
                      {...registerShop('address', { required: 'Address is required' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter business address"
                    />
                    {shopErrors.address && <p className="mt-1 text-sm text-red-600">{shopErrors.address.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone Number *</label>
                    <input
                      type="tel"
                      {...registerShop('phone', { required: 'Phone number is required' })}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter phone number"
                    />
                    {shopErrors.phone && <p className="mt-1 text-sm text-red-600">{shopErrors.phone.message}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select
                      {...registerShop('currency')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="KSH">KSH (KSh)</option>
                      <option value="JPY">JPY (¥)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">VAT Rate (%)</label>
                    <input
                      type="number"
                      step="0.1"
                      min="0"
                      max="100"
                      {...registerShop('vatRate')}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="10"
                    />
                  </div>
                </div>
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700">Your business will be submitted for approval. You will be notified once activated.</p>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-blue-600 text-white py-4 px-6 rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Creating Business...</span>
                    </>
                  ) : (
                    <>
                      <Building2 size={20} />
                      <span>Create Business</span>
                    </>
                  )}
                </button>
              </form>
            )}

            <p className="text-center text-sm text-gray-600 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">Sign in here</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;