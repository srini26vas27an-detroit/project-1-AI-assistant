import React, { useState, useMemo } from 'react';
import { useRetailData } from '../../context/RetailDataContext';
import { Product, ProductCategory, StockStatus } from '../../types/retail';
import { CATEGORIES } from '../../data/constants';
import { StockBadge } from '../ui/StockBadge';
import { ProductFormModal } from './ProductFormModal';
import { Modal } from '../ui/Modal';
import { formatINR, getStockStatus } from '../../utils/formatting';
import {
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Package,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Tag,
} from 'lucide-react';

export const InventoryView: React.FC = () => {
  const {
    products,
    addProduct,
    updateProduct,
    deleteProduct,
    totalProductsCount,
    inStockCount,
    lowStockCount,
    outOfStockCount,
    inventoryFilterStatus,
    setInventoryFilterStatus,
    inventorySearchQuery,
    setInventorySearchQuery,
    isAddProductModalOpen,
    openAddProductModal,
    closeAddProductModal,
    addProductPrefill,
  } = useRetailData();

  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | 'All'>('All');
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Filter products based on search, category, and status
  const filteredProducts = useMemo(() => {
    return products.filter((prod) => {
      // 1. Search query
      if (inventorySearchQuery.trim()) {
        const query = inventorySearchQuery.toLowerCase();
        const matchesName = prod.name.toLowerCase().includes(query);
        const matchesTamil = (prod.tamilName || '').toLowerCase().includes(query);
        const matchesCat = prod.category.toLowerCase().includes(query);
        if (!matchesName && !matchesTamil && !matchesCat) return false;
      }

      // 2. Category
      if (selectedCategory !== 'All' && prod.category !== selectedCategory) {
        return false;
      }

      // 3. Stock status
      const status = getStockStatus(prod);
      if (inventoryFilterStatus !== 'all' && status !== inventoryFilterStatus) {
        return false;
      }

      return true;
    });
  }, [products, inventorySearchQuery, selectedCategory, inventoryFilterStatus]);

  const deletingProduct = useMemo(() => {
    return products.find((p) => p.id === deletingProductId);
  }, [products, deletingProductId]);

  const handleConfirmDelete = async () => {
    if (deletingProductId) {
      try {
        await deleteProduct(deletingProductId);
      } catch (err) {
        window.alert(err instanceof Error ? err.message : 'Could not delete product');
      }
      setDeletingProductId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span>Inventory</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-gradient-to-r from-[#9333EA]/30 to-[#F97316]/30 text-amber-300 font-bold border border-amber-500/30">
              Catalog
            </span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
            Manage your store products, stock levels, and prices · சரக்கு இருப்பு நிர்வாகம்
          </p>
        </div>

        <button
          onClick={() => openAddProductModal()}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-[#9333EA] to-[#F97316] hover:brightness-110 text-white font-bold text-sm shadow-[0_0_15px_rgba(249,115,22,0.4)] transition-all cursor-pointer border border-white/20 active:scale-95"
        >
          <Plus className="w-4 h-4 text-white" />
          <span>+ Add Product</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Products */}
        <div
          onClick={() => setInventoryFilterStatus('all')}
          className={`p-4 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border transition-all cursor-pointer shadow-xl ${
            inventoryFilterStatus === 'all'
              ? 'border-purple-500/60 ring-2 ring-purple-500/30 shadow-[0_0_20px_rgba(147,51,234,0.2)]'
              : 'border-white/10 hover:border-white/25'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Total Products</span>
            <div className="p-2 rounded-xl bg-purple-500/15 text-purple-400 border border-purple-500/20">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tabular-nums">
            {totalProductsCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Across {CATEGORIES.length} categories</p>
        </div>

        {/* In Stock */}
        <div
          onClick={() => setInventoryFilterStatus('in_stock')}
          className={`p-4 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border transition-all cursor-pointer shadow-xl ${
            inventoryFilterStatus === 'in_stock'
              ? 'border-emerald-500/60 ring-2 ring-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.2)]'
              : 'border-white/10 hover:border-white/25'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">In Stock</span>
            <div className="p-2 rounded-xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-white mt-2 tabular-nums">
            {inStockCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Healthy stock level</p>
        </div>

        {/* Low Stock */}
        <div
          onClick={() => setInventoryFilterStatus('low_stock')}
          className={`p-4 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border transition-all cursor-pointer shadow-xl ${
            inventoryFilterStatus === 'low_stock'
              ? 'border-amber-500/60 ring-2 ring-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
              : 'border-white/10 hover:border-white/25'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Low Stock</span>
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-amber-400 mt-2 tabular-nums">
            {lowStockCount}
          </p>
          <p className="text-[11px] text-slate-400 mt-1">Order replenishment</p>
        </div>

        {/* Out of Stock */}
        <div
          onClick={() => setInventoryFilterStatus('out_of_stock')}
          className={`p-4 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border transition-all cursor-pointer shadow-xl ${
            inventoryFilterStatus === 'out_of_stock'
              ? 'border-rose-500/60 ring-2 ring-rose-500/30 shadow-[0_0_20px_rgba(244,63,94,0.25)]'
              : 'border-white/10 hover:border-white/25'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Out of Stock</span>
            <div className="p-2 rounded-xl bg-rose-500/15 text-rose-400 border border-rose-500/20">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-extrabold text-rose-400 mt-2 tabular-nums">
            {outOfStockCount}
          </p>
          <p className="text-[11px] text-rose-400/90 mt-1">Needs immediate restock</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 shadow-xl flex flex-col md:flex-row items-center gap-3">
        {/* Search Input */}
        <div className="relative w-full md:flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={inventorySearchQuery}
            onChange={(e) => setInventorySearchQuery(e.target.value)}
            placeholder="Search products by English or Tamil name, category..."
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-white/10 text-xs sm:text-sm bg-white/[0.05] text-white placeholder-slate-400 focus:border-amber-500/50 focus:bg-white/[0.08] focus:outline-hidden transition-all"
          />
          {inventorySearchQuery && (
            <button
              onClick={() => setInventorySearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value as ProductCategory | 'All')}
            className="w-full md:w-48 px-3 py-2 rounded-xl border border-white/10 text-xs sm:text-sm bg-[#161725] text-white focus:border-amber-500/50 focus:outline-hidden cursor-pointer"
          >
            <option value="All">All Categories</option>
            {CATEGORIES.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="w-full md:w-auto">
          <select
            value={inventoryFilterStatus}
            onChange={(e) => setInventoryFilterStatus(e.target.value as StockStatus | 'all')}
            className="w-full md:w-40 px-3 py-2 rounded-xl border border-white/10 text-xs sm:text-sm bg-[#161725] text-white focus:border-amber-500/50 focus:outline-hidden cursor-pointer"
          >
            <option value="all">All Status</option>
            <option value="in_stock">In Stock</option>
            <option value="low_stock">Low Stock</option>
            <option value="out_of_stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Products Table (Desktop) / Cards (Mobile) */}
      <div className="rounded-2xl bg-[#10121C]/75 backdrop-blur-xl border border-white/10 shadow-xl overflow-hidden">
        {filteredProducts.length === 0 ? (
          <div className="py-14 text-center px-4">
            <Package className="w-12 h-12 text-[#B0A6A7] mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#30333A]">No products found</h3>
            <p className="text-xs text-[#72676F] mt-1">
              Try adjusting your search terms or filter selection.
            </p>
            <button
              onClick={() => {
                setInventorySearchQuery('');
                setSelectedCategory('All');
                setInventoryFilterStatus('all');
              }}
              className="mt-4 px-4 py-2 rounded-xl text-xs font-semibold bg-[#ECE7EA] text-[#30333A] hover:bg-[#51403D] hover:text-white transition-colors cursor-pointer"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.03] text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    <th className="py-3 px-4">Product</th>
                    <th className="py-3 px-4">Category</th>
                    <th className="py-3 px-4">Stock Qty</th>
                    <th className="py-3 px-4">Selling Price</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10 text-xs sm:text-sm">
                  {filteredProducts.map((prod) => {
                    const status = getStockStatus(prod);

                    return (
                      <tr key={prod.id} className="hover:bg-white/[0.04] transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-white/[0.06] border border-white/10 flex items-center justify-center text-amber-400 shrink-0 font-bold text-xs shadow-2xs">
                              {prod.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-white leading-tight">
                                {prod.name}
                              </p>
                              {prod.tamilName && (
                                <p className="text-[11px] text-slate-400 mt-0.5">
                                  {prod.tamilName}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-slate-400">
                          <span className="inline-flex items-center gap-1">
                            <Tag className="w-3 h-3 text-purple-400" />
                            {prod.category}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 tabular-nums font-semibold text-white">
                          {prod.quantity}{' '}
                          <span className="text-slate-400 font-normal text-xs">{prod.unit}</span>
                          <span className="block text-[10px] text-slate-500 font-normal">
                            Min: {prod.minStock} {prod.unit}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-bold text-amber-400 tabular-nums">
                          {formatINR(prod.sellingPrice)}
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Cost: {formatINR(prod.costPrice)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <StockBadge status={status} />
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setEditingProduct(prod)}
                              title="Edit product"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setDeletingProductId(prod.id)}
                              title="Delete product"
                              className="p-1.5 rounded-lg text-rose-400 hover:text-rose-200 hover:bg-rose-500/15 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="md:hidden divide-y divide-white/10">
              {filteredProducts.map((prod) => {
                const status = getStockStatus(prod);

                return (
                  <div key={prod.id} className="p-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-white/[0.06] border border-white/10 flex items-center justify-center text-amber-400 font-bold text-xs">
                          {prod.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm text-white leading-tight">
                            {prod.name}
                          </p>
                          {prod.tamilName && (
                            <p className="text-[11px] text-slate-400">{prod.tamilName}</p>
                          )}
                        </div>
                      </div>

                      <StockBadge status={status} />
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1">
                      <span>Category: {prod.category}</span>
                      <span className="font-bold text-sm text-amber-400">
                        {formatINR(prod.sellingPrice)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1 border-t border-white/10">
                      <div>
                        Stock:{' '}
                        <span className="font-semibold text-white">
                          {prod.quantity} {prod.unit}
                        </span>{' '}
                        <span className="text-[10px] text-slate-400">(Min: {prod.minStock})</span>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingProduct(prod)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-slate-200 bg-white/10 hover:bg-white/20 transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeletingProductId(prod.id)}
                          className="px-2.5 py-1 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Add Product Modal */}
      {isAddProductModalOpen && (
        <ProductFormModal
          isOpen={isAddProductModalOpen}
          onClose={closeAddProductModal}
          onSubmit={(data) => addProduct(data).catch((e) => window.alert(e.message))}
          prefill={addProductPrefill}
        />
      )}

      {/* Edit Product Modal */}
      {editingProduct && (
        <ProductFormModal
          isOpen={Boolean(editingProduct)}
          onClose={() => setEditingProduct(null)}
          onSubmit={(data) => {
            updateProduct(editingProduct.id, data).catch((e) => window.alert(e.message));
            setEditingProduct(null);
          }}
          initialProduct={editingProduct}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deletingProduct && (
        <Modal
          isOpen={Boolean(deletingProduct)}
          onClose={() => setDeletingProductId(null)}
          title="Delete Product"
          subtitle="Are you sure you want to remove this item from your inventory?"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-[#51403D]/10 border border-[#51403D]/30 text-xs sm:text-sm text-[#51403D] flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">This action cannot be undone.</p>
                <p className="mt-0.5">
                  Removing <strong className="text-[#30333A]">{deletingProduct.name}</strong> will remove it from inventory listings.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5DFDF]">
              <button
                type="button"
                onClick={() => setDeletingProductId(null)}
                className="px-4 py-2 rounded-xl border border-[#E5DFDF] text-xs font-semibold text-[#72676F] hover:bg-[#F7F5F5] transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                className="px-4 py-2 rounded-xl bg-[#51403D] hover:bg-[#403230] text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
              >
                Delete Product
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
