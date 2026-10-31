import React from 'react';
import { useRetailData, NavPage } from '../../context/RetailDataContext';
import { Bot, Package, LayoutDashboard, ShoppingCart, Sparkles, Store, RefreshCw } from 'lucide-react';

interface SidebarProps {
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onCloseMobile }) => {
  const {
    activePage,
    setActivePage,
    lowStockCount,
    outOfStockCount,
    refresh,
  } = useRetailData();

  const totalWarnings = lowStockCount + outOfStockCount;

  const navItems: {
    id: NavPage;
    label: string;
    tamilLabel: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: number;
  }[] = [
    {
      id: 'assistant',
      label: 'AI Assistant',
      tamilLabel: 'செயற்கை நுண்ணறிவு',
      icon: Bot,
    },
    {
      id: 'inventory',
      label: 'Inventory',
      tamilLabel: 'சரக்கு இருப்பு',
      icon: Package,
      badge: totalWarnings > 0 ? totalWarnings : undefined,
    },
    {
      id: 'dashboard',
      label: 'Dashboard',
      tamilLabel: 'கடை சுருக்கம்',
      icon: LayoutDashboard,
    },
    {
      id: 'sales',
      label: 'Sales',
      tamilLabel: 'விற்பனை ஏடு',
      icon: ShoppingCart,
    },
  ];

  const handleNavClick = (pageId: NavPage) => {
    setActivePage(pageId);
    if (onCloseMobile) onCloseMobile();
  };

  return (
    <aside className="w-64 h-full bg-[#0E0F17]/85 backdrop-blur-2xl text-[#FAF7F7] flex flex-col justify-between shrink-0 select-none shadow-2xl border-r border-white/10">
      {/* Brand Header */}
      <div>
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-black/40 p-1 flex items-center justify-center shadow-md overflow-hidden shrink-0 border border-white/15">
              <img
                src="/src/assets/images/kirana_basket_logo_1792956012024.jpg"
                alt="KiranaAI Basket Logo"
                className="w-full h-full object-cover rounded-lg"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
              <Store className="w-6 h-6 text-amber-500 hidden" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-xl tracking-tight text-[#FAF7F7]">
                  Kirana<span className="bg-gradient-to-r from-[#9333EA] to-[#F97316] bg-clip-text text-transparent">AI</span>
                </span>
                <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse shadow-[0_0_8px_rgba(249,115,22,0.8)]" />
              </div>
              <p className="text-xs text-amber-400/90 font-medium tracking-wide">
                Ungal Kadai Thunai
              </p>
            </div>
          </div>
          <div className="mt-3.5 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span>Tamil Nadu Retail</span>
            <span className="px-1.5 py-0.5 rounded-full bg-gradient-to-r from-[#9333EA]/30 to-[#F97316]/30 text-amber-300 font-bold border border-amber-500/30">v1.2</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="p-4 space-y-1.5" aria-label="Main Navigation">
          <p className="px-3 py-1 text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
            Menu
          </p>
          {navItems.map((item) => {
            const isActive = activePage === item.id;
            const Icon = item.icon;

            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl font-medium text-sm transition-all duration-200 cursor-pointer text-left ${
                  isActive
                    ? 'bg-gradient-to-r from-[#9333EA]/30 via-[#E11D48]/20 to-[#F97316]/20 text-[#FFFFFF] shadow-lg shadow-black/40 font-semibold border border-[#F97316]/40 shadow-[0_0_15px_rgba(249,115,22,0.15)]'
                    : 'text-slate-300 hover:bg-white/[0.06] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-lg transition-all ${
                      isActive
                        ? 'bg-gradient-to-br from-[#9333EA] to-[#F97316] text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]'
                        : 'text-slate-400 bg-white/[0.05]'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="block leading-tight">{item.label}</span>
                    <span
                      className={`block text-[10px] mt-0.5 ${
                        isActive ? 'text-amber-300' : 'text-slate-400'
                      }`}
                    >
                      {item.tamilLabel}
                    </span>
                  </div>
                </div>

                {item.badge !== undefined && (
                  <span
                    className={`px-2 py-0.5 text-xs font-bold rounded-full ${
                      isActive
                        ? 'bg-gradient-to-r from-[#F97316] to-[#FBBF24] text-black shadow-[0_0_8px_rgba(249,115,22,0.6)]'
                        : 'bg-white/10 text-slate-300'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Store Illustration & Footer */}
      <div className="p-4 m-3 rounded-2xl bg-white/[0.04] backdrop-blur-xl border border-white/10 space-y-3">
        {/* Cozy Shop Footer Card */}
        <div className="relative rounded-xl overflow-hidden h-24 border border-white/10">
          <img
            src="/src/assets/images/kirana_store_shelf_1792956013454.jpg"
            alt="Kirana Store Shelves"
            className="w-full h-full object-cover opacity-75 hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0E0F17] via-[#0E0F17]/60 to-transparent flex items-end p-2.5">
            <div>
              <p className="text-xs font-semibold text-[#FAF7F7] flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#FBBF24]" />
                Living Kirana
              </p>
              <p className="text-[10px] text-slate-400">
                Traditional retail intelligence
              </p>
            </div>
          </div>
        </div>

        {/* Clear data button */}
        <button
          onClick={() => refresh()}
          title="Reload products, sales and khata records from the server"
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-white hover:bg-white/[0.08] rounded-lg transition-colors cursor-pointer border border-transparent hover:border-white/15"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-400/80" />
          <span>Refresh Data</span>
        </button>
      </div>
    </aside>
  );
};
