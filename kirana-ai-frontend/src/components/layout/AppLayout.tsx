import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { useRetailData } from '../../context/RetailDataContext';
import { Menu, X, Plus } from 'lucide-react';
import MoltenMetal from '../ui/MoltenMetal';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { openRecordSaleModal, apiError, refresh } = useRetailData();

  return (
    <div className="relative flex h-screen w-full bg-[#0B0C10] text-[#F8FAFC] overflow-hidden font-sans">
      {/* Desktop Sidebar */}
      <div className="hidden lg:block h-full shrink-0 z-10">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl flex flex-col">
            <div className="absolute top-4 right-4 z-20">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-2 rounded-xl bg-[#1A1B26] text-white hover:text-[#F97316] border border-white/10 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <Sidebar onCloseMobile={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="relative flex-1 flex flex-col h-full min-w-0 overflow-hidden bg-transparent">
        {/* High-Visibility MoltenMetal Background Canvas */}
        <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden opacity-90">
          <MoltenMetal
            colors={['#581C87', '#9333EA', '#E11D48', '#F97316', '#FBBF24']}
            coreColor="#FFFFFF"
            speed={0.35}
            scale={3.2}
            detail={4}
            glow={2.5}
            thickness={1.5}
            haze={0.65}
            brightness={1.75}
            mouseInteraction={true}
            flareOnClick={true}
            className="w-full h-full"
          />
        </div>

        {/* Backend connection problem */}
        {apiError && (
          <div className="relative z-20 flex items-center justify-between gap-3 px-4 py-2 bg-rose-600/90 text-white text-xs shrink-0">
            <span>{apiError}</span>
            <button onClick={() => refresh()} className="underline font-semibold cursor-pointer">Retry</button>
          </div>
        )}

        {/* Mobile Top Bar */}
        <header className="relative z-10 lg:hidden flex items-center justify-between px-4 py-3 bg-[#10111A]/80 backdrop-blur-xl border-b border-white/10 text-white shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Open navigation menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <span className="font-extrabold text-base tracking-tight text-white">
                Kirana<span className="bg-gradient-to-r from-[#9333EA] to-[#F97316] bg-clip-text text-transparent">AI</span>
              </span>
              <span className="block text-[10px] text-amber-400/90 font-medium leading-none">
                Ungal Kadai Thunai
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => openRecordSaleModal()}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gradient-to-r from-[#9333EA] to-[#F97316] hover:brightness-110 text-white text-xs font-bold shadow-[0_0_15px_rgba(249,115,22,0.4)] cursor-pointer border border-white/20 transition-all active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 text-white" />
              <span>Sale</span>
            </button>
          </div>
        </header>

        {/* Scrollable Page Body */}
        <main className="relative z-10 flex-1 overflow-y-auto bg-transparent p-4 sm:p-6 md:p-8">
          <div className="max-w-7xl mx-auto h-full flex flex-col">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
