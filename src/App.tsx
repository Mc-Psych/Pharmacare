import React, { useState } from 'react';
import { PharmacyProvider, usePharmacy } from './context/PharmacyContext';
import { ErrorBoundary } from './components/common/ErrorBoundary';
import { Sidebar } from './components/common/Sidebar';
import { Navbar } from './components/common/Navbar';
import { AlertBanner } from './components/common/AlertBanner';
import { ToastBanner } from './components/common/ToastBanner';
import { ReceiptModal } from './components/common/ReceiptModal';
import { LockScreenModal } from './components/common/LockScreenModal';
import { ForceChangePasswordModal } from './components/auth/ForceChangePasswordModal';
import { LoginView } from './components/auth/LoginView';
import { useIdleTimer } from './hooks/useIdleTimer';

import { DashboardView } from './components/dashboard/DashboardView';
import { POSView } from './components/pos/POSView';
import { MedicineManagementView } from './components/medicines/MedicineManagementView';
import { PrescriptionView } from './components/prescriptions/PrescriptionView';
import { InventoryView } from './components/inventory/InventoryView';
import { PurchasesView } from './components/purchases/PurchasesView';
import { CustomerView } from './components/customers/CustomerView';
import { ReturnsView } from './components/returns/ReturnsView';
import { ReportsView } from './components/reports/ReportsView';
import { UserManagementView } from './components/users/UserManagementView';
import { AuditLogView } from './components/audit/AuditLogView';
import { SettingsView } from './components/settings/SettingsView';
import { SystemDocsView } from './components/docs/SystemDocsView';
import { Sale } from './types';

const PharmacyAppContent: React.FC = () => {
  const [activeTab, setActiveTab] = useState<string>('pos');
  const [activeReceiptSale, setActiveReceiptSale] = useState<Sale | null>(null);
  const [isLocked, setIsLocked] = useState<boolean>(false);
  const [isAutoLocked, setIsAutoLocked] = useState<boolean>(false);
  const [prefillLowStockPO, setPrefillLowStockPO] = useState<boolean>(false);

  const { currentUser, isAuthenticated, hasPermission, settings } = usePharmacy();

  // Automated idle timeout lock (default 10 minutes of inactivity)
  useIdleTimer({
    timeoutMinutes: settings.sessionTimeoutMinutes || 10,
    enabled: isAuthenticated && !isLocked,
    onIdle: () => {
      setIsAutoLocked(true);
      setIsLocked(true);
    },
  });

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const handleNavigateTab = (tab: string, options?: { prefillLowStock?: boolean }) => {
    setActiveTab(tab);
    if (options?.prefillLowStock) {
      setPrefillLowStockPO(true);
    }
  };

  const handleOpenReceipt = (sale: Sale) => {
    setActiveReceiptSale(sale);
  };

  const handleCloseReceipt = () => {
    setActiveReceiptSale(null);
  };

  const renderActiveView = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView onNavigateTab={handleNavigateTab} onOpenReceipt={handleOpenReceipt} />;
      case 'pos':
        return hasPermission('access_pos') ? (
          <POSView onOpenReceipt={handleOpenReceipt} onNavigateTab={handleNavigateTab} />
        ) : (
          <DashboardView onNavigateTab={handleNavigateTab} onOpenReceipt={handleOpenReceipt} />
        );
      case 'medicines':
        return hasPermission('view_medicines') ? (
          <MedicineManagementView />
        ) : (
          <DashboardView onNavigateTab={handleNavigateTab} onOpenReceipt={handleOpenReceipt} />
        );
      case 'prescriptions':
        return <PrescriptionView onNavigateTab={handleNavigateTab} />;
      case 'inventory':
        return currentUser.role === 'dispensing_assistant' || currentUser.role === 'cashier' ? (
          <DashboardView onNavigateTab={handleNavigateTab} onOpenReceipt={handleOpenReceipt} />
        ) : (
          <InventoryView />
        );
      case 'purchases':
        return hasPermission('manage_purchases') ? (
          <PurchasesView
            initialPrefillLowStock={prefillLowStockPO}
            onClearPrefill={() => setPrefillLowStockPO(false)}
          />
        ) : (
          <DashboardView onNavigateTab={handleNavigateTab} onOpenReceipt={handleOpenReceipt} />
        );
      case 'customers':
        return <CustomerView onOpenReceipt={handleOpenReceipt} />;
      case 'returns':
        return currentUser.role === 'admin' || currentUser.role === 'pharmacist' ? (
          <ReturnsView />
        ) : (
          <DashboardView onNavigateTab={handleNavigateTab} onOpenReceipt={handleOpenReceipt} />
        );
      case 'reports':
        return hasPermission('view_reports') ? (
          <ReportsView />
        ) : (
          <DashboardView onNavigateTab={handleNavigateTab} onOpenReceipt={handleOpenReceipt} />
        );
      case 'users':
        return currentUser.role === 'admin' ? (
          <UserManagementView />
        ) : (
          <DashboardView onNavigateTab={handleNavigateTab} onOpenReceipt={handleOpenReceipt} />
        );
      case 'audit':
        return currentUser.role === 'admin' ? (
          <AuditLogView />
        ) : (
          <DashboardView onNavigateTab={handleNavigateTab} onOpenReceipt={handleOpenReceipt} />
        );
      case 'settings':
        return currentUser.role === 'admin' ? (
          <SettingsView />
        ) : (
          <DashboardView onNavigateTab={handleNavigateTab} onOpenReceipt={handleOpenReceipt} />
        );
      case 'docs':
        return currentUser.role === 'admin' ? (
          <SystemDocsView />
        ) : (
          <DashboardView onNavigateTab={handleNavigateTab} onOpenReceipt={handleOpenReceipt} />
        );
      default:
        return <DashboardView onNavigateTab={handleNavigateTab} onOpenReceipt={handleOpenReceipt} />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans antialiased text-slate-800 selection:bg-emerald-100 selection:text-emerald-900">
      {/* Toast Notification Banner */}
      <ToastBanner />

      {/* Sidebar Navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <Navbar
          onLockScreen={() => {
            setIsAutoLocked(false);
            setIsLocked(true);
          }}
          onNavigateTab={handleNavigateTab}
        />

        {/* Dynamic View Scroll Area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <div className="max-w-7xl mx-auto space-y-6">
            <AlertBanner onNavigateTab={handleNavigateTab} />
            {renderActiveView()}
          </div>
        </main>
      </div>

      {/* Printable Receipt / Invoice Modal */}
      <ReceiptModal sale={activeReceiptSale} onClose={handleCloseReceipt} />

      {/* Screen Lock Security Modal */}
      <LockScreenModal
        isOpen={isLocked}
        isAutoLocked={isAutoLocked}
        onUnlock={() => {
          setIsLocked(false);
          setIsAutoLocked(false);
        }}
      />

      {/* Mandatory Password Setup Modal on First Login */}
      <ForceChangePasswordModal />
    </div>
  );
};

export default function App() {
  return (
    <ErrorBoundary>
      <PharmacyProvider>
        <PharmacyAppContent />
      </PharmacyProvider>
    </ErrorBoundary>
  );
}
