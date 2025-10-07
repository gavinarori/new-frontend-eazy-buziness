import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Building2, User, ArrowLeft, CheckCircle, GalleryVerticalEnd } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { authApi, shopsApi } from '../services/apiClient';
import { SignupForm } from '@/components/signup-form';

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
  // No local user id needed; backend associates created shop with admin later
  const [success, setSuccess] = useState(false);

  const { register: registerUser, handleSubmit: handleSubmitUser, watch, formState: { errors: userErrors } } = useForm<UserFormData>();
  const { register: registerShop, handleSubmit: handleSubmitShop, formState: { errors: shopErrors } } = useForm<ShopFormData>({
    defaultValues: { currency: 'USD', vatRate: '10' }
  });

  const password = watch('password');

  // If already authenticated as shop_admin without a shop, jump straight to shop creation
  useEffect(() => {
    if (currentUser && userData?.role === 'seller' && !userData.shopId) {
      setStep('shop');
    }
  }, [currentUser, userData]);

  const onSubmitUser = async (data: UserFormData) => {
    setLoading(true);
    setError('');
    try {
      if (data.password !== data.confirmPassword) {
        throw new Error('Passwords do not match');
      }

      const { user } = await authApi.register({
        email: data.email,
        password: data.password,
        name: data.name,
        role: 'seller',
      });

      setStep('shop');
    } catch (err: any) {
      setError(err.message || 'Failed to create account.');
    } finally {
      setLoading(false);
    }
  };

  const onSubmitShop = async (data: ShopFormData) => {
    setLoading(true);
    setError('');
    try {
      await shopsApi.create({
        name: data.name,
        description: `${data.address} | ${data.phone}`,
        address: data.address,
        phone: data.phone,
        currency: data.currency,
        vatRate: Number(data.vatRate) || undefined,
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
    <div className="grid min-h-svh lg:grid-cols-2">
    <div className="flex flex-col gap-4 p-6 md:p-10">
      <div className="flex justify-center gap-2 md:justify-start">
        <a href="#" className="flex items-center gap-2 font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
            <GalleryVerticalEnd className="size-4" />
          </div>
          BusinessHub.
        </a>
      </div>
      <div className="flex flex-1 items-center justify-center">
        <div className="w-full max-w-xs">
          <SignupForm />
        </div>
      </div>
    </div>
    <div className="bg-muted relative hidden lg:block">
      <img
        src="/placeholder.svg"
        alt="Image"
        className="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
      />
    </div>
  </div>
  );
};

export default Register;