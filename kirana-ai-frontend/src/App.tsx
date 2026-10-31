/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { RetailDataProvider, useRetailData } from './context/RetailDataContext';
import { AppLayout } from './components/layout/AppLayout';
import { AIAssistantView } from './components/assistant/AIAssistantView';
import { InventoryView } from './components/inventory/InventoryView';
import { DashboardView } from './components/dashboard/DashboardView';
import { SalesView } from './components/sales/SalesView';
import { RecordSaleModal } from './components/sales/RecordSaleModal';
import { ReceiptModal } from './components/sales/ReceiptModal';
import { ProductFormModal } from './components/inventory/ProductFormModal';

const MainContent: React.FC = () => {
  const {
    activePage,
    isRecordSaleModalOpen,
    isAddProductModalOpen,
    closeAddProductModal,
    addProduct,
    addProductPrefill,
    selectedTransaction,
    setSelectedTransaction,
  } = useRetailData();

  return (
    <AppLayout>
      {activePage === 'assistant' && <AIAssistantView />}
      {activePage === 'inventory' && <InventoryView />}
      {activePage === 'dashboard' && <DashboardView />}
      {activePage === 'sales' && <SalesView />}

      {/* Global Modals triggered from anywhere (AI Assistant, Mobile top bar, etc.) */}
      {isRecordSaleModalOpen && <RecordSaleModal />}
      
      {isAddProductModalOpen && (
        <ProductFormModal
          isOpen={isAddProductModalOpen}
          onClose={closeAddProductModal}
          onSubmit={(data) => addProduct(data).catch((e) => window.alert(e.message))}
          prefill={addProductPrefill}
        />
      )}

      {selectedTransaction && (
        <ReceiptModal
          transaction={selectedTransaction}
          onClose={() => setSelectedTransaction(null)}
        />
      )}
    </AppLayout>
  );
};

export default function App() {
  return (
    <RetailDataProvider>
      <MainContent />
    </RetailDataProvider>
  );
}
