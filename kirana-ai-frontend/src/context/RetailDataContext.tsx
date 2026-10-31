import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  Product,
  Transaction,
  CreditCustomer,
  PaymentMethod,
  TimePeriod,
  StockStatus,
  TransactionItem,
} from '../types/retail';
import { getStockStatus } from '../utils/formatting';
import { api } from '../api';

export type NavPage = 'assistant' | 'inventory' | 'dashboard' | 'sales';

interface TopSellingItem {
  name: string;
  category: string;
  quantitySold: number;
  unit: string;
  totalRevenue: number;
}

interface ChartPoint {
  label: string;
  sales: number;
  transactions: number;
}

interface RetailContextType {
  activePage: NavPage;
  setActivePage: (page: NavPage) => void;
  products: Product[];
  transactions: Transaction[];
  creditCustomers: CreditCustomer[];

  // Modal controls for quick actions from assistant or buttons
  isAddProductModalOpen: boolean;
  openAddProductModal: (prefill?: Partial<Product>) => void;
  closeAddProductModal: () => void;
  addProductPrefill?: Partial<Product>;

  isRecordSaleModalOpen: boolean;
  openRecordSaleModal: () => void;
  closeRecordSaleModal: () => void;

  // Selected transaction for details modal
  selectedTransaction: Transaction | null;
  setSelectedTransaction: (txn: Transaction | null) => void;

  // Inventory filtering state that can be linked from assistant
  inventoryFilterStatus: StockStatus | 'all';
  setInventoryFilterStatus: (status: StockStatus | 'all') => void;
  inventorySearchQuery: string;
  setInventorySearchQuery: (query: string) => void;

