import { useState, useEffect } from 'react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  DocumentData,
  QueryConstraint,
  Timestamp,
  limit
} from 'firebase/firestore';
import { db } from '../config/firebase';
import { User, Shop, Sale } from '../types';

// Cache for storing fetched data
const dataCache = new Map();
const CACHE_DURATION = 30 * 1000; // 30 seconds for faster updates

export const useFirestore = <T = DocumentData>(
  collectionName: string, 
  constraints: QueryConstraint[] = [],
  enableCache: boolean = true
) => {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const cacheKey = `${collectionName}_${JSON.stringify(constraints)}`;
    
    // Check cache first
    if (enableCache) {
      const cached = dataCache.get(cacheKey);
      if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
        setData(cached.data);
        setLoading(false);
        return;
      }
    }

    const q = query(collection(db, collectionName), ...constraints);
    
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const documents = querySnapshot.docs.map(doc => {
          const data = doc.data();
          // Convert Firestore Timestamps to Date objects
          Object.keys(data).forEach(key => {
            if (data[key] instanceof Timestamp) {
              data[key] = data[key].toDate();
            }
          });
          return {
            id: doc.id,
            ...data
          };
        }) as T[];
        
        // Cache the data
        if (enableCache) {
          dataCache.set(cacheKey, {
            data: documents,
            timestamp: Date.now()
          });
        }
        
        setData(documents);
        setLoading(false);
        setError(null);
        
        console.log(`${collectionName} data updated:`, documents.length, 'items');
      },
      (err) => {
        console.error(`Error fetching ${collectionName}:`, err);
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [collectionName, JSON.stringify(constraints), enableCache]);

  return { data, loading, error };
};

// Specific hooks for different collections
export const useProducts = (shopId?: string) => {
  const constraints = shopId ? [where('shopId', '==', shopId)] : [];
  return useFirestore('products', constraints);
};

export const useInvoices = (shopId?: string) => {
  const constraints = shopId ? [where('shopId', '==', shopId), limit(50)] : [limit(50)];
  return useFirestore('invoices', constraints);
};

export const useSupplies = (shopId?: string) => {
  const constraints = shopId ? [where('shopId', '==', shopId), limit(50)] : [limit(50)];
  return useFirestore('supplies', constraints);
};

export const useUsers = (shopId?: string) => {
  const constraints = shopId ? [where('shopId', '==', shopId)] : [];
  return useFirestore<User>('users', constraints);
};

export const useShops = () => {
  return useFirestore<Shop>('shops', []);
};

export const useCategories = (shopId?: string) => {
  const constraints = shopId ? [where('shopId', '==', shopId)] : [];
  return useFirestore('categories', constraints);
};

export const useSales = (shopId?: string) => {
  const constraints = shopId ? [where('shopId', '==', shopId), limit(100)] : [limit(100)];
  return useFirestore<Sale>('sales', constraints);
};