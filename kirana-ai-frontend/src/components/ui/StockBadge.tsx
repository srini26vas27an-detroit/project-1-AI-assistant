import React from 'react';
import { StockStatus } from '../../types/retail';
import { CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';

interface StockBadgeProps {
  status: StockStatus;
  quantity?: number;
  unit?: string;
}

export const StockBadge: React.FC<StockBadgeProps> = ({ status, quantity, unit }) => {
  if (status === 'in_stock') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 backdrop-blur-md">
        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
        <span>In Stock</span>
        {quantity !== undefined && unit && (
          <span className="text-emerald-400/80 font-normal">({quantity} {unit})</span>
        )}
      </span>
    );
  }

  if (status === 'low_stock') {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 backdrop-blur-md shadow-[0_0_10px_rgba(245,158,11,0.25)]">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
        <span>Low Stock</span>
        {quantity !== undefined && unit && (
          <span className="text-amber-200/90 font-semibold">({quantity} {unit})</span>
        )}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-300 border border-rose-500/40 backdrop-blur-md shadow-[0_0_10px_rgba(244,63,94,0.25)]">
      <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
      <span>Out of Stock</span>
    </span>
  );
};
