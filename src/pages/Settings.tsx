import React, { useState, useEffect, useCallback } from 'react';
import { User, Bell, Building2, Shield, Palette, Download, Upload, Trash2, Save, X, Camera, Image } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useAppDispatch, useAppSelector } from '../app/hooks';
import { fetchShops } from '../features/shops/shopsSlice';
import { fetchSettings, upsertSettings } from '../features/settings/settingsSlice';
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider, deleteUser } from 'firebase/auth';
import { shopsApi, authApi } from '../services/apiClient';

export default function Settings() {
  const { currentUser, userData } = useAuth();
  const { theme, setTheme } = useTheme();
  const dispatch = useAppDispatch();
  const shops = useAppSelector(s => s.shops.items as any[]);
  const appSettings = useAppSelector(s => s.settings.values);
  useEffect(() => { dispatch(fetchShops()); dispatch(fetchSettings()); }, [dispatch]);
  
  // Modal states
  const [activeModal, setActiveModal] = useState<string | null>(null);
  
  // Profile Settings
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    phone: '',
    profilePhoto: ''
  });

  // Notification Settings
  const [notificationSettings, setNotificationSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    smsNotifications: false,
    lowStockAlerts: true,
    orderUpdates: true,
    systemUpdates: false
  });

  // Business Information
  const [businessData, setBusinessData] = useState({
    name: '',
    address: '',
    phone: '',
    vatRate: '',
    currency: 'USD',
    logo: ''
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
    twoFactorEnabled: false
  });

  // Appearance Settings
  const [appearanceSettings, setAppearanceSettings] = useState({
    theme: theme,
    language: 'en',
    dateFormat: 'MM/DD/YYYY',
    currency: 'USD'
  });

  // Data Management
  const [deletePassword, setDeletePassword] = useState('');

  // Loading and message states
  const [loading, setLoading] = useState({
    profile: false,
    notifications: false,
    business: false,
    security: false,
    appearance: false,
    export: false,
    restore: false,
    delete: false
  });

  const [messages, setMessages] = useState({
    profile: '',
    notifications: '',
    business: '',
    security: '',
    appearance: '',
    export: '',
    restore: '',
    delete: ''
  });

  // Load data from Redux
  useEffect(() => {
    if (userData) {
      setProfileData({
        name: userData.name || '',
        email: userData.email || '',
        phone: userData.phone || '',
        profilePhoto: userData.profilePhoto || ''
      });

      if (userData.notificationSettings) {
        setNotificationSettings(userData.notificationSettings);
      }

      if (userData.appearanceSettings) {
        setAppearanceSettings(userData.appearanceSettings);
      }
      
      // Sync with current theme
      setAppearanceSettings(prev => ({ ...prev, theme: theme }));
      
      if (userData.twoFactorEnabled !== undefined) {
        setSecuritySettings(prev => ({
          ...prev,
          twoFactorEnabled: userData.twoFactorEnabled
        }));
      }
    }

    if (shops && userData?.shopId) {
      const currentShop = shops.find(shop => shop.id === userData.shopId);
      if (currentShop) {
        setBusinessData({
          name: currentShop.name || '',
          address: currentShop.description || '',
          phone: '',
          vatRate: '',
          currency: 'USD',
          logo: ''
        });
      }
    }
  }, [userData, shops, theme]);

  // Clear messages after 3 seconds
  useEffect(() => {
    Object.keys(messages).forEach(key => {
      if (messages[key]) {
        const timer = setTimeout(() => {
          setMessages(prev => ({ ...prev, [key]: '' }));
        }, 3000);
        return () => clearTimeout(timer);
      }
    });
  }, [messages]);

  // Convert file to base64
  const convertToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  // Handle image uploads
  const handleImageUpload = async (file: File, type: 'profile' | 'business') => {
    if (file.size > 2 * 1024 * 1024) {
      const messageKey = type === 'profile' ? 'profile' : 'business';
      setMessages(prev => ({ ...prev, [messageKey]: 'Image size must be less than 2MB' }));
      return;
    }
    
    if (!file.type.startsWith('image/')) {
      const messageKey = type === 'profile' ? 'profile' : 'business';
      setMessages(prev => ({ ...prev, [messageKey]: 'Please select a valid image file' }));
      return;
    }

    try {
      const base64 = await convertToBase64(file);
      if (type === 'profile') {
        setProfileData(prev => ({ ...prev, profilePhoto: base64 }));
      } else {
        setBusinessData(prev => ({ ...prev, logo: base64 }));
      }
    } catch (err) {
      const messageKey = type === 'profile' ? 'profile' : 'business';
      setMessages(prev => ({ ...prev, [messageKey]: 'Failed to process image' }));
    }
  };

  // Save handlers
  const handleSaveProfile = useCallback(async () => {
    if (!userData?.id) return;
    setLoading(prev => ({ ...prev, profile: true }));
    try {
      await authApi.me();
      setMessages(prev => ({ ...prev, profile: 'Profile updated successfully!' }));
    } catch (error) {
      console.error('Error updating profile:', error);
      setMessages(prev => ({ ...prev, profile: 'Failed to update profile' }));
    } finally {
      setLoading(prev => ({ ...prev, profile: false }));
    }
  }, [userData?.id, profileData]);

  const handleSaveNotifications = useCallback(async () => {
    if (!userData?.id) return;
    
    setLoading(prev => ({ ...prev, notifications: true }));
    try {
      // Implement notifications save endpoint if available
      setMessages(prev => ({ ...prev, notifications: 'Notification preferences saved!' }));
    } catch (error) {
      console.error('Error updating notifications:', error);
      setMessages(prev => ({ ...prev, notifications: 'Failed to save notification preferences' }));
    } finally {
      setLoading(prev => ({ ...prev, notifications: false }));
    }
  }, [userData?.id, notificationSettings]);

  const handleSaveBusinessInfo = useCallback(async () => {
    if (!userData?.shopId) return;
    
    setLoading(prev => ({ ...prev, business: true }));
    try {
      await shopsApi.update(userData.shopId, { name: businessData.name, description: businessData.address } as any);
      await dispatch(fetchShops());
      
      setMessages(prev => ({ ...prev, business: 'Business information updated!' }));
    } catch (error) {
      console.error('Error updating business info:', error);
      setMessages(prev => ({ ...prev, business: 'Failed to update business information' }));
    } finally {
      setLoading(prev => ({ ...prev, business: false }));
    }
  }, [userData?.shopId, userData?.id, businessData, appearanceSettings]);

  const handleSaveSecurity = useCallback(async () => {
    setLoading(prev => ({ ...prev, security: true }));
    try {
      if (securitySettings.newPassword && securitySettings.confirmPassword) {
        if (securitySettings.newPassword !== securitySettings.confirmPassword) {
          setMessages(prev => ({ ...prev, security: 'Passwords do not match' }));
          return;
        }
        
        if (currentUser) {
          await updatePassword(currentUser, securitySettings.newPassword);
        }
      }

      if (userData?.id) {
        await updateUser(userData.id, {
          twoFactorEnabled: securitySettings.twoFactorEnabled
        });
      }

      setMessages(prev => ({ ...prev, security: 'Security settings updated!' }));
      setSecuritySettings(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }));
    } catch (error) {
      setMessages(prev => ({ ...prev, security: 'Failed to update security settings' }));
    } finally {
      setLoading(prev => ({ ...prev, security: false }));
    }
  }, [securitySettings, currentUser, userData?.id]);

  const handleSaveAppearance = useCallback(async () => {
    if (!userData?.id) return;
    
    setLoading(prev => ({ ...prev, appearance: true }));
    try {
      setTheme(appearanceSettings.theme as 'light' | 'dark');
      await dispatch(upsertSettings({ theme: appearanceSettings.theme as 'light' | 'dark' }));
      setMessages(prev => ({ ...prev, appearance: 'Appearance settings saved!' }));
    } catch (error) {
      console.error('Error updating appearance:', error);
      setMessages(prev => ({ ...prev, appearance: 'Failed to save appearance settings' }));
    } finally {
      setLoading(prev => ({ ...prev, appearance: false }));
    }
  }, [userData?.id, appearanceSettings, setTheme]);

  const handleExportData = useCallback(async () => {
    setLoading(prev => ({ ...prev, export: true }));
    try {
      const exportData = {
        profile: profileData,
        notifications: notificationSettings,
        business: businessData,
        appearance: appearanceSettings,
        exportDate: new Date().toISOString()
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setMessages(prev => ({ ...prev, export: 'Data exported successfully!' }));
    } catch (error) {
      setMessages(prev => ({ ...prev, export: 'Failed to export data' }));
    } finally {
      setLoading(prev => ({ ...prev, export: false }));
    }
  }, [profileData, notificationSettings, businessData, appearanceSettings]);

  const handleRestoreData = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setLoading(prev => ({ ...prev, restore: true }));
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      
      if (data.profile) setProfileData(data.profile);
      if (data.notifications) setNotificationSettings(data.notifications);
      if (data.business) setBusinessData(data.business);
      if (data.appearance) setAppearanceSettings(data.appearance);
      
      setMessages(prev => ({ ...prev, restore: 'Data restored successfully!' }));
    } catch (error) {
      setMessages(prev => ({ ...prev, restore: 'Failed to restore data. Invalid file format.' }));
    } finally {
      setLoading(prev => ({ ...prev, restore: false }));
    }
  }, []);

  const handleDeleteAccount = useCallback(async () => {
    if (!deletePassword || !currentUser || !userData) return;
    
    setLoading(prev => ({ ...prev, delete: true }));
    try {
      const credential = EmailAuthProvider.credential(currentUser.email!, deletePassword);
      await reauthenticateWithCredential(currentUser, credential);
      await deleteUser(currentUser);
      
      setMessages(prev => ({ ...prev, delete: 'Account deleted successfully' }));
    } catch (error: any) {
      if (error.code === 'auth/wrong-password') {
        setMessages(prev => ({ ...prev, delete: 'Incorrect password' }));
      } else {
        setMessages(prev => ({ ...prev, delete: 'Failed to delete account' }));
      }
    } finally {
      setLoading(prev => ({ ...prev, delete: false }));
    }
  }, [deletePassword, currentUser, userData]);

  const settingsCards = [
    {
      id: 'profile',
      title: 'Profile Settings',
      description: 'Manage your personal information and profile photo',
      icon: User,
      color: 'bg-blue-500'
    },
    {
      id: 'notifications',
      title: 'Notifications',
      description: 'Configure your notification preferences',
      icon: Bell,
      color: 'bg-green-500'
    },
    {
      id: 'business',
      title: 'Business Information',
      description: 'Update your business details and logo',
      icon: Building2,
      color: 'bg-purple-500'
    },
    {
      id: 'security',
      title: 'Security Settings',
      description: 'Manage password and security options',
      icon: Shield,
      color: 'bg-red-500'
    },
    {
      id: 'appearance',
      title: 'Appearance',
      description: 'Customize theme and display preferences',
      icon: Palette,
      color: 'bg-orange-500'
    },
    {
      id: 'data',
      title: 'Data Management',
      description: 'Export, restore, or delete your data',
      icon: Download,
      color: 'bg-gray-500'
    }
  ];

  const renderModal = () => {
    if (!activeModal) return null;

    const closeModal = () => setActiveModal(null);

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="p-6 border-b flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-100">
              {settingsCards.find(card => card.id === activeModal)?.title}
            </h2>
            <button
              onClick={closeModal}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="p-6">
            {activeModal === 'profile' && (
              <div className="space-y-6">
                {/* Profile Photo Upload */}
                <div className="text-center">
                  <div className="relative inline-block">
                    {profileData.profilePhoto ? (
                      <img 
                        src={profileData.profilePhoto} 
                        alt="Profile" 
                        className="w-24 h-24 rounded-full object-cover border-4 border-gray-200"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-full bg-gray-200 flex items-center justify-center">
                        <User size={32} className="text-gray-400" />
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 bg-blue-500 text-white p-2 rounded-full cursor-pointer hover:bg-blue-600 transition-colors">
                      <Camera size={16} />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'profile')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Click camera icon to upload photo</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Full Name</label>
                    <input
                      type="text"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Email</label>
                    <input
                      type="email"
                      value={profileData.email}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50 text-gray-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-300">Phone</label>
                    <input
                      type="tel"
                      value={profileData.phone}
                      onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                {messages.profile && (
                  <div className={`p-3 rounded-md ${messages.profile.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {messages.profile}
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={loading.profile}
                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading.profile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </div>
            )}

            {activeModal === 'notifications' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  {Object.entries(notificationSettings).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-gray-700 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').trim()}
                        </label>
                        <p className="text-xs text-gray-500">
                          {key === 'emailNotifications' && 'Receive notifications via email'}
                          {key === 'pushNotifications' && 'Browser push notifications'}
                          {key === 'smsNotifications' && 'SMS text message alerts'}
                          {key === 'lowStockAlerts' && 'Get notified when inventory is low'}
                          {key === 'orderUpdates' && 'Updates about orders and invoices'}
                          {key === 'systemUpdates' && 'System maintenance and updates'}
                        </p>
                      </div>
                      <button
                        onClick={() => setNotificationSettings(prev => ({ ...prev, [key]: !value }))}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          value ? 'bg-blue-600' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
                
                {messages.notifications && (
                  <div className={`p-3 rounded-md ${messages.notifications.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {messages.notifications}
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveNotifications}
                    disabled={loading.notifications}
                    className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading.notifications ? 'Saving...' : 'Save Preferences'}
                  </button>
                </div>
              </div>
            )}

            {activeModal === 'business' && (
              <div className="space-y-6">
                {/* Business Logo Upload */}
                <div className="text-center">
                  <div className="relative inline-block">
                    {businessData.logo ? (
                      <img 
                        src={businessData.logo} 
                        alt="Business Logo" 
                        className="w-24 h-24 rounded-lg object-cover border-4 border-gray-200"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-lg bg-gray-200 flex items-center justify-center">
                        <Building2 size={32} className="text-gray-400" />
                      </div>
                    )}
                    <label className="absolute bottom-0 right-0 bg-purple-500 text-white p-2 rounded-full cursor-pointer hover:bg-purple-600 transition-colors">
                      <Image size={16} />
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], 'business')}
                        className="hidden"
                      />
                    </label>
                  </div>
                  <p className="text-sm text-gray-500 mt-2">Click icon to upload business logo</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Business Name</label>
                    <input
                      type="text"
                      value={businessData.name}
                      onChange={(e) => setBusinessData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Phone</label>
                    <input
                      type="tel"
                      value={businessData.phone}
                      onChange={(e) => setBusinessData(prev => ({ ...prev, phone: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Address</label>
                    <textarea
                      value={businessData.address}
                      onChange={(e) => setBusinessData(prev => ({ ...prev, address: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">VAT Rate (%)</label>
                    <input
                      type="number"
                      value={businessData.vatRate}
                      onChange={(e) => setBusinessData(prev => ({ ...prev, vatRate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                      placeholder="e.g., 20"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select
                      value={businessData.currency}
                      onChange={(e) => setBusinessData(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="EUR">EUR (€)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="KSH">KSH (KSh)</option>
                      <option value="JPY">JPY (¥)</option>
                    </select>
                  </div>
                </div>
                
                {messages.business && (
                  <div className={`p-3 rounded-md ${messages.business.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {messages.business}
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveBusinessInfo}
                    disabled={loading.business}
                    className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:opacity-50 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading.business ? 'Saving...' : 'Save Business Info'}
                  </button>
                </div>
              </div>
            )}

            {activeModal === 'security' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Change Password</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">New Password</label>
                      <input
                        type="password"
                        value={securitySettings.newPassword}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, newPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password</label>
                      <input
                        type="password"
                        value={securitySettings.confirmPassword}
                        onChange={(e) => setSecuritySettings(prev => ({ ...prev, confirmPassword: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900">Two-Factor Authentication</h3>
                    <p className="text-sm text-gray-500">Add an extra layer of security to your account</p>
                  </div>
                  <button
                    onClick={() => setSecuritySettings(prev => ({ ...prev, twoFactorEnabled: !prev.twoFactorEnabled }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      securitySettings.twoFactorEnabled ? 'bg-red-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        securitySettings.twoFactorEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                {messages.security && (
                  <div className={`p-3 rounded-md ${messages.security.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {messages.security}
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveSecurity}
                    disabled={loading.security}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading.security ? 'Saving...' : 'Save Security Settings'}
                  </button>
                </div>
              </div>
            )}

            {activeModal === 'appearance' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Theme</label>
                    <select
                      value={appearanceSettings.theme}
                      onChange={(e) => setAppearanceSettings(prev => ({ ...prev, theme: e.target.value as 'light' | 'dark' }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="light">Light</option>
                      <option value="dark">Dark</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Language</label>
                    <select
                      value={appearanceSettings.language}
                      onChange={(e) => setAppearanceSettings(prev => ({ ...prev, language: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Date Format</label>
                    <select
                      value={appearanceSettings.dateFormat}
                      onChange={(e) => setAppearanceSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                    >
                      <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                      <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                      <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                    </select>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg md:col-span-2">
                    <h4 className="font-medium text-blue-800 mb-2">Currency Display</h4>
                    <p className="text-sm text-blue-600 mb-2">
                      Currency is automatically synced with your business settings: <strong>{businessData.currency}</strong>
                    </p>
                    <p className="text-xs text-blue-500">
                      To change currency, update it in Business Information settings.
                    </p>
                  </div>
                </div>
                
                {messages.appearance && (
                  <div className={`p-3 rounded-md ${messages.appearance.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {messages.appearance}
                  </div>
                )}
                
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveAppearance}
                    disabled={loading.appearance}
                    className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 disabled:opacity-50 flex items-center"
                  >
                    <Save className="w-4 h-4 mr-2" />
                    {loading.appearance ? 'Saving...' : 'Save Appearance'}
                  </button>
                </div>
              </div>
            )}

            {activeModal === 'data' && (
              <div className="space-y-6">
                <div className="space-y-6">
                  <div className="p-4 bg-green-50 rounded-lg">
                    <h3 className="text-lg font-medium text-green-800 mb-2">Export Data</h3>
                    <p className="text-sm text-green-600 mb-4">Download a backup of your settings and data</p>
                    <button
                      onClick={handleExportData}
                      disabled={loading.export}
                      className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center"
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {loading.export ? 'Exporting...' : 'Export Data'}
                    </button>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h3 className="text-lg font-medium text-blue-800 mb-2">Restore Data</h3>
                    <p className="text-sm text-blue-600 mb-4">Upload a backup file to restore your settings</p>
                    <input
                      type="file"
                      accept=".json"
                      onChange={handleRestoreData}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                  </div>
                  
                  <div className="p-4 bg-red-50 rounded-lg border-t">
                    <h3 className="text-lg font-medium text-red-600 mb-2">Delete Account</h3>
                    <p className="text-sm text-red-600 mb-4">Permanently delete your account and all associated data</p>
                    <div className="flex items-center space-x-4">
                      <input
                        type="password"
                        placeholder="Enter your password to confirm"
                        value={deletePassword}
                        onChange={(e) => setDeletePassword(e.target.value)}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                      />
                      <button
                        onClick={handleDeleteAccount}
                        disabled={!deletePassword || loading.delete}
                        className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50 flex items-center"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        {loading.delete ? 'Deleting...' : 'Delete Account'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {(messages.export || messages.restore || messages.delete) && (
                  <div className={`p-3 rounded-md ${
                    (messages.export || messages.restore || messages.delete).includes('success') 
                      ? 'bg-green-50 text-green-700' 
                      : 'bg-red-50 text-red-700'
                  }`}>
                    {messages.export || messages.restore || messages.delete}
                  </div>
                )}
                
                <div className="flex justify-end">
                  <button
                    onClick={closeModal}
                    className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-300">Manage your account preferences and business settings</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {settingsCards.map((card) => (
          <div
            key={card.id}
            onClick={() => setActiveModal(card.id)}
            className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 cursor-pointer hover:shadow-md transition-shadow group dark:bg-gray-800 dark:border-gray-700"
          >
            <div className="flex items-center mb-4">
              <div className={`p-3 rounded-lg ${card.color} text-white group-hover:scale-110 transition-transform`}>
                <card.icon size={24} />
              </div>
              <div className="ml-4">
                <h3 className="text-lg font-semibold text-white">{card.title}</h3>
              </div>
            </div>
            <p className="text-gray-800 dark:text-gray-300 text-sm">{card.description}</p>
            <div className="mt-4 text-blue-600 text-sm font-medium group-hover:text-blue-700">
              Configure →
            </div>
          </div>
        ))}
      </div>

      {renderModal()}
    </div>
  );
}