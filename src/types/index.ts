export interface User {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'shop_admin' | 'staff';
  shopId?: string;
  permissions: string[];
  salesTarget?: number;
  commissionRate?: number;
  phone?: string;
  profilePhoto?: string;
  createdAt: Date;
  isActive: boolean;
  notificationSettings?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    smsNotifications: boolean;
    lowStockAlerts: boolean;
    orderUpdates: boolean;
    systemUpdates: boolean;
  };
  appearanceSettings?: {
    theme: 'light' | 'dark';
    language: string;
    dateFormat: string;
    currency: string;
  };
  twoFactorEnabled?: boolean;
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string;
  adminId?: string;
  vatRate?: number;
  currency?: string;
  logo?: string;
  createdAt: Date;
  isActive: boolean;
  registeredBy?: string; // User ID who registered this business
  approvedBy?: string; // Super admin who approved this business
  approvedAt?: Date; // When the business was approved
}

export interface Supply {
  id: string;
  supplierName: string;
  productId: string;
  productName: string;
  quantity: number;
  unitCost?: number;
  totalCost?: number;
  cost?: number;
  total?: number;
  receivedAt: Date;
  status: 'received' | 'pending' | 'cancelled';
  notes?: string;
  shopId: string;
  createdBy: string;
  createdAt: Date;
}

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  cost: number;
  sku: string;
  category: string;
  images: string[];
  stock: number;
  minStock: number;
  shopId: string;
  createdAt: Date;
  updatedAt: Date;
  barcode?: string;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  shopId: string;
  customerId?: string;
  customerName: string;
  customerEmail?: string;
  items: InvoiceItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: 'paid' | 'pending' | 'overdue';
  createdBy: string;
  createdAt: Date;
  dueDate: Date;
  paidAt?: Date;
}

export interface InvoiceItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}


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
  invoiceId?: string; // Linked invoice ID if an invoice was generated from this sale
}

export interface SaleItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'error';
  read: boolean;
  createdAt: Date;
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



export interface CartItem {
  product: Product;
  quantity: number;
}

export interface Order {
  id: string;
  items: CartItem[];
  total: number;
  paymentMethod: PaymentMethod;
  timestamp: Date;
  status: 'pending' | 'completed' | 'cancelled';
}

export type PaymentMethod = 'cash' | 'card' | 'digital';

export interface PaymentDetails {
  method: PaymentMethod;
  amount: number;
  change?: number;
}