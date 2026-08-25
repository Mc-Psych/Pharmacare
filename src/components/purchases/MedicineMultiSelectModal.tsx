import React, { useState, useMemo } from 'react';
import { Medicine, PurchaseOrderItem } from '../../types';
import {
  Search,
  X,
  CheckSquare,
  Square,
  AlertTriangle,
  Package,
  Plus,
  Filter,
  Layers,
  Sparkles,
  Info
} from 'lucide-react';
import { safeFixed } from '../../utils/formatters';

interface MedicineMultiSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmAdd: (items: PurchaseOrderItem[]) => void;
  medicines: Medicine[];
  lowStockMedicines: { medicine: Medicine; currentStock: number }[];
  getMedicineTotalStock: (medicineId: string) => number;
  currencySymbol?: string;
  defaultSelectLowStock?: boolean;
}

interface SelectedItemState {
  quantity: number;
  unitCost: number;
}

export const MedicineMultiSelectModal: React.FC<MedicineMultiSelectModalProps> = ({
  isOpen,
  onClose,
  onConfirmAdd,
  medicines,
  lowStockMedicines,
  getMedicineTotalStock,
  currencySymbol = 'GH₵',
  defaultSelectLowStock = false,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeFilter, setActiveFilter] = useState<'low-stock' | 'all' | 'selected'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Map of low stock items for fast O(1) lookup
  const lowStockMap = useMemo(() => {
    const map = new Map<string, number>();
    lowStockMedicines.forEach(item => {
      map.set(item.medicine.id, item.currentStock);
    });
    return map;
  }, [lowStockMedicines]);

  // Compute smart suggested quantity
  const getSuggestedQuantity = (med: Medicine, currentStock: number) => {
    const minLevel = Number(med.minimumStockLevel) || 30;
    const stock = Number(currentStock) || 0;
    if (stock <= 0) {
      return Math.max(50, minLevel * 2);
    } else if (stock <= minLevel) {
      return Math.max(30, minLevel * 2 - stock);
    }
    return 50;
  };

  // Initial selection map
  const [selectedItems, setSelectedItems] = useState<{ [medId: string]: SelectedItemState }>(() => {
    if (defaultSelectLowStock && lowStockMedicines.length > 0) {
      const initial: { [medId: string]: SelectedItemState } = {};
      lowStockMedicines.forEach(item => {
        initial[item.medicine.id] = {
          quantity: getSuggestedQuantity(item.medicine, item.currentStock),
          unitCost: item.medicine.purchasePrice || 10,
        };
      });
      return initial;
    }
    return {};
  });

  // Calculate stock status and sort medicines: LOW STOCK FIRST, then alphabetical
  const processedMedicines = useMemo(() => {
    return medicines.map(med => {
      const isRecordedLow = lowStockMap.has(med.id);
      const stock = isRecordedLow ? (lowStockMap.get(med.id) ?? 0) : getMedicineTotalStock(med.id);
      const minLevel = med.minimumStockLevel || 30;
      const isOutOfStock = stock <= 0;
      const isLowStock = isRecordedLow || stock <= minLevel;

      return {
        med,
        stock,
        minLevel,
        isOutOfStock,
        isLowStock,
      };
    }).sort((a, b) => {
      // Priority 1: Out of stock (0 left)
      if (a.isOutOfStock && !b.isOutOfStock) return -1;
      if (!a.isOutOfStock && b.isOutOfStock) return 1;

      // Priority 2: Low stock
      if (a.isLowStock && !b.isLowStock) return -1;
      if (!a.isLowStock && b.isLowStock) return 1;

      // Priority 3: Among low stock, lowest stock first
      if (a.isLowStock && b.isLowStock) {
        if (a.stock !== b.stock) return a.stock - b.stock;
      }

      // Priority 4: Alphabetical by name
      return a.med.name.localeCompare(b.med.name);
    });
  }, [medicines, lowStockMap, getMedicineTotalStock]);

  // Categories list for filtering
  const categories = useMemo(() => {
    const cats = new Set<string>();
    medicines.forEach(m => {
      if (m.categoryName) cats.add(m.categoryName);
    });
    return Array.from(cats).sort();
  }, [medicines]);

  // Filtered list
  const filteredMedicines = useMemo(() => {
    return processedMedicines.filter(item => {
      // Tab filter
      if (activeFilter === 'low-stock' && !item.isLowStock) return false;
      if (activeFilter === 'selected' && !selectedItems[item.med.id]) return false;

      // Category filter
      if (categoryFilter !== 'all' && item.med.categoryName !== categoryFilter) return false;

      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const matchesName = item.med.name.toLowerCase().includes(query);
        const matchesGeneric = item.med.genericName?.toLowerCase().includes(query);
        const matchesCategory = item.med.categoryName?.toLowerCase().includes(query);
        const matchesDosage = item.med.dosage?.toLowerCase().includes(query);
        const matchesCode = item.med.code?.toLowerCase().includes(query);
        return matchesName || matchesGeneric || matchesCategory || matchesDosage || matchesCode;
      }

      return true;
    });
  }, [processedMedicines, activeFilter, categoryFilter, searchTerm, selectedItems]);

  if (!isOpen) return null;

  // Toggle single item selection
  const handleToggleSelect = (med: Medicine, currentStock: number) => {
    setSelectedItems(prev => {
      const next = { ...prev };
      if (next[med.id]) {
        delete next[med.id];
      } else {
        next[med.id] = {
          quantity: getSuggestedQuantity(med, currentStock),
          unitCost: med.purchasePrice || 10,
        };
      }
      return next;
    });
  };

  // Change quantity for a selected item
  const handleQuantityChange = (medId: string, qty: number) => {
    setSelectedItems(prev => {
      if (!prev[medId]) return prev;
      return {
        ...prev,
        [medId]: {
          ...prev[medId],
          quantity: Math.max(1, qty),
        },
      };
    });
  };

  // Change unit cost for a selected item
  const handleUnitCostChange = (medId: string, cost: number) => {
    setSelectedItems(prev => {
      if (!prev[medId]) return prev;
      return {
        ...prev,
        [medId]: {
          ...prev[medId],
          unitCost: Math.max(0, cost),
        },
      };
    });
  };

  // Select all low stock items in 1-click
  const handleSelectAllLowStock = () => {
    setSelectedItems(prev => {
      const next = { ...prev };
      processedMedicines.forEach(item => {
        if (item.isLowStock && !next[item.med.id]) {
          next[item.med.id] = {
            quantity: getSuggestedQuantity(item.med, item.stock),
            unitCost: item.med.purchasePrice || 10,
          };
        }
      });
      return next;
    });
  };

  // Select all filtered items
  const handleSelectAllFiltered = () => {
    setSelectedItems(prev => {
      const next = { ...prev };
      filteredMedicines.forEach(item => {
        if (!next[item.med.id]) {
          next[item.med.id] = {
            quantity: getSuggestedQuantity(item.med, item.stock),
            unitCost: item.med.purchasePrice || 10,
          };
        }
      });
      return next;
    });
  };

  // Clear all selections
  const handleDeselectAll = () => {
    setSelectedItems({});
  };

  // Calculate totals of selected items
  const selectedEntries = Object.entries(selectedItems);
  const selectedCount = selectedEntries.length;
  const totalUnits = selectedEntries.reduce((sum, [, val]) => sum + val.quantity, 0);
  const totalCost = selectedEntries.reduce((sum, [, val]) => sum + (val.quantity * val.unitCost), 0);

  // Submit and create PO items
  const handleConfirm = () => {
    if (selectedCount === 0) {
      alert('Please select at least one medicine using the checkboxes.');
      return;
    }

    const newPOItems: PurchaseOrderItem[] = selectedEntries.map(([medId, itemState], idx) => {
      const med = medicines.find(m => m.id === medId);
      const qty = Math.max(1, Number(itemState.quantity) || 1);
      const cost = Math.max(0, Number(itemState.unitCost) || 0);
      return {
        id: `poi-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        medicineId: medId,
        medicineName: med?.name || 'Unknown Medication',
        genericName: med?.genericName || '',
        quantityOrdered: qty,
        quantityReceived: 0,
        unitCost: cost,
        totalCost: qty * cost,
      };
    });

    onConfirmAdd(newPOItems);
    onClose();
  };

  const lowStockTotalCount = processedMedicines.filter(m => m.isLowStock).length;
  const outOfStockTotalCount = processedMedicines.filter(m => m.isOutOfStock).length;

  const isAllFilteredSelected = filteredMedicines.length > 0 && filteredMedicines.every(item => !!selectedItems[item.med.id]);

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[88vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Select Medicines for Purchase Order
              </h3>
              <p className="text-xs text-slate-500">
                Low stock medicines are prioritized at the top. Check off multiple items to batch add to PO.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Low Stock Alert Highlight Bar if Low Stock Exists */}
        {lowStockTotalCount > 0 && (
          <div className="bg-amber-50/80 border-b border-amber-200/80 px-6 py-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs text-amber-950">
            <div className="flex items-center space-x-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <div>
                <span className="font-bold text-amber-900">
                  {lowStockTotalCount} Medication(s) Below Reorder Threshold
                </span>{' '}
                <span className="text-amber-800 text-[11px]">
                  ({outOfStockTotalCount} out of stock). Pinned at the top of the list below.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleSelectAllLowStock}
              className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-amber-950 bg-amber-200/90 hover:bg-amber-300 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-700" />
              Select All {lowStockTotalCount} Low Stock Items
            </button>
          </div>
        )}

        {/* Search, Filter Tabs & Bulk Selection Controls */}
        <div className="p-4 bg-white border-b border-slate-200 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search medication name, generic name, category, dosage..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Category Dropdown */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">All Categories ({categories.length})</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Filter Tabs & Quick Checkbox Toggles */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center space-x-1.5">
              <button
                type="button"
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeFilter === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Medicines ({medicines.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('low-stock')}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeFilter === 'low-stock'
                    ? 'bg-amber-600 text-white'
                    : 'bg-amber-100/70 text-amber-900 hover:bg-amber-200/80'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5 mr-1" />
                Low Stock Only ({lowStockTotalCount})
              </button>
              <button
                type="button"
                onClick={() => setActiveFilter('selected')}
                className={`inline-flex items-center px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                  activeFilter === 'selected'
                    ? 'bg-indigo-600 text-white'
                    : 'bg-indigo-50 text-indigo-800 hover:bg-indigo-100'
                }`}
              >
                Selected ({selectedCount})
              </button>
            </div>

            {/* Checkbox Quick Select / Deselect */}
            <div className="flex items-center space-x-2 text-xs">
              <button
                type="button"
                onClick={() => {
                  if (isAllFilteredSelected) {
                    // Deselect filtered
                    setSelectedItems(prev => {
                      const next = { ...prev };
                      filteredMedicines.forEach(item => {
                        delete next[item.med.id];
                      });
                      return next;
                    });
                  } else {
                    handleSelectAllFiltered();
                  }
                }}
                className="inline-flex items-center px-2.5 py-1 text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md font-medium cursor-pointer"
              >
                {isAllFilteredSelected ? (
                  <>
                    <CheckSquare className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                    Deselect Filtered
                  </>
                ) : (
                  <>
                    <Square className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    Select All Filtered ({filteredMedicines.length})
                  </>
                )}
              </button>

              {selectedCount > 0 && (
                <button
                  type="button"
                  onClick={handleDeselectAll}
                  className="px-2.5 py-1 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md font-medium cursor-pointer"
                >
                  Clear All
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Medicines Table List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {filteredMedicines.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-2" />
              <p className="font-semibold text-sm">No medications match your filter criteria.</p>
              <p className="text-xs text-slate-400 mt-1">Try searching with a different keyword or resetting filters.</p>
            </div>
          ) : (
            <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-2xs">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600">
                    <th className="p-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllFilteredSelected}
                        onChange={() => {
                          if (isAllFilteredSelected) {
                            setSelectedItems(prev => {
                              const next = { ...prev };
                              filteredMedicines.forEach(item => {
                                delete next[item.med.id];
                              });
                              return next;
                            });
                          } else {
                            handleSelectAllFiltered();
                          }
                        }}
                        className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                        title="Select/Deselect all visible"
                      />
                    </th>
                    <th className="p-3">Medication Name & Formulation</th>
                    <th className="p-3 w-36">Current Stock Status</th>
                    <th className="p-3 w-28">Unit Cost</th>
                    <th className="p-3 w-32">Order Qty</th>
                    <th className="p-3 w-28 text-right">Line Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredMedicines.map(({ med, stock, minLevel, isOutOfStock, isLowStock }) => {
                    const isSelected = !!selectedItems[med.id];
                    const itemState = selectedItems[med.id] || {
                      quantity: getSuggestedQuantity(med, stock),
                      unitCost: med.purchasePrice || 10,
                    };
                    const lineTotal = itemState.quantity * itemState.unitCost;

                    return (
                      <tr
                        key={med.id}
                        onClick={(e) => {
                          // Prevent toggling when typing in input
                          const target = e.target as HTMLElement;
                          if (target.tagName === 'INPUT') return;
                          handleToggleSelect(med, stock);
                        }}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-50/70 hover:bg-indigo-50'
                            : isOutOfStock
                            ? 'bg-rose-50/30 hover:bg-rose-50/60'
                            : isLowStock
                            ? 'bg-amber-50/30 hover:bg-amber-50/60'
                            : 'hover:bg-slate-50'
                        }`}
                      >
                        {/* Checkbox */}
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(med, stock)}
                            className="rounded-sm border-slate-300 text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                          />
                        </td>

                        {/* Medication Details */}
                        <td className="p-3">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <span className="font-bold text-slate-900 text-xs">
                                {med.name}
                              </span>
                              {med.dosage && (
                                <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded-md text-[10px] font-medium">
                                  {med.dosage}
                                </span>
                              )}
                              {isOutOfStock && (
                                <span className="px-1.5 py-0.5 bg-rose-100 text-rose-700 rounded-md text-[10px] font-bold">
                                  0 LEFT (OUT OF STOCK)
                                </span>
                              )}
                              {!isOutOfStock && isLowStock && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded-md text-[10px] font-bold">
                                  LOW STOCK ({stock} LEFT)
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {med.genericName && <span>Generic: {med.genericName} • </span>}
                              <span>{med.categoryName || 'General'}</span>
                              {med.routeOfAdministration && <span> • {med.routeOfAdministration}</span>}
                            </div>
                          </div>
                        </td>

                        {/* Current Stock */}
                        <td className="p-3">
                          <div className="space-y-0.5">
                            <div className={`font-bold text-xs ${
                              isOutOfStock ? 'text-rose-700' : isLowStock ? 'text-amber-700' : 'text-slate-700'
                            }`}>
                              {stock} Units
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Reorder at: {minLevel} units
                            </div>
                          </div>
                        </td>

                        {/* Unit Cost */}
                        <td className="p-3">
                          {isSelected ? (
                            <div className="flex items-center space-x-1">
                              <span className="text-[11px] text-slate-400">{currencySymbol}</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={itemState.unitCost}
                                onChange={(e) => handleUnitCostChange(med.id, parseFloat(e.target.value) || 0)}
                                className="w-20 px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg font-medium text-slate-800 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden"
                              />
                            </div>
                          ) : (
                            <span className="text-slate-600 font-medium">
                              {currencySymbol}{safeFixed(med.purchasePrice || 10)}
                            </span>
                          )}
                        </td>

                        {/* Order Quantity */}
                        <td className="p-3">
                          {isSelected ? (
                            <div className="flex items-center space-x-1.5">
                              <input
                                type="number"
                                min="1"
                                value={itemState.quantity}
                                onChange={(e) => handleQuantityChange(med.id, parseInt(e.target.value) || 1)}
                                className="w-20 px-2 py-1 text-xs bg-white border-2 border-indigo-400 rounded-lg font-bold text-indigo-900 focus:ring-1 focus:ring-indigo-500 focus:outline-hidden text-center"
                              />
                              <span className="text-[10px] text-slate-500">units</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">
                              Suggested: {getSuggestedQuantity(med, stock)}
                            </span>
                          )}
                        </td>

                        {/* Line Total */}
                        <td className="p-3 text-right font-bold text-slate-800">
                          {isSelected ? (
                            <span className="text-indigo-700">
                              {currencySymbol}{safeFixed(lineTotal)}
                            </span>
                          ) : (
                            <span className="text-slate-400 font-normal">
                              -
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer Summary & Action Buttons */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-4 text-xs">
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-medium">Selected: </span>
              <span className="font-extrabold text-indigo-700">{selectedCount} Medication(s)</span>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-medium">Total Quantity: </span>
              <span className="font-extrabold text-slate-800">{totalUnits} Units</span>
            </div>
            <div className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-medium">Est. Total: </span>
              <span className="font-extrabold text-emerald-700">{currencySymbol}{safeFixed(totalCost)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className={`inline-flex items-center px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-xs transition-all cursor-pointer ${
                selectedCount > 0
                  ? 'bg-indigo-600 hover:bg-indigo-700'
                  : 'bg-slate-400 cursor-not-allowed opacity-60'
              }`}
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Add {selectedCount} Selected Medicine{selectedCount === 1 ? '' : 's'} to Order
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
