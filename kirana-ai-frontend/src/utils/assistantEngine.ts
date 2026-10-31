import { Product, Transaction, CreditCustomer } from '../types/retail';
import { formatINR, getStockStatus } from './formatting';

export interface AssistantResponse {
  text: string;
  quickAction?: {
    label: string;
    actionType: 'navigate_inventory' | 'navigate_sales' | 'open_add_product' | 'filter_low_stock';
  };
  dataPayload?: {
    type: 'low_stock' | 'sales_summary' | 'top_products' | 'price_info' | 'credit_list';
    data?: any;
  };
}

interface EngineContext {
  products: Product[];
  transactions: Transaction[];
  creditCustomers: CreditCustomer[];
  todaySales: number;
  todayTransactionsCount: number;
  averageBill: number;
  lowStockItems: Product[];
  outOfStockItems: Product[];
}

export function generateAssistantResponse(query: string, ctx: EngineContext): AssistantResponse {
  const q = query.trim().toLowerCase();

  // 1. GREETING / VANAKKAM
  if (
    q.includes('vanakkam') ||
    q.includes('வணக்கம்') ||
    /\b(hello|hi|hey)\b/.test(q)
  ) {
    return {
      text: `Vanakkam அண்ணா! 🙏 Ungal Kadai Thunai is here. What would you like to check today? You can ask about today's sales, check low stock items, find prices, or ask about credit balances. (தமிழிலும் கேட்கலாம்!)`,
      quickAction: {
        label: "Today's Sales Summary",
        actionType: 'navigate_sales',
      },
    };
  }

  // 2. LOW STOCK / STOCK STATUS / சரக்கு / ஸ்டாக்
  if (
    q.includes('low stock') ||
    q.includes('low-stock') ||
    q.includes('out of stock') ||
    q.includes('stock status') ||
    q.includes('குறைந்த ஸ்டாக்') ||
    q.includes('சரக்கு') ||
    q.includes('ஸ்டாக்') ||
    q.includes('inventory')
  ) {
    if (ctx.products.length === 0) {
      return {
        text: `Your inventory is empty right now. Add your first product to start tracking stock.`,
        quickAction: {
          label: '+ Open Add Product Form',
          actionType: 'open_add_product',
        },
      };
    }

    const totalWarning = ctx.lowStockItems.length + ctx.outOfStockItems.length;

    if (totalWarning === 0) {
      return {
        text: `Good news! All ${ctx.products.length} products in your shop are well-stocked above their minimum thresholds. No urgent reorders required today.`,
        quickAction: {
          label: 'View Full Inventory',
          actionType: 'navigate_inventory',
        },
      };
    }

    let summary = `You have ${totalWarning} item${totalWarning > 1 ? 's' : ''} needing attention:\n`;

    if (ctx.outOfStockItems.length > 0) {
      summary += `\n❌ Out of Stock:\n` + ctx.outOfStockItems.map((p) => `• ${p.name} (0 ${p.unit})`).join('\n');
    }

    if (ctx.lowStockItems.length > 0) {
      summary += `\n⚠️ Running Low:\n` + ctx.lowStockItems.map((p) => `• ${p.name}: ${p.quantity} ${p.unit} remaining (Min threshold: ${p.minStock} ${p.unit})`).join('\n');
    }

    summary += `\n\nSuggestion: Order from wholesale distributor before the evening rush.`;

    return {
      text: summary,
      quickAction: {
        label: 'Filter Low Stock in Inventory',
        actionType: 'filter_low_stock',
      },
      dataPayload: {
        type: 'low_stock',
        data: {
          lowStock: ctx.lowStockItems,
          outOfStock: ctx.outOfStockItems,
        },
      },
    };
  }

  // 3. TODAY'S SALES / REVENUE / விற்பனை / வரவு
  if (
    q.includes("today's sales") ||
    q.includes('today sales') ||
    q.includes('sales summary') ||
    q.includes('todays sale') ||
    q.includes('விற்பனை') ||
    q.includes('revenue') ||
    q.includes('how much sale') ||
    q.includes('daily sales')
  ) {
    const cashTotal = ctx.transactions
      .filter((t) => t.paymentMethod === 'Cash' && isSameDay(t.timestamp))
      .reduce((s, t) => s + t.total, 0);

    const upiTotal = ctx.transactions
      .filter((t) => t.paymentMethod === 'UPI / GPay' && isSameDay(t.timestamp))
      .reduce((s, t) => s + t.total, 0);

    const creditTotal = ctx.transactions
      .filter((t) => t.paymentMethod === 'Credit (Kadai Khata)' && isSameDay(t.timestamp))
      .reduce((s, t) => s + t.total, 0);

    const text = `📊 Today's Shop Summary:\n` +
      `• Total Sales: ${formatINR(ctx.todaySales)}\n` +
      `• Total Bills: ${ctx.todayTransactionsCount} transactions\n` +
      `• Average Bill Value: ${formatINR(ctx.averageBill)}\n\n` +
      `Payment Breakdown:\n` +
      `  - UPI / GPay: ${formatINR(upiTotal)}\n` +
      `  - Cash: ${formatINR(cashTotal)}\n` +
      `  - Kadai Khata (Credit): ${formatINR(creditTotal)}`;

    return {
      text,
      quickAction: {
        label: 'View Transactions',
        actionType: 'navigate_sales',
      },
      dataPayload: {
        type: 'sales_summary',
        data: {
          total: ctx.todaySales,
          bills: ctx.todayTransactionsCount,
          cash: cashTotal,
          upi: upiTotal,
          credit: creditTotal,
        },
      },
    };
  }

  // 4. FIND A PRODUCT PRICE / விலை
  const priceKeywords = ['price', 'cost', 'rate', 'விலை', 'how much for', 'find price'];
  const hasPriceIntent = priceKeywords.some((kw) => q.includes(kw));

  // Also check if user typed a specific product name directly like "sugar", "atta", "milk"
  const matchedProduct = ctx.products.find((p) => {
    const pName = p.name.toLowerCase();
    const pTamil = (p.tamilName || '').toLowerCase();
    const cleanQ = q.replace(/(price|of|rate|விலை|how|much|what|is|the|cost|for)/g, '').trim();
    if (!cleanQ) return false;
    return pName.includes(cleanQ) || (pTamil && pTamil.includes(cleanQ)) || cleanQ.includes(pName.slice(0, 5));
  });

  if (hasPriceIntent || (matchedProduct && q.split(' ').length <= 4)) {
    if (matchedProduct) {
      const status = getStockStatus(matchedProduct);
      const statusMsg =
        status === 'out_of_stock'
          ? '❌ Out of stock right now'
          : status === 'low_stock'
          ? `⚠️ Low stock (${matchedProduct.quantity} ${matchedProduct.unit} left)`
          : `✅ In stock (${matchedProduct.quantity} ${matchedProduct.unit} available)`;

      return {
        text: `🏷️ ${matchedProduct.name} ${matchedProduct.tamilName ? `(${matchedProduct.tamilName})` : ''}\n` +
          `• Selling Price: ${formatINR(matchedProduct.sellingPrice)} per ${matchedProduct.unit}\n` +
          `• Cost Price: ${formatINR(matchedProduct.costPrice)} per ${matchedProduct.unit}\n` +
          `• Margin: ${formatINR(matchedProduct.sellingPrice - matchedProduct.costPrice)} (${Math.round(((matchedProduct.sellingPrice - matchedProduct.costPrice) / matchedProduct.costPrice) * 100)}%)\n` +
          `• Current Status: ${statusMsg}`,
        quickAction: {
          label: 'View in Inventory',
          actionType: 'navigate_inventory',
        },
      };
    } else if (hasPriceIntent && ctx.products.length === 0) {
      return {
        text: `There are no products in your inventory yet. Add a product first and I can look up its price.`,
        quickAction: {
          label: '+ Open Add Product Form',
          actionType: 'open_add_product',
        },
      };
    } else if (hasPriceIntent) {
      // Suggest common products
      const sample = ctx.products.slice(0, 4).map((p) => `${p.name} (${formatINR(p.sellingPrice)}/${p.unit})`).join(', ');
      return {
        text: `Which product price would you like to check? For example, try:\n• "Price of Atta"\n• "Sunflower Oil rate"\n• "Milk price"\n\nCurrent common items: ${sample}.`,
      };
    }
  }

  // 5. TOP SELLING PRODUCTS / அதிகம் விற்ற பொருட்கள்
  if (
    q.includes('top selling') ||
    q.includes('sold most') ||
    q.includes('fast moving') ||
    q.includes('best seller') ||
    q.includes('அதிகம் விற்ற') ||
    q.includes('popular')
  ) {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const sold: Record<string, { name: string; unit: string; quantity: number; revenue: number }> = {};
    ctx.transactions
      .filter((tx) => new Date(tx.timestamp).getTime() >= weekAgo)
      .forEach((tx) =>
        tx.items.forEach((item) => {
          const row = (sold[item.productId] ||= {
            name: item.productName,
            unit: item.unit,
            quantity: 0,
            revenue: 0,
          });
          row.quantity += item.quantity;
          row.revenue += item.lineTotal;
        })
      );
    const ranked = Object.values(sold)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    if (ranked.length === 0) {
      return {
        text: `No sales recorded in the last 7 days yet. Record a sale and I'll show your fastest-moving items here.`,
        quickAction: {
          label: 'Record a Sale',
          actionType: 'navigate_sales',
        },
      };
    }

    return {
      text: `🏆 Top Selling Items (Last 7 Days):\n` +
        ranked
          .map((r, i) => `${i + 1}. ${r.name} — ${r.quantity} ${r.unit} sold (${formatINR(r.revenue)})`)
          .join('\n'),
      quickAction: {
        label: 'View All Sales History',
        actionType: 'navigate_sales',
      },
    };
  }

  // 6. CREDIT CUSTOMERS / KADAI KHATA / கடன்
  if (
    q.includes('credit') ||
    q.includes('khata') ||
    q.includes('kadai') ||
    q.includes('customer balance') ||
    q.includes('கடன்') ||
    q.includes('பாக்கி') ||
    q.includes('ledger')
  ) {
    if (ctx.creditCustomers.length === 0) {
      return {
        text: `No Kadai Khata (credit) customers yet. Credit balances appear here when you record a sale with the "Credit (Kadai Khata)" payment method.`,
        quickAction: {
          label: 'Record New Sale',
          actionType: 'navigate_sales',
        },
      };
    }

    const totalCredit = ctx.creditCustomers.reduce((acc, c) => acc + c.balance, 0);
    const list = ctx.creditCustomers
      .map((c) => `• ${c.name}: ${formatINR(c.balance)} (Last: ${c.lastPurchased})`)
      .join('\n');

    return {
      text: `📒 Kadai Khata (Credit Customers Summary):\n` +
        `Total Outstanding Due: ${formatINR(totalCredit)} across ${ctx.creditCustomers.length} regular customers.\n\n` +
        `${list}`,
      quickAction: {
        label: 'Record New Sale',
        actionType: 'navigate_sales',
      },
    };
  }

  // 7. ADD PRODUCT INTENT / புதிய பொருள்
  if (
    q.includes('add product') ||
    q.includes('add new product') ||
    q.includes('புதிய பொருள்') ||
    q.startsWith('add ')
  ) {
    // Try to parse quick query like "add sugar 5kg" or "add coconut oil"
    const parsedName = q.replace(/(add|product|new|item|புதிய|பொருள்)/g, '').trim();

    return {
      text: parsedName
        ? `I have prefilled the Add Product form for "${parsedName}". Click below to set price, category, and minimum stock threshold.`
        : `Ready to add a new product to your inventory! Click below to open the product registration form.`,
      quickAction: {
        label: '+ Open Add Product Form',
        actionType: 'open_add_product',
      },
    };
  }

  // 8. HELP / DEFAULT FALLBACK
  return {
    text: `I'm your Kirana shop assistant. You can ask me:\n` +
      `• "Show low-stock items" (சரக்கு நிலவரம்)\n` +
      `• "Today's sales summary" (இன்றைய விற்பனை)\n` +
      `• "Price of Fortune Oil" or "Tata Salt rate" (விலை)\n` +
      `• "Which items sold most this week?" (அதிகம் விற்றவை)\n` +
      `• "Show credit customers" (கடன் பாக்கி விபரம்)`,
    quickAction: {
      label: 'View Dashboard',
      actionType: 'navigate_sales',
    },
  };
}

function isSameDay(isoString: string): boolean {
  const d = new Date(isoString);
  const today = new Date();
  return (
    d.getDate() === today.getDate() &&
    d.getMonth() === today.getMonth() &&
    d.getFullYear() === today.getFullYear()
  );
}
