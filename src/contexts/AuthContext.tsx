import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, setDoc, enableNetwork, connectFirestoreEmulator } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { User } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userData: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loading: boolean;
  firestoreError: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [needsSetup, setNeedsSetup] = useState(false);
  const [firestoreError, setFirestoreError] = useState<string | null>(null);

  const login = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  };

  const logout = async () => {
    await signOut(auth);
  };

  // Initialize Firestore connection
  useEffect(() => {
    const initializeFirestore = async () => {
      try {
        // Try to enable network connection
        await enableNetwork(db);
        console.log('Firestore network enabled successfully');
      } catch (error) {
        console.error('Firestore initialization error:', error);
        setFirestoreError('Firestore database is not properly configured. Please enable Firestore in your Firebase console.');
      }
    };

    initializeFirestore();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          console.log('User authenticated:', user.email);
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const userData = { id: user.uid, ...userDoc.data() } as User;
            console.log('User data loaded:', userData);
            
            // Check if user account is active
            if (userData.isActive === false) {
              console.log('User account is inactive, redirecting to pending approval');
              setUserData(userData); // Still set user data so we can show pending page
            } else {
              setUserData(userData);
            }
            setFirestoreError(null);
          } else {
            console.error('User document not found in Firestore for:', user.email);
            console.error('User document not found. This should not happen with the new registration flow.');
            await signOut(auth);
            setUserData(null);
          }
        } catch (error) {
          console.error('Error fetching user data:', error);
          if (error instanceof Error) {
            if (error.message.includes('Missing or insufficient permissions') || 
                error.message.includes('PERMISSION_DENIED')) {
              setFirestoreError('Firestore security rules need to be configured. Please check your Firebase console.');
            } else if (error.message.includes('UNAVAILABLE') || 
                      error.message.includes('FAILED_PRECONDITION')) {
              setFirestoreError('Firestore database is not enabled. Please enable Firestore in your Firebase console.');
            }
          }
        }
      } else {
        setUserData(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    userData,
    login,
    logout,
    loading,
    firestoreError
  };

  return (
    <AuthContext.Provider value={value}>
      {loading ? (
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
        </div>
      ) : firestoreError ? (
        <div className="min-h-screen bg-red-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-red-600 text-2xl">⚠️</span>
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-4">Firestore Setup Required</h1>
            <p className="text-gray-600 mb-6">{firestoreError}</p>
            <div className="bg-gray-50 rounded-lg p-4 text-left">
              <h3 className="font-semibold text-gray-800 mb-2">To fix this:</h3>
              <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                <li>Go to <a href="https://console.firebase.google.com" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">Firebase Console</a></li>
                <li>Select your project: <strong>nduthigang-a4b32</strong></li>
                <li>Click "Firestore Database" in the left menu</li>
                <li>Click "Create database"</li>
                <li>Choose "Start in test mode" for now</li>
                <li>Select a location and click "Done"</li>
              </ol>
            </div>
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