  // Actions
  addProduct: (newProduct: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: string, updates: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  recordSale: (
    items: { productId: string; quantity: number }[],
    paymentMethod: PaymentMethod,
    customerName?: string
  ) => Promise<{ success: boolean; error?: string; transaction?: Transaction }>;
  refresh: () => Promise<void>;
  isLoading: boolean;
  apiError: string | null;

  // Derived metrics
  totalProductsCount: number;
  inStockCount: number;
  lowStockCount: number;
  outOfStockCount: number;
  lowStockItems: Product[];
  outOfStockItems: Product[];

  todaySales: number;
  todayTransactions: Transaction[];
  todayTransactionsCount: number;
  
  totalSales: number;
  totalTransactionsCount: number;
  averageBill: number;
  topCategory: string;
  topSellingProducts: TopSellingItem[];
  getChartData: (period: TimePeriod) => ChartPoint[];
}

const RetailDataContext = createContext<RetailContextType | undefined>(undefined);

export const RetailDataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activePage, setActivePage] = useState<NavPage>('assistant'); // AI Assistant is default landing page

  // Modals
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [addProductPrefill, setAddProductPrefill] = useState<Partial<Product> | undefined>(undefined);
  const [isRecordSaleModalOpen, setIsRecordSaleModalOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Filter cross-links
  const [inventoryFilterStatus, setInventoryFilterStatus] = useState<StockStatus | 'all'>('all');
  const [inventorySearchQuery, setInventorySearchQuery] = useState('');

  // Data lives in the backend database; the context just mirrors it.
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [creditCustomers, setCreditCustomers] = useState<CreditCustomer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);

  const refresh = async () => {
    try {
      const [p, t, c] = await Promise.all([api.listProducts(), api.listSales(), api.listCustomers()]);
      setProducts(p);
      setTransactions(t);
      setCreditCustomers(c);
      setApiError(null);
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Could not load data from the server.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  // Modal helpers
  const openAddProductModal = (prefill?: Partial<Product>) => {
    setAddProductPrefill(prefill);
    setIsAddProductModalOpen(true);
  };
  const closeAddProductModal = () => {
    setIsAddProductModalOpen(false);
    setAddProductPrefill(undefined);
  };

  const openRecordSaleModal = () => setIsRecordSaleModalOpen(true);
  const closeRecordSaleModal = () => setIsRecordSaleModalOpen(false);

  // Derived stock counts
  const { totalProductsCount, inStockCount, lowStockCount, outOfStockCount, lowStockItems, outOfStockItems } =
    useMemo(() => {
      let inStock = 0;
      let low = 0;
      let out = 0;
      const lowItems: Product[] = [];
      const outItems: Product[] = [];

      products.forEach((p) => {
        const status = getStockStatus(p);
        if (status === 'in_stock') inStock++;
        else if (status === 'low_stock') {
          low++;
          lowItems.push(p);
        } else {
          out++;
          outItems.push(p);
        }
      });

      return {
        totalProductsCount: products.length,
        inStockCount: inStock,
        lowStockCount: low,
        outOfStockCount: out,
        lowStockItems: lowItems,
        outOfStockItems: outItems,
      };
    }, [products]);

  // Derived sales metrics
  const isToday = (isoDate: string) => {
    const d = new Date(isoDate);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  };

  const todayTransactions = useMemo(() => {
    return transactions.filter((t) => isToday(t.timestamp));
  }, [transactions]);

  const todaySales = useMemo(() => {
    return todayTransactions.reduce((acc, t) => acc + t.total, 0);
  }, [todayTransactions]);

  const totalSales = useMemo(() => {
    return transactions.reduce((acc, t) => acc + t.total, 0);
  }, [transactions]);

  const totalTransactionsCount = transactions.length;
  const todayTransactionsCount = todayTransactions.length;
  const averageBill = totalTransactionsCount > 0 ? Math.round(totalSales / totalTransactionsCount) : 0;

  // Category breakdown & Top selling products
  const { topCategory, topSellingProducts } = useMemo(() => {
    const categoryRevenueMap: Record<string, number> = {};
    const productSoldMap: Record<string, { quantity: number; revenue: number; name: string; unit: string; category: string }> = {};

    transactions.forEach((tx) => {
      tx.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.productId);
        const cat = prod?.category || 'General';
        categoryRevenueMap[cat] = (categoryRevenueMap[cat] || 0) + item.lineTotal;

        if (!productSoldMap[item.productId]) {
          productSoldMap[item.productId] = {
            quantity: 0,
            revenue: 0,
            name: item.productName,
            unit: item.unit,
            category: cat,
          };
        }
        productSoldMap[item.productId].quantity += item.quantity;
        productSoldMap[item.productId].revenue += item.lineTotal;
      });
    });

    let maxCat = 'Flour & Rice';
    let maxCatRev = 0;
    Object.entries(categoryRevenueMap).forEach(([cat, rev]) => {
      if (rev > maxCatRev) {
        maxCatRev = rev;
        maxCat = cat;
      }
    });

    const topSelling: TopSellingItem[] = Object.values(productSoldMap)
      .sort((a, b) => b.quantity - a.quantity)
      .map((item) => ({
        name: item.name,
        category: item.category,
        quantitySold: item.quantity,
        unit: item.unit,
        totalRevenue: item.revenue,
      }));

    return {
      topCategory: maxCat,
      topSellingProducts: topSelling,
    };
  }, [transactions, products]);

  // Sales Chart Generator — built purely from recorded transactions
  const getChartData = (period: TimePeriod): ChartPoint[] => {
    const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const DAY_MS = 24 * 60 * 60 * 1000;
    const todayStart = startOfDay(new Date());
    const daysAgo = (iso: string) => Math.round((todayStart - startOfDay(new Date(iso))) / DAY_MS);

    if (period === 'today') {
      // 8 two-hour buckets from 6 AM to 10 PM (earlier/later sales fold into the first/last bucket)
      const labels = ['6 AM', '8 AM', '10 AM', '12 PM', '2 PM', '4 PM', '6 PM', '8 PM'];
      const points: ChartPoint[] = labels.map((label) => ({ label, sales: 0, transactions: 0 }));
      todayTransactions.forEach((tx) => {
        const h = new Date(tx.timestamp).getHours();
        const idx = Math.min(labels.length - 1, Math.max(0, Math.floor((h - 6) / 2)));
        points[idx].sales += tx.total;
        points[idx].transactions += 1;
      });
      return points;
    }

    if (period === '7days') {
      // Last 7 calendar days, oldest first, ending today
      const points: ChartPoint[] = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(todayStart - (6 - i) * DAY_MS);
        return {
          label: d.toLocaleDateString('en-IN', { weekday: 'short' }),
          sales: 0,
          transactions: 0,
        };
      });
      transactions.forEach((tx) => {
        const ago = daysAgo(tx.timestamp);
        if (ago >= 0 && ago <= 6) {
          points[6 - ago].sales += tx.total;
          points[6 - ago].transactions += 1;
        }
      });
      return points;
    }

    // 30 days: five 6-day buckets, oldest first, ending today
    const BUCKET_DAYS = 6;
    const BUCKETS = 5;
    const points: ChartPoint[] = Array.from({ length: BUCKETS }, (_, i) => {
      const startDay = new Date(todayStart - ((BUCKETS - i) * BUCKET_DAYS - 1) * DAY_MS);
      return {
        label: startDay.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }),
        sales: 0,
        transactions: 0,
      };
    });
    transactions.forEach((tx) => {
      const ago = daysAgo(tx.timestamp);
      if (ago >= 0 && ago < BUCKETS * BUCKET_DAYS) {
        const idx = BUCKETS - 1 - Math.floor(ago / BUCKET_DAYS);
        points[idx].sales += tx.total;
        points[idx].transactions += 1;
      }
    });
    return points;
  };

  // CRUD actions: call the API, then reload so the UI always shows what the database holds.
  const addProduct = async (data: Omit<Product, 'id'>) => {
    await api.createProduct(data);
    await refresh();
  };

  const updateProduct = async (id: string, updates: Partial<Product>) => {
    await api.updateProduct(id, updates);
    await refresh();
  };

  const deleteProduct = async (id: string) => {
    await api.deleteProduct(id);
    await refresh();
  };

  // The backend checks stock, deducts inventory and updates khata atomically.
  const recordSale = async (
    saleItems: { productId: string; quantity: number }[],
    paymentMethod: PaymentMethod,
    customerName?: string
  ): Promise<{ success: boolean; error?: string; transaction?: Transaction }> => {
    if (!saleItems.length) {
      return { success: false, error: 'Please add at least one item to the sale.' };
    }
    try {
      const transaction = await api.createSale({
        items: saleItems,
        paymentMethod,
        customerName: customerName?.trim() || undefined,
      });
      await refresh();
      return { success: true, transaction };
    } catch (err) {
      return { success: false, error: err instanceof Error ? err.message : 'Failed to complete sale' };
    }
  };

  return (
    <RetailDataContext.Provider
      value={{
        activePage,
        setActivePage,
        products,
        transactions,
        creditCustomers,

        isAddProductModalOpen,
        openAddProductModal,
        closeAddProductModal,
        addProductPrefill,

        isRecordSaleModalOpen,
        openRecordSaleModal,
        closeRecordSaleModal,

        selectedTransaction,
        setSelectedTransaction,

        inventoryFilterStatus,
        setInventoryFilterStatus,
        inventorySearchQuery,
        setInventorySearchQuery,

        addProduct,
        updateProduct,
        deleteProduct,
        recordSale,
        refresh,
        isLoading,
        apiError,

        totalProductsCount,
        inStockCount,
        lowStockCount,
        outOfStockCount,
        lowStockItems,
        outOfStockItems,

        todaySales,
        todayTransactions,
        todayTransactionsCount,

        totalSales,
        totalTransactionsCount,
        averageBill,
        topCategory,
        topSellingProducts,
        getChartData,
      }}
    >
      {children}
    </RetailDataContext.Provider>
  );
};

export const useRetailData = (): RetailContextType => {
  const context = useContext(RetailDataContext);
  if (!context) {
    throw new Error('useRetailData must be used within a RetailDataProvider');
  }
  return context;
};
