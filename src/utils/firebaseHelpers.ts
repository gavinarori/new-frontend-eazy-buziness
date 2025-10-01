import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  query, 
  where, 
  orderBy,
  Timestamp,
  setDoc
} from 'firebase/firestore';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { auth, db } from '../config/firebase';
import { User, Product, Invoice, Shop, Supply, Sale } from '../types';

// User Management - Create user document without Firebase Auth
export const createUserDocument = async (userData: {
  email: string;
  name: string;
  role: 'super_admin' | 'shop_admin' | 'staff';
  shopId?: string;
  permissions: string[];
  isActive?: boolean;
  salesTarget?: number;
  commissionRate?: number;
  phone?: string;
}) => {
  try {
    // Create a temporary user document with a generated ID
    const userDocRef = doc(collection(db, 'users'));
    const userId = userDocRef.id;
    
    await setDoc(userDocRef, {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      shopId: userData.shopId,
      permissions: userData.permissions,
      isActive: userData.isActive ?? false, // Default to false - needs activation
      salesTarget: userData.salesTarget || 100,
      commissionRate: userData.commissionRate || 5,
      phone: userData.phone || '',
      createdAt: Timestamp.now(),
      needsAuthSetup: true, // Flag to indicate user needs to set up Firebase Auth
    });

    return userId;
  } catch (error) {
    console.error('Error creating user document:', error);
    throw error;
  }
};

// User Management - Create user with Firebase Auth (legacy function)
export const createUser = async (userData: {
  email: string;
  password: string;
  name: string;
  role: 'super_admin' | 'shop_admin' | 'staff';
  shopId?: string;
  permissions: string[];
  isActive?: boolean;
  salesTarget?: number;
  commissionRate?: number;
  phone?: string;
}) => {
  try {
    // Create the new user (this will log out current user)
    const userCredential = await createUserWithEmailAndPassword(auth, userData.email, userData.password);
    const userId = userCredential.user.uid;

    await setDoc(doc(db, 'users', userId), {
      name: userData.name,
      email: userData.email,
      role: userData.role,
      shopId: userData.shopId,
      permissions: userData.permissions,
      isActive: userData.isActive ?? true, // Default to true for backward compatibility
      salesTarget: userData.salesTarget || 100,
      commissionRate: userData.commissionRate || 5,
      phone: userData.phone || '',
      createdAt: Timestamp.now(),
    });

    // Immediately sign out the newly created user
    await signOut(auth);
    
    // Return the created user ID
    return userId;
  } catch (error) {
    console.error('Error creating user:', error);
    throw error;
  }
};

