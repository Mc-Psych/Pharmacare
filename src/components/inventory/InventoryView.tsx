import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { AdjustmentReason, MedicineBatch, Medicine } from '../../types';
import {
  Boxes,
  AlertTriangle,
  AlertOctagon,
  ShieldCheck,
  Plus,
  Minus,
  RefreshCw,
  Search,
  FileCheck2,
  Trash2,
  Calendar,
  X,
  Layers,
  ArrowUpDown,
  History,
  TrendingDown
} from 'lucide-react';
import { safeFixed } from '../../utils/formatters';

export const InventoryView: React.FC = () => {
  const {
    medicines,
    batches,
    stockAdjustments,
    adjustStock,
    settings,
    currentUser,
    hasPermission,
    getMedicineTotalStock,
    lowStockMedicines,
    expiredBatches,
    nearExpiryBatches
  } = usePharmacy();

  const canViewCost = hasPermission('view_cost_price') && currentUser.role !== 'dispensing_assistant';
  const canAdjustStock = hasPermission('adjust_inventory') && currentUser.role !== 'dispensing_assistant';

  const [activeTab, setActiveTab] = useState<'levels' | 'fefo' | 'adjustments' | 'reconciliation'>('levels');
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  // Adjustment Modal State
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [adjustmentQty, setAdjustmentQty] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<AdjustmentReason>('damaged');
  const [adjustmentNotes, setAdjustmentNotes] = useState('');

  // Physical Reconciliation State
  const [physicalCounts, setPhysicalCounts] = useState<{ [batchId: string]: number }>({});
  const [reconciliationStatus, setReconciliationStatus] = useState<string>('');

  const selectedBatch = useMemo(() => {
    return batches.find(b => b.id === selectedBatchId) || null;
  }, [batches, selectedBatchId]);

  const selectedBatchMedicine = useMemo(() => {
    if (!selectedBatch) return null;
    return medicines.find(m => m.id === selectedBatch.medicineId) || null;
  }, [medicines, selectedBatch]);

  // Inventory Totals
  const totalItemsCount = batches.reduce((sum, b) => sum + b.remainingQuantity, 0);
  const totalCostValuation = batches.reduce((sum, b) => sum + b.remainingQuantity * b.purchasePrice, 0);
  const totalRetailValuation = batches.reduce((sum, b) => sum + b.remainingQuantity * b.sellingPrice, 0);

  const handleOpenAdjustmentModal = (batch?: MedicineBatch) => {
    if (batch) {
      setSelectedBatchId(batch.id);
    } else if (batches.length > 0) {
      setSelectedBatchId(batches[0].id);
    }
    setAdjustmentQty(0);
    setAdjustmentReason('damaged');
    setAdjustmentNotes('');
    setIsAdjustModalOpen(true);
  };

  const handleSaveAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBatch || !selectedBatchMedicine) return;

    adjustStock({
      medicineId: selectedBatchMedicine.id,
      medicineName: selectedBatchMedicine.name,
      batchId: selectedBatch.id,
      batchNumber: selectedBatch.batchNumber,
      previousQuantity: selectedBatch.remainingQuantity,
      adjustmentQuantity: adjustmentQty,
      newQuantity: Math.max(0, selectedBatch.remainingQuantity + adjustmentQty),
      reason: adjustmentReason,
      notes: adjustmentNotes,
      authorizedBy: currentUser.id,
      authorizedByName: currentUser.name,
      date: new Date().toISOString().split('T')[0],
    });

    setIsAdjustModalOpen(false);
  };

  // Perform Physical Count Reconciliation
  const handleApplyReconciliation = () => {
    let adjustmentsCount = 0;
    Object.entries(physicalCounts).forEach(([batchId, rawCount]) => {
      const count = Number(rawCount);
      const b = batches.find(item => item.id === batchId);
      if (b && count !== b.remainingQuantity) {
        const med = medicines.find(m => m.id === b.medicineId);
        const diff = count - b.remainingQuantity;
        adjustStock({
          medicineId: b.medicineId,
          medicineName: med ? med.name : 'Unknown',
          batchId: b.id,
          batchNumber: b.batchNumber,
          previousQuantity: b.remainingQuantity,
          adjustmentQuantity: diff,
          newQuantity: count,
          reason: 'inventory_count_discrepancy',
          notes: 'Automated physical stock-take reconciliation discrepancy adjustment.',
          authorizedBy: currentUser.id,
          authorizedByName: currentUser.name,
          date: new Date().toISOString().split('T')[0],
        });
        adjustmentsCount++;
      }
    });
    setPhysicalCounts({});
    setReconciliationStatus(`Successfully synchronized ${adjustmentsCount} batch variance(s).`);
  };

  return (
    <div className="space-y-6">
      {/* Valuation Header */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Units in Store</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">{totalItemsCount} Units</h3>
          <p className="text-xs text-slate-500 mt-2">{batches.length} Active Batches Tracked</p>
        </div>

        {canViewCost ? (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Purchase Cost Value</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {settings.currencySymbol}{safeFixed(totalCostValuation)}
            </h3>
            <p className="text-xs text-emerald-600 font-semibold mt-2">Valuation at Cost (COGS)</p>
          </div>
        ) : (
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Formulary In Stock</p>
            <h3 className="text-2xl font-bold text-slate-900 mt-1">
              {medicines.filter(m => getMedicineTotalStock(m.id) > 0).length} / {medicines.length}
            </h3>
            <p className="text-xs text-slate-500 mt-2">Active Catalog Medicines</p>
          </div>
        )}

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Estimated Retail Value</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1">
            {settings.currencySymbol}{safeFixed(totalRetailValuation)}
          </h3>
          <p className="text-xs text-slate-500 mt-2">
            {canViewCost
              ? `Margin: ${totalRetailValuation > 0 ? safeFixed(((totalRetailValuation - totalCostValuation) / totalRetailValuation) * 100, 1) : '0.0'}%`
              : 'Gross Dispensary Inventory Valuation'}
          </p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('levels')}
            className={`px-3.5 py-2 text-xs font-bold uppercase tracking-tight rounded-lg transition-all cursor-pointer ${
              activeTab === 'levels'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Medicine Stock Levels ({medicines.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('fefo')}
            className={`px-3.5 py-2 text-xs font-bold uppercase tracking-tight rounded-lg transition-all cursor-pointer ${
              activeTab === 'fefo'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            FEFO Expiry ({expiredBatches.length + nearExpiryBatches.length} Alerts)
          </button>
          {canAdjustStock && (
            <>
              <button
                type="button"
                onClick={() => setActiveTab('reconciliation')}
                className={`px-3.5 py-2 text-xs font-bold uppercase tracking-tight rounded-lg transition-all cursor-pointer ${
                  activeTab === 'reconciliation'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Stock Reconciliation
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('adjustments')}
                className={`px-3.5 py-2 text-xs font-bold uppercase tracking-tight rounded-lg transition-all cursor-pointer ${
                  activeTab === 'adjustments'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Adjustments ({stockAdjustments.length})
              </button>
            </>
          )}
        </div>

        {canAdjustStock && (
          <button
            type="button"
            onClick={() => handleOpenAdjustmentModal()}
            className="inline-flex items-center px-3.5 py-2 text-xs font-bold uppercase tracking-tight text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            <ArrowUpDown className="w-3.5 h-3.5 mr-1.5" />
            Record Adjustment
          </button>
        )}
      </div>

      {/* TAB 1: STOCK LEVELS */}
      {activeTab === 'levels' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div className="relative w-full max-w-sm">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter stock items..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-hidden"
              />
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Threshold triggers automatic PO alerts when units reach min level.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Medication</th>
                  <th className="py-3.5 px-4 font-semibold">Category</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Active Batches</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Unit Price</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Min Level</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Current Stock</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Health Status</th>
                  {canViewCost && <th className="py-3.5 px-4 font-semibold text-right">Stock Valuation</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {medicines
                  .filter(m => !searchTerm || m.name.toLowerCase().includes(searchTerm.toLowerCase()) || m.genericName.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map((med) => {
                    const totalStock = batches
                      .filter(b => b.medicineId === med.id)
                      .reduce((sum, b) => sum + b.remainingQuantity, 0);
                    const batchCount = batches.filter(b => b.medicineId === med.id && b.remainingQuantity > 0).length;
                    const isLow = totalStock <= med.minimumStockLevel;
                    const isOut = totalStock <= 0;
                    const stockVal = totalStock * med.purchasePrice;

                    return (
                      <tr key={med.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{med.name}</div>
                          <div className="text-[11px] text-slate-500">{med.code} • {med.dosage}</div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                            {med.categoryName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                          {batchCount}
                        </td>
                        <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                          {settings.currencySymbol}{safeFixed(med.sellingPrice)}
                        </td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-500">
                          {med.minimumStockLevel}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`font-black text-sm ${
                              isOut ? 'text-rose-600' : isLow ? 'text-amber-600' : 'text-emerald-700'
                            }`}
                          >
                            {totalStock}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {isOut ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">
                              Out of Stock
                            </span>
                          ) : isLow ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                              Reorder Alert
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-md">
                              Adequate
                            </span>
                          )}
                        </td>
                        {canViewCost && (
                          <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                            {settings.currencySymbol}{safeFixed(stockVal)}
                          </td>
                        )}
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: FEFO EXPIRY & QUARANTINE */}
      {activeTab === 'fefo' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl text-xs text-amber-900 flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-amber-950">FEFO (First-Expired, First-Out) Dispensing Mandate</p>
              <p className="mt-0.5">
                Expired drugs must not be dispensed under any circumstances. Batches nearing expiry should be dispensed with priority or adjusted for clinical return.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Expired Batches Box */}
            <div className="bg-white p-5 rounded-3xl border border-rose-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-rose-950 flex items-center">
                <AlertOctagon className="w-4 h-4 mr-1.5 text-rose-600" />
                Expired Batches ({expiredBatches.length})
              </h3>

              {expiredBatches.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No expired batches in inventory.</p>
              ) : (
                <div className="space-y-2">
                  {expiredBatches.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-rose-50/60 border border-rose-200 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-rose-950">{item.medicine.name}</p>
                        <p className="text-[11px] text-rose-700">
                          Batch: <span className="font-mono font-bold">{item.batch.batchNumber}</span> • Expired: {item.batch.expiryDate}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleOpenAdjustmentModal(item.batch)}
                        className="px-3 py-1.5 bg-rose-600 text-white font-bold rounded-xl text-[11px] hover:bg-rose-700"
                      >
                        Dispose / Write-Off
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Near Expiry Batches Box */}
            <div className="bg-white p-5 rounded-3xl border border-amber-200 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-amber-950 flex items-center">
                <Calendar className="w-4 h-4 mr-1.5 text-amber-600" />
                Approaching Expiry (&lt; {settings.nearExpiryThresholdDays} Days)
              </h3>

              {nearExpiryBatches.length === 0 ? (
                <p className="text-xs text-slate-400 py-4 text-center">No batches approaching expiration threshold.</p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {nearExpiryBatches.map((item, idx) => (
                    <div key={idx} className="p-3.5 bg-amber-50/60 border border-amber-200 rounded-2xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-amber-950">{item.medicine.name}</p>
                        <p className="text-[11px] text-amber-800">
                          Batch: {item.batch.batchNumber} • Expiry: {item.batch.expiryDate} ({item.daysLeft} days remaining)
                        </p>
                      </div>
                      <span className="font-black text-amber-900 bg-amber-200/80 px-2 py-0.5 rounded-lg text-xs">
                        {item.batch.remainingQuantity} units
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: PHYSICAL AUDIT RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Physical Stock Count Reconciliation Tool</h3>
              <p className="text-xs text-slate-500">
                Perform periodic cycle counts, record physical counts, and auto-generate audit adjustments for variances.
              </p>
            </div>

            <button
              type="button"
              onClick={handleApplyReconciliation}
              className="px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
            >
              Apply Discrepancy Reconciliation
            </button>
          </div>

          {reconciliationStatus && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-semibold">
              {reconciliationStatus}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Medication & Batch</th>
                  <th className="py-3 px-4 font-semibold">Expiry</th>
                  <th className="py-3 px-4 font-semibold text-center">System Recorded Count</th>
                  <th className="py-3 px-4 font-semibold text-center">Physical Audit Count</th>
                  <th className="py-3 px-4 font-semibold text-right">Variance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {batches.map((b) => {
                  const med = medicines.find(m => m.id === b.medicineId);
                  const physCount = physicalCounts[b.id] !== undefined ? physicalCounts[b.id] : b.remainingQuantity;
                  const variance = physCount - b.remainingQuantity;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{med ? med.name : 'Unknown'}</div>
                        <div className="text-[11px] font-mono text-indigo-600">{b.batchNumber}</div>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{b.expiryDate}</td>
                      <td className="py-3 px-4 text-center font-bold text-slate-900">{b.remainingQuantity}</td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="number"
                          min="0"
                          value={physCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setPhysicalCounts(prev => ({ ...prev, [b.id]: val }));
                          }}
                          className="w-20 px-2 py-1 text-center font-bold text-xs bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="py-3 px-4 text-right">
                        {variance === 0 ? (
                          <span className="text-slate-400 font-semibold">0</span>
                        ) : variance > 0 ? (
                          <span className="font-bold text-emerald-600">+{variance}</span>
                        ) : (
                          <span className="font-bold text-rose-600">{variance}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: ADJUSTMENT HISTORY */}
      {activeTab === 'adjustments' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50">
            <h3 className="text-sm font-bold text-slate-900">Inventory Adjustment Audit Trail</h3>
            <p className="text-xs text-slate-500">Every inventory correction is permanently recorded for regulatory audit inspection.</p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3 px-4 font-semibold">Date</th>
                  <th className="py-3 px-4 font-semibold">Medication / Batch</th>
                  <th className="py-3 px-4 font-semibold">Reason</th>
                  <th className="py-3 px-4 font-semibold text-center">Adjustment</th>
                  <th className="py-3 px-4 font-semibold text-center">Resulting Qty</th>
                  <th className="py-3 px-4 font-semibold">Authorized Staff</th>
                  <th className="py-3 px-4 font-semibold">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {stockAdjustments.map((adj) => (
                  <tr key={adj.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-medium">{adj.date}</td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-900">{adj.medicineName}</div>
                      <div className="text-[11px] font-mono text-indigo-600">{adj.batchNumber}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md capitalize font-medium text-[11px]">
                        {adj.reason.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-center font-bold">
                      {adj.adjustmentQuantity > 0 ? (
                        <span className="text-emerald-600">+{adj.adjustmentQuantity}</span>
                      ) : (
                        <span className="text-rose-600">{adj.adjustmentQuantity}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-black text-slate-900">{adj.newQuantity}</td>
                    <td className="py-3 px-4 text-slate-700 font-medium">{adj.authorizedByName}</td>
                    <td className="py-3 px-4 text-slate-500 text-[11px]">{adj.notes || '—'}</td>
                  </tr>
                ))}

                {stockAdjustments.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                      No stock adjustments recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Record Stock Adjustment</h3>
              <button
                type="button"
                onClick={() => setIsAdjustModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveAdjustment} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Target Batch *</label>
                <select
                  value={selectedBatchId}
                  onChange={(e) => setSelectedBatchId(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                >
                  {batches.map((b) => {
                    const med = medicines.find(m => m.id === b.medicineId);
                    return (
                      <option key={b.id} value={b.id}>
                        {med ? med.name : 'Unknown'} • Batch: {b.batchNumber} (Stock: {b.remainingQuantity})
                      </option>
                    );
                  })}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Adjustment Quantity (+ or -) *
                  </label>
                  <input
                    type="number"
                    required
                    placeholder="e.g. -4 or 10"
                    value={adjustmentQty || ''}
                    onChange={(e) => setAdjustmentQty(parseInt(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-bold"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">Negative for reduction, positive for addition.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Adjustment Reason *</label>
                  <select
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value as AdjustmentReason)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium capitalize"
                  >
                    <option value="damaged">Damaged / Broken</option>
                    <option value="expired_disposal">Expired Disposal</option>
                    <option value="lost_theft">Lost / Theft</option>
                    <option value="inventory_count_discrepancy">Count Discrepancy</option>
                    <option value="received_correction">Receiving Correction</option>
                    <option value="other">Other Approved Reason</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Justification & Notes *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="Explain justification for audit inspection..."
                  value={adjustmentNotes}
                  onChange={(e) => setAdjustmentNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
