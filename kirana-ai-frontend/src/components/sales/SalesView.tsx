import React, { useState, useMemo } from 'react';
import { useRetailData } from '../../context/RetailDataContext';
import { formatINR, formatTime, formatDate } from '../../utils/formatting';
import { RecordSaleModal } from './RecordSaleModal';
import { ReceiptModal } from './ReceiptModal';
import {
  Plus,
  IndianRupee,
  Receipt,
  ShoppingBag,
  TrendingUp,
  Search,
  Eye,
  Calendar,
  BookOpen,
} from 'lucide-react';

export const SalesView: React.FC = () => {
  const {
    transactions,
    totalSales,
    totalTransactionsCount,
    averageBill,
    topCategory,
    creditCustomers,
    openRecordSaleModal,
    isRecordSaleModalOpen,
    selectedTransaction,
    setSelectedTransaction,
  } = useRetailData();

  const [dateFilter, setDateFilter] = useState<'today' | '7days' | '30days' | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreditLedger, setShowCreditLedger] = useState(false);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Date filter
      const txDate = new Date(tx.timestamp);
      const now = new Date();

      if (dateFilter === 'today') {
        const isToday =
          txDate.getDate() === now.getDate() &&
          txDate.getMonth() === now.getMonth() &&
          txDate.getFullYear() === now.getFullYear();
        if (!isToday) return false;
      } else if (dateFilter === '7days') {
        const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      } else if (dateFilter === '30days') {
        const diffDays = (now.getTime() - txDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      }

      // Payment filter
      if (paymentFilter !== 'all' && tx.paymentMethod !== paymentFilter) {
        return false;
      }

      // Search query (matches id, customer name, or item name)
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesId = tx.id.toLowerCase().includes(q);
        const matchesCustomer = (tx.customerName || '').toLowerCase().includes(q);
        const matchesItem = tx.items.some((i) => i.productName.toLowerCase().includes(q));
        if (!matchesId && !matchesCustomer && !matchesItem) return false;
      }

      return true;
    });
  }, [transactions, dateFilter, paymentFilter, searchQuery]);

  // Derived metrics for currently filtered set
  const filteredTotal = filteredTransactions.reduce((acc, t) => acc + t.total, 0);
  const filteredCount = filteredTransactions.length;
  const filteredAvg = filteredCount > 0 ? Math.round(filteredTotal / filteredCount) : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Sales & Billing</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#9333EA]/30 to-[#F97316]/30 text-amber-300 font-bold border border-amber-500/30">
              Register
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Track daily customer counter sales, billing & khata ledger · விற்பனை ஏடு
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreditLedger(!showCreditLedger)}
            className={`px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
              showCreditLedger
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'bg-white/[0.05] border-white/10 text-slate-300 hover:text-white hover:bg-white/[0.08]'
            }`}
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Kadai Khata Ledger</span>
          </button>

          <button
            onClick={openRecordSaleModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#F97316] hover:brightness-110 text-white font-bold text-sm shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all cursor-pointer border border-white/20 active:scale-95"
          >
            <Plus className="w-4 h-4 text-white" />
            <span>+ Record Sale</span>
          </button>
        </div>
      </div>

      {/* Credit Ledger Drawer / Banner if toggled */}
      {showCreditLedger && (
        <div className="p-5 rounded-2xl bg-[#10121C]/85 backdrop-blur-xl border border-amber-500/30 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-gradient-to-r from-[#9333EA] to-[#F97316] text-white">
                <BookOpen className="w-4 h-4" />
              </span>
              <div>
                <h3 className="text-sm font-extrabold text-white">
                  Kadai Khata (Regular Customer Credit Book)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Traditional credit accounts for neighboring residents & tea stalls
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowCreditLedger(false)}
              className="text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {creditCustomers.map((cust) => (
              <div
                key={cust.id}
                className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 shadow-xs space-y-1 hover:border-amber-500/40 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-xs text-white">{cust.name}</span>
                  <span className="text-xs font-extrabold text-amber-400 tabular-nums">
                    {formatINR(cust.balance)}
                  </span>
                </div>
                <p className="text-[10px] text-slate-400">Phone: {cust.phone}</p>
                <p className="text-[10px] text-slate-500 italic line-clamp-1">{cust.notes}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Sales */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 hover:border-amber-500/40 shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Sales</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tabular-nums">
            {formatINR(filteredTotal)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Recorded revenue</p>
        </div>

        {/* Number of Transactions */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 hover:border-cyan-500/40 shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Transactions</span>
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/20">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tabular-nums">
            {filteredCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Total customer bills</p>
        </div>

        {/* Average Bill */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 hover:border-purple-500/40 shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Average Bill</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tabular-nums">
            {formatINR(filteredAvg)}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Per transaction size</p>
        </div>

        {/* Top Category */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 hover:border-rose-500/40 shadow-xl transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Top Category</span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/20">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-white mt-2 truncate">
            {topCategory}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Highest sales volume</p>
        </div>
      </div>

      {/* Filter and Period Selection Bar */}
      <div className="p-4 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col md:flex-row items-center gap-3">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Bill ID, customer name, or product..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-white/10 text-xs sm:text-sm bg-white/[0.05] text-white placeholder-slate-400 focus:border-amber-500/50 focus:outline-hidden"
          />
        </div>

        {/* Date Filter */}
        <div className="flex items-center gap-1.5 w-full md:w-auto">
          <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value as any)}
            className="w-full md:w-36 px-3 py-2 rounded-xl border border-white/10 text-xs sm:text-sm bg-[#161725] text-white focus:border-amber-500/50 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Dates</option>
            <option value="today">Today</option>
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
          </select>
        </div>

        {/* Payment Filter */}
        <div className="w-full md:w-auto">
          <select
            value={paymentFilter}
            onChange={(e) => setPaymentFilter(e.target.value)}
            className="w-full md:w-44 px-3 py-2 rounded-xl border border-white/10 text-xs sm:text-sm bg-[#161725] text-white focus:border-amber-500/50 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Payment Modes</option>
            <option value="Cash">Cash</option>
            <option value="UPI / GPay">UPI / GPay</option>
            <option value="Credit (Kadai Khata)">Credit (Kadai Khata)</option>
          </select>
        </div>
      </div>

      {/* Transaction History Table */}
      <div className="rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-14 text-center px-4">
            <Receipt className="w-12 h-12 text-[#B0A6A7] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#30333A]">No transactions found</h3>
            <p className="text-xs text-[#72676F] mt-1">
              Try adjusting your date range or search terms.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  <th className="py-3 px-4">Time / Date</th>
                  <th className="py-3 px-4">Bill ID</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items Summary</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Total Amount</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10 text-xs sm:text-sm">
                {filteredTransactions.map((tx) => (
                  <tr
                    key={tx.id}
                    onClick={() => setSelectedTransaction(tx)}
                    className="hover:bg-white/[0.04] transition-colors cursor-pointer"
                  >
                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span className="font-bold text-white block">
                        {formatTime(tx.timestamp)}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {formatDate(tx.timestamp)}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-amber-400 whitespace-nowrap">
                      {tx.id}
                    </td>

                    <td className="py-3.5 px-4 font-bold text-white">
                      {tx.customerName || 'Counter Sale'}
                    </td>

                    <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate">
                      {tx.items.map((i) => `${i.productName} (${i.quantity} ${i.unit})`).join(', ')}
                    </td>

                    <td className="py-3.5 px-4 text-center tabular-nums text-slate-300 font-semibold">
                      {tx.itemCount}
                    </td>

                    <td className="py-3.5 px-4 whitespace-nowrap">
                      <span
                        className={`inline-flex px-2.5 py-0.5 rounded-md text-[11px] font-semibold border ${
                          tx.paymentMethod === 'UPI / GPay'
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                            : tx.paymentMethod === 'Cash'
                            ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                            : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                        }`}
                      >
                        {tx.paymentMethod}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-extrabold text-amber-400 tabular-nums whitespace-nowrap">
                      {formatINR(tx.total)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTransaction(tx);
                        }}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                        title="View Receipt"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Record Sale Modal */}
      {isRecordSaleModalOpen && <RecordSaleModal />}

      {/* Receipt Modal */}
      {selectedTransaction && (
        <ReceiptModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </div>
  );
};