// Product Management
export const addProduct = async (productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>) => {
  try {
    const docRef = await addDoc(collection(db, 'products'), {
      ...productData,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding product:', error);
    throw error;
  }
};

export const updateProduct = async (productId: string, updates: Partial<Product>) => {
  try {
    await updateDoc(doc(db, 'products', productId), {
      ...updates,
      updatedAt: Timestamp.now()
    });
  } catch (error) {
    console.error('Error updating product:', error);
    throw error;
  }
};

export const deleteProduct = async (productId: string) => {
  try {
    await deleteDoc(doc(db, 'products', productId));
  } catch (error) {
    console.error('Error deleting product:', error);
    throw error;
  }
};

// Invoice Management
export const createInvoice = async (invoiceData: Omit<Invoice, 'id' | 'createdAt'>) => {
  try {
    // Convert Date objects to Timestamps for Firestore
    const firestoreData = {
      ...invoiceData,
      dueDate: Timestamp.fromDate(invoiceData.dueDate),
      createdAt: Timestamp.now(),
      ...(invoiceData.paidAt && { paidAt: Timestamp.fromDate(invoiceData.paidAt) })
    };
    
    const docRef = await addDoc(collection(db, 'invoices'), {
      ...firestoreData
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating invoice:', error);
    throw error;
  }
};

export const updateInvoice = async (invoiceId: string, updates: Partial<Invoice>) => {
  try {
    const updateData: any = { ...updates };
    if (updates.paidAt) {
      updateData.paidAt = Timestamp.fromDate(updates.paidAt);
    }
    if (updates.dueDate) {
      updateData.dueDate = Timestamp.fromDate(updates.dueDate);
    }
    await updateDoc(doc(db, 'invoices', invoiceId), updateData);
  } catch (error) {
    console.error('Error updating invoice:', error);
    throw error;
  }
};

export const deleteInvoice = async (invoiceId: string) => {
  try {
    await deleteDoc(doc(db, 'invoices', invoiceId));
  } catch (error) {
    console.error('Error deleting invoice:', error);
    throw error;
  }
};

// Sale Management (Instant Sales/POS)
export const createSale = async (saleData: Omit<Sale, 'id' | 'createdAt'>) => {
  try {
    const firestoreData = {
      ...saleData,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'sales'), {
      ...firestoreData
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating sale:', error);
    throw error;
  }
};

export const updateSale = async (saleId: string, updates: Partial<Sale>) => {
  try {
    const updateData: any = { ...updates };
    await updateDoc(doc(db, 'sales', saleId), updateData);
  } catch (error) {
    console.error('Error updating sale:', error);
    throw error;
  }
};

export const deleteSale = async (saleId: string) => {
  try {
    await deleteDoc(doc(db, 'sales', saleId));
  } catch (error) {
    console.error('Error deleting sale:', error);
    throw error;
  }
};

// Shop Management
export const createShop = async (shopData: {
  name: string;
  address: string;
  phone: string;
  adminId?: string;
  isActive?: boolean;
  vatRate?: number;
  currency?: string;
  registeredBy?: string;
}) => {
  try {
    const docRef = await addDoc(collection(db, 'shops'), {
      ...shopData,
      isActive: shopData.isActive ?? true, // Default to true for backward compatibility
      vatRate: shopData.vatRate || 10,
      currency: shopData.currency || 'USD',
      createdAt: Timestamp.now(),
    });
    return docRef.id;
  } catch (error) {
    console.error('Error creating shop:', error);
    throw error;
  }
};

export const updateShop = async (shopId: string, updates: Partial<Shop>) => {
  try {
    const updateData = { ...updates };
    delete updateData.id; // Remove id from updates
    delete updateData.createdAt; // Remove createdAt from updates
    
    console.log('Updating shop with data:', updateData);
    await updateDoc(doc(db, 'shops', shopId), updateData);
    console.log('Shop updated successfully in Firestore');
  } catch (error) {
    console.error('Error updating shop:', error);
    throw error;
  }
};

export const deleteShop = async (shopId: string) => {
  try {
    await deleteDoc(doc(db, 'shops', shopId));
  } catch (error) {
    console.error('Error deleting shop:', error);
    throw error;
  }
};

// User Management - Delete
export const deleteUser = async (userId: string) => {
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    console.error('Error deleting user:', error);
    throw error;
  }
};

export const updateUser = async (userId: string, updates: any) => {
  try {
    const updateData = { ...updates };
    // Clean up fields that shouldn't be updated
    delete updateData.id;
    delete updateData.createdAt;
    delete updateData.email; // Don't update email through this function
    
    console.log('Updating user:', userId, 'with data:', JSON.stringify(updateData, null, 2));
    await updateDoc(doc(db, 'users', userId), updateData);
    console.log('User updated successfully in Firestore');
  } catch (error) {
    console.error('Error updating user:', error);
    console.error('Update data was:', updates);
    throw error;
  }
};

// Supply Management
export const addSupply = async (supplyData: any) => {
  try {
    const firestoreData = {
      ...supplyData,
      receivedAt: supplyData.receivedAt instanceof Date ? Timestamp.fromDate(supplyData.receivedAt) : supplyData.receivedAt,
      createdAt: Timestamp.now()
    };
    
    const docRef = await addDoc(collection(db, 'supplies'), {
      ...firestoreData
    });
    
    console.log('Supply added to Firestore:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error adding supply:', error);
    throw error;
  }
};

export const updateSupply = async (supplyId: string, updates: any) => {
  try {
    const updateData: any = { ...updates };
    if (updates.receivedAt && updates.receivedAt instanceof Date) {
      updateData.receivedAt = Timestamp.fromDate(updates.receivedAt);
    }
    await updateDoc(doc(db, 'supplies', supplyId), updateData);
    console.log('Supply updated in Firestore:', supplyId);
  } catch (error) {
    console.error('Error updating supply:', error);
    throw error;
  }
};

export const deleteSupply = async (supplyId: string) => {
  try {
    await deleteDoc(doc(db, 'supplies', supplyId));
  } catch (error) {
    console.error('Error deleting supply:', error);
    throw error;
  }
};

// Category Management
export const addCategory = async (categoryData: { name: string; shopId: string }) => {
  try {
    const docRef = await addDoc(collection(db, 'categories'), {
      ...categoryData,
      createdAt: Timestamp.now()
    });
    return docRef.id;
  } catch (error) {
    console.error('Error adding category:', error);
    throw error;
  }
};

export const deleteCategory = async (categoryId: string) => {
  try {
    await deleteDoc(doc(db, 'categories', categoryId));
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
};

// Data Fetching
export const getShopProducts = async (shopId: string) => {
  try {
    const q = query(
      collection(db, 'products'),
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

export const getShopInvoices = async (shopId: string) => {
  try {
    const q = query(
      collection(db, 'invoices'),
      where('shopId', '==', shopId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching invoices:', error);
    throw error;
  }
};

export const getShopSupplies = async (shopId: string) => {
  try {
    const q = query(
      collection(db, 'supplies'),
      where('shopId', '==', shopId),
      orderBy('receivedAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('Error fetching supplies:', error);
    throw error;
  }
};