import React from 'react';
// import { Link } from 'react-router-dom';
import { Clock, Mail, CheckCircle, Building2, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const PendingApproval: React.FC = () => {
  const { userData, logout } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-yellow-50 to-orange-100 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock size={40} className="text-yellow-600" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-2">Account Pending Approval</h1>
            <p className="text-gray-600">Your business registration is being reviewed</p>
          </div>

          {/* User Info */}
          {userData && (
            <div className="bg-gray-50 rounded-lg p-6 mb-8">
              <div className="flex items-center mb-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                  <Building2 size={24} className="text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-800">{userData.name}</h2>
                  <p className="text-gray-600">{userData.email}</p>
                  <p className="text-sm text-gray-500 capitalize">{userData.role?.replace('_', ' ')}</p>
                </div>
              </div>
            </div>
          )}

          {/* Status Information */}
          <div className="space-y-6 mb-8">
            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <CheckCircle size={20} className="text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Registration Submitted</h3>
                <p className="text-gray-600 text-sm">Your business registration has been successfully submitted.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Clock size={20} className="text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800">Under Review</h3>
                <p className="text-gray-600 text-sm">Our team is currently reviewing your business information and will approve your account shortly.</p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                <Mail size={20} className="text-gray-400" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-400">Email Notification</h3>
                <p className="text-gray-500 text-sm">You'll receive an email notification once your account is approved and activated.</p>
              </div>
            </div>
          </div>

          {/* What's Next */}
          <div className="bg-blue-50 rounded-lg p-6 mb-8">
            <h3 className="font-semibold text-blue-800 mb-3">What happens next?</h3>
            <ul className="text-sm text-blue-700 space-y-2">
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                Our team will review your business registration within 24-48 hours
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                You'll receive an email notification once your account is approved
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                After approval, you can log in and start managing your business
              </li>
              <li className="flex items-start">
                <span className="w-1.5 h-1.5 bg-blue-600 rounded-full mt-2 mr-3 flex-shrink-0"></span>
                You'll be able to add staff members, manage inventory, and create invoices
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-4">
            <button
              onClick={handleLogout}
              className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center space-x-2"
            >
              <ArrowLeft size={20} />
              <span>Sign Out</span>
            </button>
            
            <button
              onClick={handleLogout}
              className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2 text-center"
            >
              <span>Back to Login</span>
            </button>
          </div>

          {/* Contact Support */}
          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-sm text-gray-600">
              Need help or have questions?{' '}
              <a href="mailto:support@easybizness.com" className="text-blue-600 hover:text-blue-700 font-medium">
                Contact Support
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PendingApproval;