export type ProductCategory =
  | 'Flour & Rice'
  | 'Biscuits & Snacks'
  | 'Oils & Ghee'
  | 'Masala & Spices'
  | 'Dairy'
  | 'Personal Care'
  | 'Beverages'
  | 'Dals & Pulses'
  | 'Sugar & Salt';

export type ProductUnit = 'kg' | 'g' | 'litre' | 'ml' | 'packet' | 'piece' | 'box';

export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

export interface Product {
  id: string;
  name: string;
  tamilName?: string;
  category: ProductCategory;
  quantity: number;
  unit: ProductUnit;
  sellingPrice: number;
  costPrice: number;
  minStock: number;
  image?: string;
  sku?: string;
}

export interface TransactionItem {
  productId: string;
  productName: string;
  quantity: number;
  unit: ProductUnit;
  unitPrice: number;
  lineTotal: number;
}

export type PaymentMethod = 'Cash' | 'UPI / GPay' | 'Credit (Kadai Khata)';

export interface Transaction {
  id: string;
  timestamp: string; // ISO string
  items: TransactionItem[];
  total: number;
  paymentMethod: PaymentMethod;
  customerName?: string;
  itemCount: number;
}

export interface CreditCustomer {
  id: string;
  name: string;
  phone: string;
  balance: number; // outstanding amount
  lastPurchased: string;
  notes?: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  quickAction?: {
    label: string;
    actionType: 'navigate_inventory' | 'navigate_sales' | 'open_add_product' | 'filter_low_stock';
  };
  dataPayload?: {
    type: 'low_stock' | 'sales_summary' | 'top_products' | 'price_info' | 'credit_list';
    data?: any;
  };
  source?: 'gemini' | 'fallback';
  fallbackReason?: string;
}

export type TimePeriod = 'today' | '7days' | '30days';
