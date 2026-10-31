import { Product, StockStatus } from '../types/retail';

/**
 * Format numbers in Indian Rupee currency format (e.g., ₹1,450 or ₹1,450.50)
 */
export function formatINR(amount: number, showDecimals: boolean = false): string {
  if (isNaN(amount) || amount === null || amount === undefined) return '₹0';
  
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: showDecimals ? 2 : 0,
    minimumFractionDigits: showDecimals ? 2 : 0,
  }).format(amount);
}

/**
 * Format date time into friendly human readable format
 */
export function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return 'Just now';
  }
}

export function formatDate(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return 'Today';
  }
}

export function formatDateTime(isoString: string): string {
  return `${formatDate(isoString)} at ${formatTime(isoString)}`;
}

/**
 * Determines stock status based on current quantity and threshold
 */
export function getStockStatus(product: Product): StockStatus {
  if (product.quantity <= 0) {
    return 'out_of_stock';
  }
  if (product.quantity <= product.minStock) {
    return 'low_stock';
  }
  return 'in_stock';
}

/**
 * Human readable label for stock status
 */
export function getStockStatusLabel(status: StockStatus): string {
  switch (status) {
    case 'in_stock':
      return 'In Stock';
    case 'low_stock':
      return 'Low Stock';
    case 'out_of_stock':
      return 'Out of Stock';
  }
}
