import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { ReturnReason, Sale, ReturnItem } from '../../types';
import {
  RotateCcw,
  Search,
  CheckCircle,
  AlertTriangle,
  X,
  Receipt
} from 'lucide-react';
import { safeFixed } from '../../utils/formatters';

export const ReturnsView: React.FC = () => {
  const {
    salesReturns,
    sales,
    processSaleReturn,
    settings,
    currentUser,
    showToast
  } = usePharmacy();

  const [searchTerm, setSearchTerm] = useState('');
  const [isProcessModalOpen, setIsProcessModalOpen] = useState(false);

  // Form State for new Return
  const [invoiceLookup, setInvoiceLookup] = useState('');
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  
  // Multi-item selections
  const [selectedItemIds, setSelectedItemIds] = useState<Record<string, boolean>>({});
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [itemReasons, setItemReasons] = useState<Record<string, ReturnReason>>({});
  const [itemRestock, setItemRestock] = useState<Record<string, boolean>>({});
  
  // Global defaults for quick batch applying
  const [globalReason, setGlobalReason] = useState<ReturnReason>('patient_adverse_reaction');
  const [globalRestock, setGlobalRestock] = useState<boolean>(true);
  const [returnNotes, setReturnNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedReturnId, setExpandedReturnId] = useState<string | null>(null);

  // Calculate previously returned quantities for items in the selected sale
  const previouslyReturnedQuantities = useMemo(() => {
    if (!selectedSale) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    salesReturns
      .filter(r => r.saleId === selectedSale.id || r.invoiceNumber === selectedSale.invoiceNumber)
      .forEach(ret => {
        ret.items.forEach(it => {
          const key = it.saleItemId || it.medicineId;
          map[key] = (map[key] || 0) + (it.quantityReturned || it.quantity || 0);
        });
      });
    return map;
  }, [selectedSale, salesReturns]);

  const handleSelectSale = (sale: Sale) => {
    setSelectedSale(sale);
    setInvoiceLookup(sale.invoiceNumber);
    setErrorMsg('');

    // Pre-populate selections for all available returnable items
    const initSelected: Record<string, boolean> = {};
    const initQtys: Record<string, number> = {};
    const initReasons: Record<string, ReturnReason> = {};
    const initRestock: Record<string, boolean> = {};

    sale.items.forEach((item) => {
      const prevReturned = previouslyReturnedQuantities[item.id] || 0;
      const maxReturnable = Math.max(0, item.quantity - prevReturned);
      
      initSelected[item.id] = maxReturnable > 0;
      initQtys[item.id] = maxReturnable > 0 ? 1 : 0;
      initReasons[item.id] = globalReason;
      initRestock[item.id] = globalRestock;
    });

    setSelectedItemIds(initSelected);
    setReturnQuantities(initQtys);
    setItemReasons(initReasons);
    setItemRestock(initRestock);
  };

  const handleLookupInvoice = () => {
    setErrorMsg('');
    const query = invoiceLookup.trim().toLowerCase();
    if (!query) {
      setErrorMsg('Please enter an invoice number to search.');
      return;
    }
    const found = sales.find(
      s => s.invoiceNumber.toLowerCase() === query
    );
    if (found) {
      handleSelectSale(found);
    } else {
      setErrorMsg(`No completed sale invoice found matching "${invoiceLookup}".`);
      setSelectedSale(null);
    }
  };

  // Toggle selection for a single line item
  const handleToggleItem = (itemId: string) => {
    setSelectedItemIds(prev => {
      const isCurrentlySelected = !!prev[itemId];
      const nextState = !isCurrentlySelected;
      
      // If turning on, ensure return quantity is at least 1
      if (nextState) {
        setReturnQuantities(qPrev => {
          const item = selectedSale?.items.find(i => i.id === itemId);
          const prevReturned = previouslyReturnedQuantities[itemId] || 0;
          const maxReturnable = item ? Math.max(0, item.quantity - prevReturned) : 1;
          const curVal = qPrev[itemId];
          return {
            ...qPrev,
            [itemId]: (!curVal || curVal < 1) ? Math.min(1, maxReturnable) : Math.min(curVal, maxReturnable)
          };
        });
      }
      
      return { ...prev, [itemId]: nextState };
    });
  };

  // Toggle all items
  const handleToggleAll = (selectAll: boolean) => {
    if (!selectedSale) return;
    const nextSelected: Record<string, boolean> = {};
    const nextQtys = { ...returnQuantities };
    
    selectedSale.items.forEach(item => {
      const prevReturned = previouslyReturnedQuantities[item.id] || 0;
      const maxReturnable = Math.max(0, item.quantity - prevReturned);
      if (maxReturnable > 0) {
        nextSelected[item.id] = selectAll;
        if (selectAll && (!nextQtys[item.id] || nextQtys[item.id] < 1)) {
          nextQtys[item.id] = 1;
        }
      } else {
        nextSelected[item.id] = false;
      }
    });

    setSelectedItemIds(nextSelected);
    setReturnQuantities(nextQtys);
  };

  // Apply global reason to all checked items
  const handleApplyGlobalReason = (reason: ReturnReason) => {
    setGlobalReason(reason);
    setItemReasons(prev => {
      const updated = { ...prev };
      Object.keys(selectedItemIds).forEach(itemId => {
        if (selectedItemIds[itemId]) {
          updated[itemId] = reason;
        }
      });
      return updated;
    });
  };

  // Apply global restock to all checked items
  const handleApplyGlobalRestock = (restock: boolean) => {
    setGlobalRestock(restock);
    setItemRestock(prev => {
      const updated = { ...prev };
      Object.keys(selectedItemIds).forEach(itemId => {
        if (selectedItemIds[itemId]) {
          updated[itemId] = restock;
        }
      });
      return updated;
    });
  };

  // Calculate selected items and total refund
  const checkedItemsSummary = useMemo(() => {
    if (!selectedSale) return { count: 0, totalUnits: 0, totalRefund: 0, itemsToReturn: [] };

    let count = 0;
    let totalUnits = 0;
    let totalRefund = 0;
    const itemsToReturn: Array<{
      item: Sale['items'][0];
      qty: number;
      reason: ReturnReason;
      restock: boolean;
      refundAmount: number;
    }> = [];

    selectedSale.items.forEach(item => {
      if (selectedItemIds[item.id]) {
        const prevReturned = previouslyReturnedQuantities[item.id] || 0;
        const maxReturnable = Math.max(0, item.quantity - prevReturned);
        const qty = Math.min(Math.max(1, returnQuantities[item.id] || 1), maxReturnable);
        
        if (qty > 0 && maxReturnable > 0) {
          const refundAmt = item.unitPrice * qty;
          count += 1;
          totalUnits += qty;
          totalRefund += refundAmt;
          itemsToReturn.push({
            item,
            qty,
            reason: itemReasons[item.id] || globalReason,
            restock: itemRestock[item.id] ?? globalRestock,
            refundAmount: refundAmt,
          });
        }
      }
    });

    return { count, totalUnits, totalRefund, itemsToReturn };
  }, [selectedSale, selectedItemIds, returnQuantities, itemReasons, itemRestock, globalReason, globalRestock, previouslyReturnedQuantities]);

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedSale) return;

    if (checkedItemsSummary.itemsToReturn.length === 0) {
      setErrorMsg('Please select at least one medicine item using the checkboxes to process a return.');
      return;
    }

    // Build the items payload for the return order
    const returnItemsPayload: ReturnItem[] = checkedItemsSummary.itemsToReturn.map(({ item, qty, reason, restock, refundAmount }) => ({
      id: `reti-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      saleItemId: item.id,
      medicineId: item.medicineId,
      medicineName: item.medicineName,
      batchId: item.batchId,
      batchNumber: item.batchNumber,
      quantity: qty,
      quantityReturned: qty,
      unitPrice: item.unitPrice,
      refundAmount: refundAmount,
      reason: reason,
      condition: restock ? 'restockable' : 'write_off',
      restockedToInventory: restock,
    }));

    const result = processSaleReturn({
      saleId: selectedSale.id,
      invoiceNumber: selectedSale.invoiceNumber,
      customerId: selectedSale.customerId,
      customerName: selectedSale.customerName,
      items: returnItemsPayload,
      totalRefund: checkedItemsSummary.totalRefund,
      totalRefundAmount: checkedItemsSummary.totalRefund,
      returnDate: new Date().toISOString().split('T')[0],
      reason: checkedItemsSummary.itemsToReturn[0]?.reason || globalReason,
      restockedToInventory: checkedItemsSummary.itemsToReturn.some(it => it.restock),
      processedBy: currentUser.id,
      processedByName: currentUser.name,
      notes: returnNotes || `Multi-item return of ${checkedItemsSummary.count} medicines for invoice ${selectedSale.invoiceNumber}`,
      status: 'approved',
    });

    if (result && result.success) {
      showToast({
        title: 'Return & Refund Processed',
        message: `Successfully processed return for ${checkedItemsSummary.count} medicine(s). Total refund: ${settings.currencySymbol}${safeFixed(checkedItemsSummary.totalRefund)}`,
        type: 'success'
      });
      setIsProcessModalOpen(false);
      setSelectedSale(null);
      setInvoiceLookup('');
      setSelectedItemIds({});
      setReturnQuantities({});
      setReturnNotes('');
      setErrorMsg('');
    }
  };

  const filteredReturns = useMemo(() => {
    return salesReturns.filter(r => {
      const term = searchTerm.toLowerCase();
      const matchesItems = r.items.some(it => 
        (it.medicineName && it.medicineName.toLowerCase().includes(term)) ||
        (it.batchNumber && it.batchNumber.toLowerCase().includes(term))
      );
      return (
        !term ||
        r.returnNumber.toLowerCase().includes(term) ||
        r.invoiceNumber.toLowerCase().includes(term) ||
        r.customerName.toLowerCase().includes(term) ||
        matchesItems
      );
    });
  }, [salesReturns, searchTerm]);

  // Recent completed sales for quick lookup
  const recentCompletedSales = useMemo(() => {
    return sales
      .filter(s => s.dispenseStatus === 'finally_dispensed' || s.dispenseStatus === 'paid_awaiting_dispense' || s.status === 'completed')
      .slice(0, 5);
  }, [sales]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <span className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
              <RotateCcw className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-bold text-slate-900">Sales Returns & Financial Refunds</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Authorized for Administrators & Pharmacists. Process single or multiple medicine returns per receipt with batch restock control.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsProcessModalOpen(true);
            setErrorMsg('');
          }}
          className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
        >
          <RotateCcw className="w-4 h-4 mr-1.5" />
          Process Return / Refund
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Return #, Original Invoice #, Patient Name, or Medicine Name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Returns History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Processed Returns Audit Trail</h3>
            <p className="text-xs text-slate-500">Official log of patient returns, restocked inventory, and financial refunds</p>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 bg-slate-200/70 text-slate-700 rounded-full">
            {filteredReturns.length} Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 font-semibold">Return #</th>
                <th className="py-3 px-4 font-semibold">Date & Time</th>
                <th className="py-3 px-4 font-semibold">Invoice Ref</th>
                <th className="py-3 px-4 font-semibold">Patient / Customer</th>
                <th className="py-3 px-4 font-semibold">Returned Medicines ({settings.currencySymbol})</th>
                <th className="py-3 px-4 font-semibold">Primary Reason</th>
                <th className="py-3 px-4 font-semibold text-center">Batch Restock</th>
                <th className="py-3 px-4 font-semibold text-right">Refund Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredReturns.map((ret) => {
                const isExpanded = expandedReturnId === ret.id;
                return (
                  <React.Fragment key={ret.id}>
                    <tr className="hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-700">{ret.returnNumber}</td>
                      <td className="py-3.5 px-4 text-slate-500">{new Date(ret.createdAt).toLocaleString()}</td>
                      <td className="py-3.5 px-4 font-mono font-semibold text-slate-900">{ret.invoiceNumber}</td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">{ret.customerName}</td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-1">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900">
                              {ret.items.length} {ret.items.length === 1 ? 'Medicine' : 'Medicines'}
                            </span>
                            {ret.items.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setExpandedReturnId(isExpanded ? null : ret.id)}
                                className="inline-flex items-center text-[10px] font-bold text-indigo-600 hover:text-indigo-800 underline ml-1 cursor-pointer"
                              >
                                {isExpanded ? 'Hide items' : 'View all items'}
                              </button>
                            )}
                          </div>
                          
                          {/* Quick summary line */}
                          {!isExpanded && (
                            <div className="text-[11px] text-slate-600 truncate max-w-xs">
                              {ret.items.map(it => `${it.medicineName} (${it.quantityReturned || it.quantity}x)`).join(', ')}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium capitalize">
                          {ret.reason ? ret.reason.replace(/_/g, ' ') : 'Return'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {ret.restockedToInventory || ret.items.some(i => i.restockedToInventory) ? (
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md inline-flex items-center">
                            <CheckCircle className="w-3 h-3 mr-1" />
                            Restocked
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md inline-flex items-center">
                            <AlertTriangle className="w-3 h-3 mr-1" />
                            Quarantine / Disposed
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-rose-600">
                        -{settings.currencySymbol}{safeFixed(ret.totalRefundAmount || ret.totalRefund || 0)}
                      </td>
                    </tr>

                    {/* Expandable item details row */}
                    {isExpanded && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={8} className="px-6 py-3 border-y border-slate-200">
                          <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-2">
                            <div className="text-xs font-bold text-slate-900 border-b border-slate-100 pb-1.5 flex justify-between items-center">
                              <span>Returned Medicines Breakdown for {ret.returnNumber}:</span>
                              <span className="text-[11px] text-slate-500">Processed by: {ret.processedByName || 'Pharmacist'}</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                              {ret.items.map((it, idx) => (
                                <div key={idx} className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs">
                                  <div className="font-bold text-slate-900">{it.medicineName}</div>
                                  <div className="text-[11px] text-slate-500 flex justify-between mt-1">
                                    <span>Batch: <span className="font-mono font-semibold text-slate-700">{it.batchNumber}</span></span>
                                    <span>Qty: <strong className="text-slate-900">{it.quantityReturned || it.quantity}</strong></span>
                                  </div>
                                  <div className="flex justify-between items-center mt-1.5 pt-1 border-t border-slate-200/60 text-[11px]">
                                    <span className={it.restockedToInventory ? 'text-emerald-700 font-medium' : 'text-rose-700 font-medium'}>
                                      {it.restockedToInventory ? '✓ Restocked' : '⚠ Write-off'}
                                    </span>
                                    <span className="font-bold text-rose-600">
                                      {settings.currencySymbol}{safeFixed(it.refundAmount || ((it.quantityReturned || it.quantity) * it.unitPrice))}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                            {ret.notes && (
                              <div className="text-[11px] text-slate-600 bg-amber-50/60 p-2 rounded border border-amber-100">
                                <strong>Clinical Note:</strong> {ret.notes}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

              {filteredReturns.length === 0 && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 text-xs">
                    <RotateCcw className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                    No sales return records found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Process Return & Multi-Item Refund Modal */}
      {isProcessModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-6 p-6 space-y-4 max-h-[92vh] flex flex-col">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2.5">
                <span className="p-2 bg-rose-50 text-rose-600 rounded-xl">
                  <RotateCcw className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Process Sale Return & Refund</h3>
                  <p className="text-xs text-slate-500">Select one or multiple medicines from the customer receipt to refund</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsProcessModalOpen(false);
                  setSelectedSale(null);
                  setInvoiceLookup('');
                  setErrorMsg('');
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto pr-1 space-y-4 flex-1">
              {/* Step 1: Lookup Invoice */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-800">1. Lookup Sale Invoice Number *</label>
                <div className="flex space-x-2">
                  <div className="relative flex-1">
                    <Receipt className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. INV-20260824-001"
                      value={invoiceLookup}
                      onChange={(e) => setInvoiceLookup(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleLookupInvoice();
                        }
                      }}
                      className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-lg font-mono font-bold focus:ring-2 focus:ring-emerald-500 focus:outline-hidden uppercase"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleLookupInvoice}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Find Receipt
                  </button>
                </div>

                {/* Quick Recent Sales Pills */}
                {!selectedSale && recentCompletedSales.length > 0 && (
                  <div className="pt-1.5">
                    <span className="text-[10px] font-semibold text-slate-500 mr-2">Or select recent sale:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {recentCompletedSales.map(sale => (
                        <button
                          key={sale.id}
                          type="button"
                          onClick={() => handleSelectSale(sale)}
                          className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:border-emerald-300 border border-slate-200 rounded-md text-[11px] font-mono text-slate-700 transition-colors cursor-pointer"
                        >
                          <strong>{sale.invoiceNumber}</strong> ({sale.customerName} • {settings.currencySymbol}{safeFixed(sale.grandTotal)})
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {errorMsg && (
                  <div className="flex items-center text-xs text-rose-600 font-medium bg-rose-50 p-2 rounded-lg border border-rose-200">
                    <AlertTriangle className="w-4 h-4 mr-1.5 shrink-0" />
                    {errorMsg}
                  </div>
                )}
              </div>

              {/* Step 2: Multi-Item Selection & Refund Settings */}
              {selectedSale && (
                <form onSubmit={handleSubmitReturn} className="space-y-4">
                  {/* Invoice Meta Banner */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-emerald-50/60 p-3 rounded-xl border border-emerald-100 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 block">Customer / Patient:</span>
                      <strong className="text-slate-900 font-bold">{selectedSale.customerName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Sale Date & Time:</span>
                      <span className="text-slate-800">{new Date(selectedSale.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Original Sale Total:</span>
                      <strong className="text-slate-900 font-bold">{settings.currencySymbol}{safeFixed(selectedSale.grandTotal)}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 block">Prior Refunds:</span>
                      <span className="text-rose-600 font-bold">
                        {selectedSale.refundedAmount ? `${settings.currencySymbol}${safeFixed(selectedSale.refundedAmount)}` : 'None'}
                      </span>
                    </div>
                  </div>

                  {/* Multi-Item Selection Table */}
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-center space-x-2">
                        <label className="text-xs font-bold text-slate-900">
                          2. Select Medicines to Return ({checkedItemsSummary.count} of {selectedSale.items.length} selected)
                        </label>
                      </div>

                      {/* Quick Select All / Clear */}
                      <div className="flex items-center space-x-2">
                        <button
                          type="button"
                          onClick={() => handleToggleAll(true)}
                          className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors cursor-pointer"
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAll(false)}
                          className="px-2.5 py-1 text-[11px] font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
                        >
                          Clear Selection
                        </button>
                      </div>
                    </div>

                    {/* Medicines List with Checkboxes */}
                    <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs divide-y divide-slate-100">
                      {selectedSale.items.map((item) => {
                        const isChecked = !!selectedItemIds[item.id];
                        const prevReturned = previouslyReturnedQuantities[item.id] || 0;
                        const maxReturnable = Math.max(0, item.quantity - prevReturned);
                        const isFullyReturned = maxReturnable === 0;
                        const returnQty = returnQuantities[item.id] || 1;

                        return (
                          <div
                            key={item.id}
                            className={`p-3 transition-colors ${
                              isFullyReturned
                                ? 'bg-slate-100/70 opacity-60'
                                : isChecked
                                ? 'bg-emerald-50/40 border-l-4 border-l-emerald-500'
                                : 'bg-white hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              {/* Left: Checkbox & Medicine Details */}
                              <div className="flex items-start space-x-3 flex-1 min-w-0">
                                <div className="pt-0.5">
                                  <input
                                    type="checkbox"
                                    id={`check-${item.id}`}
                                    disabled={isFullyReturned}
                                    checked={isChecked}
                                    onChange={() => handleToggleItem(item.id)}
                                    className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500 cursor-pointer disabled:cursor-not-allowed"
                                  />
                                </div>

                                <div className="min-w-0 flex-1">
                                  <label
                                    htmlFor={`check-${item.id}`}
                                    className={`text-xs font-bold block cursor-pointer ${
                                      isChecked ? 'text-slate-900' : 'text-slate-700'
                                    }`}
                                  >
                                    {item.medicineName}
                                  </label>
                                  <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-slate-500">
                                    {item.dosage && <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">{item.dosage}</span>}
                                    <span>Batch: <strong className="font-mono text-slate-700">{item.batchNumber}</strong></span>
                                    <span>• Purchased: <strong className="text-slate-800">{item.quantity} units</strong> @ {settings.currencySymbol}{safeFixed(item.unitPrice)}</span>
                                    {prevReturned > 0 && (
                                      <span className="text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-medium">
                                        Already returned: {prevReturned}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Right: Quantity & Subtotal Controls */}
                              {!isFullyReturned ? (
                                <div className="flex items-center space-x-3 self-end sm:self-center">
                                  <div className="flex items-center space-x-1.5">
                                    <label className="text-[11px] font-semibold text-slate-600">Qty to Return:</label>
                                    <input
                                      type="number"
                                      min="1"
                                      max={maxReturnable}
                                      disabled={!isChecked}
                                      value={returnQuantities[item.id] || 1}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value) || 1;
                                        const clamped = Math.min(Math.max(1, val), maxReturnable);
                                        setReturnQuantities(prev => ({ ...prev, [item.id]: clamped }));
                                      }}
                                      className="w-16 px-2 py-1 text-xs text-center font-bold bg-white border border-slate-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:outline-hidden disabled:bg-slate-100 disabled:text-slate-400"
                                    />
                                    <span className="text-[11px] text-slate-400">/ {maxReturnable}</span>
                                  </div>

                                  <div className="text-right min-w-20">
                                    <span className="text-[10px] text-slate-400 block">Item Refund</span>
                                    <strong className={`text-xs font-black ${isChecked ? 'text-rose-600' : 'text-slate-400'}`}>
                                      {settings.currencySymbol}{safeFixed((Number(item.unitPrice) || 0) * (Number(returnQuantities[item.id]) || 1))}
                                    </strong>
                                  </div>
                                </div>
                              ) : (
                                <div className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-1 rounded">
                                  Fully Refunded
                                </div>
                              )}
                            </div>

                            {/* Expanded individual item settings if checked */}
                            {isChecked && (
                              <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-emerald-50/30 p-2 rounded-lg">
                                <div>
                                  <label className="block text-[10px] font-semibold text-slate-600 mb-0.5">Reason for this medicine:</label>
                                  <select
                                    value={itemReasons[item.id] || globalReason}
                                    onChange={(e) => setItemReasons(prev => ({ ...prev, [item.id]: e.target.value as ReturnReason }))}
                                    className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded-md focus:ring-2 focus:ring-emerald-500"
                                  >
                                    <option value="patient_adverse_reaction">Adverse Drug Reaction</option>
                                    <option value="dispensing_error">Dispensing / Dosage Error</option>
                                    <option value="defective_damaged">Defective / Damaged Package</option>
                                    <option value="customer_requested">Customer Requested Return</option>
                                    <option value="expired_sold_in_error">Sold in Error</option>
                                  </select>
                                </div>

                                <div className="flex items-center pt-3">
                                  <label className="inline-flex items-center space-x-1.5 cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={itemRestock[item.id] ?? globalRestock}
                                      onChange={(e) => setItemRestock(prev => ({ ...prev, [item.id]: e.target.checked }))}
                                      className="w-3.5 h-3.5 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500"
                                    />
                                    <span className="text-[11px] font-semibold text-slate-700">
                                      Restock back to batch <span className="font-mono text-emerald-700 font-bold">({item.batchNumber})</span>
                                    </span>
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Batch Global Controls */}
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                        Batch Set Reason for All Checked Medicines:
                      </label>
                      <select
                        value={globalReason}
                        onChange={(e) => handleApplyGlobalReason(e.target.value as ReturnReason)}
                        className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="patient_adverse_reaction">Adverse Drug Reaction</option>
                        <option value="dispensing_error">Dispensing / Dosage Error</option>
                        <option value="defective_damaged">Defective / Damaged Package</option>
                        <option value="customer_requested">Customer Requested Return</option>
                        <option value="expired_sold_in_error">Sold in Error</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-4">
                      <label className="inline-flex items-center space-x-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={globalRestock}
                          onChange={(e) => handleApplyGlobalRestock(e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer"
                        />
                        <span className="text-xs font-semibold text-slate-700">
                          Restock all eligible items back into active inventory
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Clinical Notes */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Audit Notes & Clinical Explanation (Optional)
                    </label>
                    <textarea
                      rows={2}
                      value={returnNotes}
                      onChange={(e) => setReturnNotes(e.target.value)}
                      placeholder="Document reason for return, patient symptoms, or package condition for pharmacy audit..."
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>

                  {/* Financial Refund Summary Box */}
                  <div className="p-4 bg-rose-50/90 rounded-xl border border-rose-200 text-xs space-y-2.5">
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="font-bold text-rose-950 block text-sm">
                          Total Refund Payable to Customer:
                        </span>
                        <span className="text-[11px] text-rose-700">
                          ({checkedItemsSummary.count} distinct medicines • {checkedItemsSummary.totalUnits} total units)
                        </span>
                      </div>
                      <span className="text-xl font-black text-rose-700">
                        {settings.currencySymbol}{safeFixed(checkedItemsSummary.totalRefund)}
                      </span>
                    </div>

                    {selectedSale.items.length > 0 && (
                      <div className="pt-2 border-t border-rose-200/80 flex justify-between items-center text-[11px] text-slate-700">
                        <span>Retained Pharmacy Sales Revenue on Receipt:</span>
                        <span className="font-bold text-emerald-800">
                          {settings.currencySymbol}{safeFixed(Math.max(0, selectedSale.grandTotal - ((selectedSale.refundedAmount || 0) + checkedItemsSummary.totalRefund)))}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Modal Action Buttons */}
                  <div className="pt-2 flex justify-end space-x-2.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => {
                        setIsProcessModalOpen(false);
                        setSelectedSale(null);
                        setInvoiceLookup('');
                      }}
                      className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={checkedItemsSummary.count === 0}
                      className="px-5 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 rounded-lg shadow-xs cursor-pointer transition-colors"
                    >
                      Confirm Return & Issue Refund ({settings.currencySymbol}{safeFixed(checkedItemsSummary.totalRefund)})
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
