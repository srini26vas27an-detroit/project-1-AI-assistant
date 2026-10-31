import React, { useState } from 'react';
import { useRetailData } from '../../context/RetailDataContext';
import { TimePeriod } from '../../types/retail';
import { SalesChart } from './SalesChart';
import { StockBadge } from '../ui/StockBadge';
import { formatINR, formatTime, getStockStatus } from '../../utils/formatting';
import {
  IndianRupee,
  Package,
  AlertTriangle,
  Receipt,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

export const DashboardView: React.FC = () => {
  const {
    todaySales,
    totalProductsCount,
    lowStockCount,
    outOfStockCount,
    todayTransactionsCount,
    transactions,
    lowStockItems,
    outOfStockItems,
    setActivePage,
    setInventoryFilterStatus,
    setSelectedTransaction,
  } = useRetailData();

  const [period, setPeriod] = useState<TimePeriod>('today');

  const totalWarnings = lowStockCount + outOfStockCount;
  const combinedAlerts = [...outOfStockItems, ...lowStockItems];
  const recentSalesList = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Dashboard</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#9333EA]/30 to-[#F97316]/30 text-amber-300 font-bold border border-amber-500/30">
              Live
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Real-time shop performance & intelligence · அன்றாட கடை செயல்பாடு
          </p>
        </div>

        {/* Global Period Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.05] backdrop-blur-md rounded-xl border border-white/10 self-start sm:self-auto shadow-lg">
          {(
            [
              { id: 'today', label: 'Today' },
              { id: '7days', label: 'Last 7 Days' },
              { id: '30days', label: 'Last 30 Days' },
            ] as const
          ).map((t) => (
            <button
              key={t.id}
              onClick={() => setPeriod(t.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer whitespace-nowrap ${
                period === t.id
                  ? 'bg-gradient-to-r from-[#9333EA] to-[#F97316] text-white shadow-[0_0_12px_rgba(249,115,22,0.4)]'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Today's Sales */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 hover:border-amber-500/40 shadow-xl hover:shadow-[0_0_25px_rgba(249,115,22,0.2)] transition-all group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Today's Sales</span>
            <div className="p-2 rounded-xl bg-gradient-to-br from-[#9333EA]/20 to-[#F97316]/20 text-amber-400 border border-amber-500/20 group-hover:scale-105 transition-transform">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tabular-nums">
            {formatINR(todaySales)}
          </p>
          <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1 font-medium">
            <TrendingUp className="w-3 h-3" />
            <span>Active counter day</span>
          </p>
        </div>

        {/* Total Products */}
        <div
          onClick={() => {
            setInventoryFilterStatus('all');
            setActivePage('inventory');
          }}
          className="p-4 sm:p-5 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 hover:border-purple-500/40 shadow-xl hover:shadow-[0_0_25px_rgba(147,51,234,0.2)] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Products</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 group-hover:scale-105 transition-transform">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tabular-nums">
            {totalProductsCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">In store catalog</p>
        </div>

        {/* Low Stock Items */}
        <div
          onClick={() => {
            setInventoryFilterStatus('low_stock');
            setActivePage('inventory');
          }}
          className="p-4 sm:p-5 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 hover:border-rose-500/40 shadow-xl hover:shadow-[0_0_25px_rgba(225,29,72,0.2)] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Low Stock Items</span>
            <div className="p-2 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 group-hover:scale-105 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-400 mt-2 tabular-nums">
            {totalWarnings}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            {outOfStockCount > 0 ? `${outOfStockCount} out of stock` : 'Requires replenishment'}
          </p>
        </div>

        {/* Today's Transactions */}
        <div
          onClick={() => setActivePage('sales')}
          className="p-4 sm:p-5 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 hover:border-cyan-500/40 shadow-xl hover:shadow-[0_0_25px_rgba(6,182,212,0.2)] transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Today's Bills</span>
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-105 transition-transform">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tabular-nums">
            {todayTransactionsCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Counter transactions</p>
        </div>
      </div>

      {/* Large Sales Chart */}
      <SalesChart period={period} onPeriodChange={setPeriod} />

      {/* 2-Column Split: Low Stock Alerts & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Low-stock alerts panel */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Low Stock Alerts</h3>
                  <p className="text-[11px] text-slate-400">Items needing prompt restock</p>
                </div>
              </div>

              <button
                onClick={() => {
                  setInventoryFilterStatus('low_stock');
                  setActivePage('inventory');
                }}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>View All</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {combinedAlerts.length === 0 ? (
              <div className="py-10 text-center">
                <Package className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-medium text-slate-400">All items are well stocked</p>
              </div>
            ) : (
              <div className="divide-y divide-white/10 mt-2">
                {combinedAlerts.slice(0, 4).map((item) => {
                  const status = getStockStatus(item);

                  return (
                    <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs sm:text-sm font-semibold text-white leading-tight">
                          {item.name}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {item.tamilName ? `${item.tamilName} · ` : ''}Threshold: {item.minStock} {item.unit}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <StockBadge status={status} quantity={item.quantity} unit={item.unit} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <button
            onClick={() => {
              setInventoryFilterStatus('low_stock');
              setActivePage('inventory');
            }}
            className="w-full mt-4 py-2.5 rounded-xl border border-white/10 hover:border-amber-500/40 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer text-center"
          >
            Manage Low Stock in Inventory →
          </button>
        </div>

        {/* Recent Transactions Panel */}
        <div className="p-5 sm:p-6 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  <Receipt className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Recent Transactions</h3>
                  <p className="text-[11px] text-slate-400">Latest customer billings</p>
                </div>
              </div>

              <button
                onClick={() => setActivePage('sales')}
                className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer transition-colors"
              >
                <span>All Sales</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="divide-y divide-white/10 mt-2">
              {recentSalesList.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => setSelectedTransaction(tx)}
                  className="py-3 flex items-center justify-between gap-3 hover:bg-white/[0.05] rounded-lg px-2 transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/[0.05] border border-white/10 flex items-center justify-center text-amber-400 text-xs font-mono font-bold">
                      {tx.id.replace('TXN-', '')}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs sm:text-sm font-semibold text-white">
                          {tx.customerName || 'Counter Sale'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {formatTime(tx.timestamp)}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 line-clamp-1">
                        {tx.items.map((i) => `${i.productName} × ${i.quantity}`).join(', ')}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <p className="text-xs sm:text-sm font-extrabold text-amber-400 tabular-nums">
                      {formatINR(tx.total)}
                    </p>
                    <span className="text-[10px] text-slate-400 block uppercase">
                      {tx.paymentMethod}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button
            onClick={() => setActivePage('sales')}
            className="w-full mt-4 py-2.5 rounded-xl border border-white/10 hover:border-amber-500/40 bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 hover:text-white transition-all cursor-pointer text-center"
          >
            View Full Sales Ledger →
          </button>
        </div>
      </div>
    </div>
  );
};
