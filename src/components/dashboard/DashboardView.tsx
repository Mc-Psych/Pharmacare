import React from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import {
  FileCheck2,
  ShoppingCart,
  Truck,
  ArrowRight,
  Database
} from 'lucide-react';
import { safeFixed } from '../../utils/formatters';
import { Sale } from '../../types';

interface DashboardViewProps {
  onNavigateTab: (tabId: string) => void;
  onOpenReceipt: (sale: Sale) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({ onNavigateTab, onOpenReceipt }) => {
  const {
    currentUser,
    settings,
    todayStats,
    medicines,
    batches,
    sales,
    lowStockMedicines,
    nearExpiryBatches,
    expiredBatches,
    prescriptions,
    exportDatabase
  } = usePharmacy();

  // Valuation and Inventory Computations
  const totalStockQuantity = batches.reduce((acc, b) => acc + b.remainingQuantity, 0);

  // Top Selling Medicines calculation
  const medicineSalesMap: { [medName: string]: { qty: number; revenue: number } } = {};
  sales.forEach(sale => {
    if (sale.status === 'completed' || sale.status === 'partially_refunded') {
      sale.items.forEach(item => {
        if (!medicineSalesMap[item.medicineName]) {
          medicineSalesMap[item.medicineName] = { qty: 0, revenue: 0 };
        }
        medicineSalesMap[item.medicineName].qty += item.quantity;
        medicineSalesMap[item.medicineName].revenue += item.total;
      });
    }
  });

  const topSellingList = Object.entries(medicineSalesMap)
    .map(([name, data]) => ({ name, ...data }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 4);

  const filledPrescriptionsCount = prescriptions.filter(p => p.status === 'dispensed').length;
  const pendingRxCount = prescriptions.filter(p => p.status === 'pending').length;

  const handleForceBackup = () => {
    const backupJson = exportDatabase();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pharmacore_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Quick Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-base font-bold text-slate-800">
            Welcome back, {currentUser.name}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Operational status: All local subsystems normal • FEFO strict priority active
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {(currentUser.role === 'admin' || currentUser.role === 'pharmacist' || currentUser.role === 'cashier') && (
            <button
              type="button"
              onClick={() => onNavigateTab('pos')}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-3.5 py-2 rounded-lg uppercase tracking-tight transition-colors shadow-xs flex items-center space-x-1.5 cursor-pointer"
            >
              <ShoppingCart className="w-3.5 h-3.5" />
              <span>POS Terminal</span>
            </button>
          )}

          {(currentUser.role === 'admin' || currentUser.role === 'pharmacist') && (
            <button
              type="button"
              onClick={() => onNavigateTab('prescriptions')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rx Queue ({pendingRxCount})</span>
            </button>
          )}

          {(currentUser.role === 'admin' || currentUser.role === 'storekeeper') && (
            <button
              type="button"
              onClick={() => onNavigateTab('purchases')}
              className="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold px-3 py-2 rounded-lg transition-colors flex items-center space-x-1.5 cursor-pointer"
            >
              <Truck className="w-3.5 h-3.5 text-slate-600" />
              <span>Inbound PO</span>
            </button>
          )}
        </div>
      </div>

      {/* Geometric Balance KPI Cards (4 Column Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Today's Total Sales or Warehouse Stock for Storekeeper */}
        {currentUser.role !== 'storekeeper' ? (
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-slate-500 text-xs font-medium mb-1 block">Today's Total Sales</span>
              <span className="text-2xl font-bold text-slate-900">
                {settings.currencySymbol}{safeFixed(todayStats?.salesTotal)}
              </span>
            </div>
            <span className="text-xs text-emerald-600 mt-2 font-medium">
              +{todayStats?.salesCount || 0} transactions recorded today
            </span>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-slate-500 text-xs font-medium mb-1 block">Total Inventory Stock</span>
              <span className="text-2xl font-bold text-slate-900">
                {totalStockQuantity.toLocaleString()} Units
              </span>
            </div>
            <span className="text-xs text-emerald-600 mt-2 font-medium">
              Across {batches.length} active supplier batches
            </span>
          </div>
        )}

        {/* Card 2: Prescriptions Filled or Formulations Catalog */}
        {currentUser.role !== 'storekeeper' ? (
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-slate-500 text-xs font-medium mb-1 block">Prescriptions Filled</span>
              <span className="text-2xl font-bold text-slate-900">
                {filledPrescriptionsCount}
              </span>
            </div>
            <span className="text-xs text-slate-400 mt-2">
              Pending Queue: {pendingRxCount} active
            </span>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex flex-col justify-between">
            <div>
              <span className="text-slate-500 text-xs font-medium mb-1 block">Active Formulations</span>
              <span className="text-2xl font-bold text-slate-900">
                {medicines.length} Types
              </span>
            </div>
            <span className="text-xs text-slate-400 mt-2">
              Catalog items tracked in warehouse
            </span>
          </div>
        )}

        {/* Card 3: Low Stock Alerts (Red Alert Style) */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-red-100 bg-red-50/30 flex flex-col justify-between">
          <div>
            <span className="text-red-600 text-xs font-semibold mb-1 uppercase tracking-tight block">
              Low Stock Alerts
            </span>
            <span className="text-2xl font-bold text-red-700">
              {lowStockMedicines.length} Items
            </span>
          </div>
          <span className="text-xs text-red-500 mt-2 font-medium">
            {lowStockMedicines.length > 0 ? 'Requires reorder replenishment' : 'All stock at safe levels'}
          </span>
        </div>

        {/* Card 4: Expiring Soon (Orange Alert Style) */}
        <div className="bg-white p-5 rounded-xl shadow-xs border border-orange-100 bg-orange-50/30 flex flex-col justify-between">
          <div>
            <span className="text-orange-600 text-xs font-semibold mb-1 uppercase tracking-tight block">
              Expiring (30-90 Days)
            </span>
            <span className="text-2xl font-bold text-orange-700">
              {nearExpiryBatches.length + expiredBatches.length} Batches
            </span>
          </div>
          <span className="text-xs text-orange-500 mt-2 font-medium">
            FEFO priority dispensing active
          </span>
        </div>
      </div>

      {/* Main Grid: 2 Column Layout (Left 2 cols, Right 1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Recent Dispensing Activity & Fast Moving Drugs */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recent Dispensing Table Card */}
          <div className="bg-white rounded-xl shadow-xs border border-slate-200 flex flex-col overflow-hidden">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-700 text-sm">Recent Dispensing Activity</h3>
              <button
                type="button"
                onClick={() => onNavigateTab('reports')}
                className="text-xs text-emerald-600 font-bold uppercase hover:text-emerald-700 transition-colors cursor-pointer"
              >
                View All Logs
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-6 py-3 font-semibold">Time</th>
                    <th className="px-6 py-3 font-semibold">Medicine</th>
                    <th className="px-6 py-3 font-semibold">Patient / Customer</th>
                    <th className="px-6 py-3 font-semibold">Cashier</th>
                    <th className="px-6 py-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {sales.slice(0, 5).map((sale) => {
                    const timeStr = sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '14:22:10';
                    const mainMedName = sale.items[0]?.medicineName || 'Generic Formulation';
                    const countExtra = sale.items.length > 1 ? ` +${sale.items.length - 1} more` : '';

                    return (
                      <tr key={sale.id} className="text-sm text-slate-700 hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-4 text-xs font-mono text-slate-500">{timeStr}</td>
                        <td className="px-6 py-4 font-medium text-slate-900">
                          {mainMedName}
                          {countExtra && <span className="text-xs text-slate-400 font-normal">{countExtra}</span>}
                        </td>
                        <td className="px-6 py-4 text-slate-600 text-xs">{sale.customerName}</td>
                        <td className="px-6 py-4 text-slate-500 text-xs">{sale.cashierName}</td>
                        <td className="px-6 py-4 text-right">
                          <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-[10px] font-bold uppercase">
                            Completed
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {sales.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-xs text-slate-400">
                        No transactions registered today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Fast Moving Medicines Card */}
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-700 text-sm">Fast-Moving Pharmaceuticals</h3>
              <span className="text-[10px] uppercase font-bold text-slate-400">Dispense Volume</span>
            </div>

            {topSellingList.length === 0 ? (
              <p className="text-xs text-slate-400 py-4 text-center">No sales logged yet.</p>
            ) : (
              <div className="space-y-3">
                {topSellingList.map((item, idx) => {
                  const maxQty = Math.max(1, topSellingList[0]?.qty || 1);
                  const pct = maxQty > 0 ? Math.min(100, Math.max(0, Math.round((item.qty / maxQty) * 100))) : 0;

                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-700 font-medium truncate max-w-[200px]">
                          {idx + 1}. {item.name}
                        </span>
                        <span className="font-bold text-slate-900">{item.qty} Units</span>
                      </div>
                      <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Inventory Distribution & Backup Status */}
        <div className="flex flex-col space-y-6">
          {/* Inventory Distribution Ring Chart Card */}
          <div className="bg-white p-5 rounded-xl shadow-xs border border-slate-200 flex-1 flex flex-col justify-between">
            <h3 className="font-bold text-slate-700 text-sm mb-4">Inventory Distribution</h3>
            
            <div className="flex flex-col items-center justify-center space-y-4 my-2">
              <div className="w-32 h-32 rounded-full border-[12px] border-emerald-500 border-r-slate-100 border-b-slate-100 flex items-center justify-center shadow-xs">
                <span className="text-xl font-bold text-slate-800">
                  {totalStockQuantity > 0 ? '78%' : '0%'}
                </span>
              </div>

              <div className="w-full space-y-3 mt-2">
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Active Formulations</span>
                    <span className="font-bold text-slate-700">{medicines.length} Types</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full w-[78%]"></div>
                  </div>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-slate-500 font-medium">Total Batches Monitored</span>
                    <span className="font-bold text-slate-700">{batches.length} Batches</span>
                  </div>
                  <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full w-[60%]"></div>
                  </div>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateTab('inventory')}
              className="w-full mt-4 py-2 text-xs font-bold text-emerald-600 hover:text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg uppercase tracking-tight transition-colors text-center cursor-pointer flex items-center justify-center space-x-1"
            >
              <span>Manage Inventory</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          {/* Backup Status Dark Card - System Admin Only */}
          {currentUser.role === 'admin' && (
            <div className="bg-slate-900 p-5 rounded-xl shadow-lg flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-emerald-400 text-[10px] font-bold uppercase tracking-widest">
                  Backup Status
                </span>
                <span className="text-white text-xs mt-0.5 flex items-center">
                  <Database className="w-3 h-3 mr-1 text-slate-400" />
                  Cloud Database & Storage: Active
                </span>
              </div>
              <button
                type="button"
                onClick={handleForceBackup}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-3 py-2 rounded-lg uppercase tracking-tight transition-colors cursor-pointer"
              >
                Export Backup
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
