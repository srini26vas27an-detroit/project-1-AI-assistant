import React, { useState, useEffect } from 'react';
import { Product, ProductCategory, ProductUnit } from '../../types/retail';
import { CATEGORIES } from '../../data/constants';
import { Modal } from '../ui/Modal';
import { AlertCircle } from 'lucide-react';

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Omit<Product, 'id'>) => void;
  initialProduct?: Product | null;
  prefill?: Partial<Product>;
}

const UNITS: ProductUnit[] = ['kg', 'g', 'litre', 'ml', 'packet', 'piece', 'box'];

export const ProductFormModal: React.FC<ProductFormModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialProduct,
  prefill,
}) => {
  const [name, setName] = useState('');
  const [tamilName, setTamilName] = useState('');
  const [category, setCategory] = useState<ProductCategory>('Flour & Rice');
  const [quantity, setQuantity] = useState<number | ''>(10);
  const [unit, setUnit] = useState<ProductUnit>('packet');
  const [sellingPrice, setSellingPrice] = useState<number | ''>(50);
  const [costPrice, setCostPrice] = useState<number | ''>(40);
  const [minStock, setMinStock] = useState<number | ''>(5);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (initialProduct) {
      setName(initialProduct.name);
      setTamilName(initialProduct.tamilName || '');
      setCategory(initialProduct.category);
      setQuantity(initialProduct.quantity);
      setUnit(initialProduct.unit);
      setSellingPrice(initialProduct.sellingPrice);
      setCostPrice(initialProduct.costPrice);
      setMinStock(initialProduct.minStock);
    } else if (prefill) {
      setName(prefill.name || '');
      setTamilName(prefill.tamilName || '');
      setCategory(prefill.category || 'Flour & Rice');
      setQuantity(prefill.quantity ?? 10);
      setUnit(prefill.unit || 'packet');
      setSellingPrice(prefill.sellingPrice ?? 50);
      setCostPrice(prefill.costPrice ?? 40);
      setMinStock(prefill.minStock ?? 5);
    } else {
      setName('');
      setTamilName('');
      setCategory('Flour & Rice');
      setQuantity(10);
      setUnit('packet');
      setSellingPrice(50);
      setCostPrice(40);
      setMinStock(5);
    }
    setErrors({});
  }, [initialProduct, prefill, isOpen]);

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!name.trim()) newErrors.name = 'Product name is required';
    if (quantity === '' || Number(quantity) < 0) {
      newErrors.quantity = 'Quantity cannot be negative';
    }
    if (sellingPrice === '' || Number(sellingPrice) <= 0) {
      newErrors.sellingPrice = 'Selling price must be greater than 0';
    }
    if (costPrice === '' || Number(costPrice) < 0) {
      newErrors.costPrice = 'Cost price cannot be negative';
    }
    if (minStock === '' || Number(minStock) < 0) {
      newErrors.minStock = 'Minimum stock threshold cannot be negative';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      name: name.trim(),
      tamilName: tamilName.trim() || undefined,
      category,
      quantity: Number(quantity),
      unit,
      sellingPrice: Number(sellingPrice),
      costPrice: Number(costPrice),
      minStock: Number(minStock),
    });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={initialProduct ? 'Edit Product' : 'Add New Product'}
      subtitle={initialProduct ? `Updating ${initialProduct.name}` : 'Register a new grocery item into your shop inventory'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Product English Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-1">
            Product Name (English) *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Aashirvaad Sharbati Atta"
            className={`w-full px-3 py-2 rounded-xl border text-sm bg-white/[0.05] text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/50 ${
              errors.name ? 'border-rose-500' : 'border-white/10'
            }`}
          />
          {errors.name && (
            <p className="text-xs text-rose-400 mt-1 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              {errors.name}
            </p>
          )}
        </div>

        {/* Product Tamil Name */}
        <div>
          <label className="block text-xs font-semibold text-slate-200 mb-1">
            Tamil Name (Optional)
          </label>
          <input
            type="text"
            value={tamilName}
            onChange={(e) => setTamilName(e.target.value)}
            placeholder="e.g. கோதுமை மாவு"
            className="w-full px-3 py-2 rounded-xl border border-white/10 text-sm bg-white/[0.05] text-white placeholder-slate-500 focus:border-amber-500/50 focus:outline-hidden"
          />
        </div>

        {/* Category & Unit in 2-cols */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Category *
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ProductCategory)}
              className="w-full px-3 py-2 rounded-xl border border-white/10 text-sm bg-[#161725] text-white focus:border-amber-500/50 focus:outline-hidden cursor-pointer"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Unit of Measure *
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value as ProductUnit)}
              className="w-full px-3 py-2 rounded-xl border border-white/10 text-sm bg-[#161725] text-white focus:border-amber-500/50 focus:outline-hidden cursor-pointer"
            >
              {UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Quantity & Min Stock */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Current Stock Quantity *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="0"
              className={`w-full px-3 py-2 rounded-xl border text-sm bg-white/[0.05] text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/50 ${
                errors.quantity ? 'border-rose-500' : 'border-white/10'
              }`}
            />
            {errors.quantity && (
              <p className="text-xs text-rose-400 mt-1">{errors.quantity}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Min Stock Alert Threshold *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={minStock}
              onChange={(e) => setMinStock(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="5"
              className={`w-full px-3 py-2 rounded-xl border text-sm bg-white/[0.05] text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/50 ${
                errors.minStock ? 'border-rose-500' : 'border-white/10'
              }`}
            />
            {errors.minStock && (
              <p className="text-xs text-rose-400 mt-1">{errors.minStock}</p>
            )}
          </div>
        </div>

        {/* Selling Price & Cost Price */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Selling Price (₹) *
            </label>
            <input
              type="number"
              min="1"
              step="any"
              value={sellingPrice}
              onChange={(e) => setSellingPrice(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="₹0"
              className={`w-full px-3 py-2 rounded-xl border text-sm bg-white/[0.05] text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/50 ${
                errors.sellingPrice ? 'border-rose-500' : 'border-white/10'
              }`}
            />
            {errors.sellingPrice && (
              <p className="text-xs text-rose-400 mt-1">{errors.sellingPrice}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-200 mb-1">
              Cost Price (₹)
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={costPrice}
              onChange={(e) => setCostPrice(e.target.value === '' ? '' : Number(e.target.value))}
              placeholder="₹0"
              className="w-full px-3 py-2 rounded-xl border border-white/10 text-sm bg-white/[0.05] text-white placeholder-slate-500 focus:outline-hidden focus:border-amber-500/50"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-white/10 text-xs sm:text-sm font-semibold text-slate-300 hover:bg-white/10 transition-colors cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#F97316] hover:brightness-110 text-white text-xs sm:text-sm font-bold shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all cursor-pointer border border-white/20 active:scale-95"
          >
            {initialProduct ? 'Save Changes' : '+ Add Product'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
