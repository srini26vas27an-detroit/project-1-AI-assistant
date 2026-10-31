import React, { useState } from 'react';
import { useRetailData } from '../../context/RetailDataContext';
import { PaymentMethod } from '../../types/retail';
import { Modal } from '../ui/Modal';
import { formatINR } from '../../utils/formatting';
import { Plus, Trash2, AlertCircle, Check } from 'lucide-react';

interface SaleDraftRow {
  productId: string;
  quantity: number;
}

export const RecordSaleModal: React.FC = () => {
  const {
    products,
    recordSale,
    isRecordSaleModalOpen,
    closeRecordSaleModal,
    setSelectedTransaction,
  } = useRetailData();

  // Current draft rows
  const [draftItems, setDraftItems] = useState<SaleDraftRow[]>([
    { productId: products[0]?.id || '', quantity: 1 },
  ]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Cash');
  const [customerName, setCustomerName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const availableProducts = products.filter((p) => p.quantity > 0);

  const handleAddItem = () => {
    const unused = availableProducts.find((p) => !draftItems.some((di) => di.productId === p.id));
    setDraftItems((prev) => [
      ...prev,
      { productId: unused ? unused.id : availableProducts[0]?.id || '', quantity: 1 },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setDraftItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleProductChange = (index: number, newProductId: string) => {
    setDraftItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, productId: newProductId } : item))
    );
    setErrorMsg(null);
  };

  const handleQuantityChange = (index: number, qty: number) => {
    setDraftItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: Math.max(1, qty) } : item))
    );
    setErrorMsg(null);
  };

  // Calculate live totals
  const computedDraft = draftItems.map((di) => {
    const prod = products.find((p) => p.id === di.productId);
    const unitPrice = prod?.sellingPrice || 0;
    const lineTotal = di.quantity * unitPrice;
    const maxQty = prod?.quantity || 0;
    const isExceeded = di.quantity > maxQty;
    return {
      ...di,
      product: prod,
      unitPrice,
      lineTotal,
      maxQty,
      isExceeded,
    };
  });

  const grandTotal = computedDraft.reduce((acc, row) => acc + row.lineTotal, 0);
  const totalItemCount = computedDraft.reduce((acc, row) => acc + row.quantity, 0);

  const handleConfirmSale = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (draftItems.length === 0) {
      setErrorMsg('Please add at least one product to the sale.');
      return;
    }

    const seenIds = new Set<string>();
    for (const item of draftItems) {
      if (!item.productId) {
        setErrorMsg('Please select a valid product.');
        return;
      }
      if (seenIds.has(item.productId)) {
        setErrorMsg('A product appears multiple times. Please adjust its quantity on a single line.');
        return;
      }
      seenIds.add(item.productId);
    }

    for (const row of computedDraft) {
      if (row.isExceeded) {
        setErrorMsg(
          `Cannot sell ${row.quantity} ${row.product?.unit} of "${row.product?.name}". Only ${row.maxQty} available in stock.`
        );
        return;
      }
    }

    const result = await recordSale(draftItems, paymentMethod, customerName);
    if (!result.success) {
      setErrorMsg(result.error || 'Failed to complete sale');
      return;
    }

    closeRecordSaleModal();
    if (result.transaction) {
      setSelectedTransaction(result.transaction);
    }
  };

  return (
    <Modal
      isOpen={isRecordSaleModalOpen}
      onClose={closeRecordSaleModal}
      title="Record New Counter Sale"
      subtitle="Select grocery items, verify stock availability, and complete billing"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleConfirmSale} className="space-y-4">
        {errorMsg && (
          <div className="p-3 rounded-xl bg-[#51403D]/10 border border-[#51403D]/30 text-xs text-[#51403D] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Line Items List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Items to Bill ({draftItems.length})
            </span>
            <button
              type="button"
              onClick={handleAddItem}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-400 hover:text-amber-300 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Another Product</span>
            </button>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {computedDraft.map((row, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
              >
                {/* Product Select */}
                <div className="flex-1">
                  <select
                    value={row.productId}
                    onChange={(e) => handleProductChange(idx, e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded-lg border border-white/10 text-xs sm:text-sm bg-[#161725] text-white focus:border-amber-500/50 focus:outline-hidden"
                  >
                    {availableProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({formatINR(p.sellingPrice)}/{p.unit}) — In stock: {p.quantity} {p.unit}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Quantity Input */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center border border-white/15 rounded-lg bg-[#161725] overflow-hidden">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(idx, row.quantity - 1)}
                      className="px-2 py-1 text-xs text-slate-300 hover:bg-white/10 cursor-pointer font-bold"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      max={row.maxQty}
                      value={row.quantity}
                      onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                      className="w-14 text-center py-1 text-xs font-semibold text-white bg-transparent focus:outline-hidden"
                    />
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(idx, row.quantity + 1)}
                      className="px-2 py-1 text-xs text-slate-300 hover:bg-white/10 cursor-pointer font-bold"
                    >
                      +
                    </button>
                  </div>
                  <span className="text-xs text-slate-400 w-12">{row.product?.unit}</span>
                </div>

                {/* Line Total */}
                <div className="w-24 text-right">
                  <span className="text-xs sm:text-sm font-extrabold text-amber-400 tabular-nums">
                    {formatINR(row.lineTotal)}
                  </span>
                </div>

                {/* Delete line item */}
                {draftItems.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(idx)}
                    className="p-1 text-rose-400 hover:text-rose-300 cursor-pointer"
                    title="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Customer & Payment Mode */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {/* Customer Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Customer Name / Khata Ref
            </label>
            <input
              type="text"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="Customer name (optional)"
              className="w-full px-3 py-2 rounded-xl border border-white/10 text-xs sm:text-sm bg-white/[0.05] text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-hidden"
            />
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Payment Method *
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(['Cash', 'UPI / GPay', 'Credit (Kadai Khata)'] as PaymentMethod[]).map((mode) => (
                <button
                  type="button"
                  key={mode}
                  onClick={() => setPaymentMethod(mode)}
                  className={`py-2 px-1 text-center rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                    paymentMethod === mode
                      ? 'bg-gradient-to-r from-[#9333EA] to-[#F97316] text-white border-white/20 shadow-[0_0_12px_rgba(249,115,22,0.4)]'
                      : 'bg-white/[0.05] text-slate-300 border-white/10 hover:bg-white/10'
                  }`}
                >
                  {mode === 'Credit (Kadai Khata)' ? 'Kadai Khata' : mode}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Grand Total Calculation Box */}
        <div className="p-4 rounded-xl bg-white/[0.05] border border-white/10 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400">Total Bill Items</span>
            <p className="text-xs font-bold text-white">{totalItemCount} units total</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400">Grand Total</span>
            <p className="text-2xl font-extrabold text-amber-400 tabular-nums">
              {formatINR(grandTotal)}
            </p>
          </div>
        </div>

        {/* Form Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/10">
          <button
            type="button"
            onClick={closeRecordSaleModal}
            className="px-4 py-2 rounded-xl border border-white/10 text-xs sm:text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={draftItems.length === 0 || grandTotal === 0}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#F97316] hover:brightness-110 text-white text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all cursor-pointer disabled:opacity-50 border border-white/20 active:scale-95"
          >
            <Check className="w-4 h-4 text-white" />
            <span>Confirm & Record Sale</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};
