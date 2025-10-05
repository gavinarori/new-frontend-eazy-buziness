// Re-export types from API client for consistency
export type {
  User,
  Shop,
  Product,
  Invoice,
  Category,
  Supply,
  Notification,
  Order,
} from '../services/apiClient';

// Additional types for UI components
export interface CartItem {
  product: Product;
  quantity: number;
}

export type PaymentMethod = 'cash' | 'card' | 'digital';

export interface PaymentDetails {
  method: PaymentMethod;
  amount: number;
  change?: number;
}

export interface BarcodeScanner {
  isConnected: boolean;
  deviceName?: string;
  lastScanned?: string;
  timestamp?: Date;
}

export interface ScanResult {
  barcode: string;
  timestamp: Date;
  format?: string;
}

export interface PrinterConfig {
  deviceName?: string;
  isConnected: boolean;
  paperWidth: number;
  characterWidth: number;
}

export interface PrintJob {
  type: 'receipt' | 'label' | 'report';
  content: string;
  copies?: number;
}

// Legacy types for backward compatibility
export interface Sale {
  id: string;
  saleNumber: string;
  shopId: string;
  customerName?: string;
  items: SaleItem[];
  subtotal: number;
  tax: number;
  total: number;
  paymentMethod: 'cash' | 'card' | 'mobile' | 'bank_transfer';
  createdBy: string;
  createdAt: Date;
  invoiceId?: string;
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}