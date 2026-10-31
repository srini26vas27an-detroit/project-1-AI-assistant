import React from 'react';
import { Transaction } from '../../types/retail';
import { Modal } from '../ui/Modal';
import { formatINR, formatDateTime } from '../../utils/formatting';
import { Store, Check, Copy } from 'lucide-react';

interface ReceiptModalProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({ transaction, onClose }) => {
  const [copied, setCopied] = React.useState(false);

  if (!transaction) return null;

  const handleCopy = () => {
    const text =
      `Kirana AI Bill: ${transaction.id}\nCustomer: ${transaction.customerName || 'Counter'}\nTotal: ${formatINR(transaction.total)}\nPayment: ${transaction.paymentMethod}\nItems:\n` +
      transaction.items
        .map((i) => `• ${i.productName} × ${i.quantity} ${i.unit} = ${formatINR(i.lineTotal)}`)
        .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Modal
      isOpen={Boolean(transaction)}
      onClose={onClose}
      title="Transaction Receipt"
      subtitle={`Bill #${transaction.id} · ${formatDateTime(transaction.timestamp)}`}
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Receipt Header Styled as Traditional Indian Provision Store Bill */}
        <div className="p-4 rounded-xl bg-white/[0.04] border border-white/10 text-center space-y-1">
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#9333EA] to-[#F97316] text-white flex items-center justify-center mx-auto mb-1 shadow-[0_0_15px_rgba(249,115,22,0.4)]">
            <Store className="w-5 h-5" />
          </div>
          <h4 className="font-extrabold text-base text-white">
            Kirana AI Provision Store
          </h4>
          <p className="text-[11px] text-amber-400">
            உங்க கடை துணை · Tamil Nadu Retail
          </p>
          <div className="pt-2 text-xs text-slate-300 flex items-center justify-between border-t border-white/10">
            <span className="font-mono text-slate-400">Bill: {transaction.id}</span>
            <span className="font-semibold text-white">{transaction.paymentMethod}</span>
          </div>
          {transaction.customerName && (
            <div className="text-xs text-left text-slate-300 pt-1">
              <span className="text-slate-400">Customer: </span>
              <span className="font-semibold text-white">{transaction.customerName}</span>
            </div>
          )}
        </div>

        {/* Line Items Table */}
        <div className="rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.03] border-b border-white/10 text-[10px] font-bold text-slate-300 uppercase">
              <tr>
                <th className="py-2 px-3">Item</th>
                <th className="py-2 px-3 text-center">Qty</th>
                <th className="py-2 px-3 text-right">Rate</th>
                <th className="py-2 px-3 text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {transaction.items.map((item, idx) => (
                <tr key={idx} className="hover:bg-white/[0.03]">
                  <td className="py-2 px-3 font-medium text-white">
                    {item.productName}
                  </td>
                  <td className="py-2 px-3 text-center tabular-nums text-slate-400">
                    {item.quantity} {item.unit}
                  </td>
                  <td className="py-2 px-3 text-right tabular-nums text-slate-400">
                    {formatINR(item.unitPrice)}
                  </td>
                  <td className="py-2 px-3 text-right font-bold text-amber-400 tabular-nums">
                    {formatINR(item.lineTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bill Summary */}
        <div className="p-3.5 rounded-xl bg-white/[0.04] border border-white/10 space-y-1.5 text-xs">
          <div className="flex justify-between text-slate-400">
            <span>Total Items:</span>
            <span className="font-medium text-white">{transaction.itemCount} items</span>
          </div>
          <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-white/10">
            <span>Net Payable Amount:</span>
            <span className="tabular-nums font-extrabold text-amber-400">{formatINR(transaction.total)}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-white/10 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied Receipt' : 'Copy Details'}</span>
          </button>

          <button
            onClick={onClose}
            className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#F97316] hover:brightness-110 text-white text-xs font-bold shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all cursor-pointer border border-white/20 active:scale-95"
          >
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
};
