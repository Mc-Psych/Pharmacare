import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { Medicine, DosageForm, RouteOfAdministration, Category } from '../../types';
import {
  Pill,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Boxes,
  ShieldAlert,
  CheckCircle,
  FileText,
  X,
  Layers,
  ChevronRight,
  AlertTriangle,
  FolderPlus,
  FileSpreadsheet,
  Settings2,
  Percent,
  Sparkles,
  Check,
  Building2,
  Calculator,
} from 'lucide-react';
import { safeFixed } from '../../utils/formatters';
import { BulkUploadMedicinesModal } from './BulkUploadMedicinesModal';
import { nhisCategories, nhisGhanaMedicines, nhisInitialBatches } from '../../data/nhisMedicinesData';

const ROUTE_OPTIONS: RouteOfAdministration[] = [
  'Oral',
  'Intravenous (IV)',
  'Intramuscular (IM)',
  'Subcutaneous (SC)',
  'Topical',
  'Inhalation',
  'Ophthalmic (Eye)',
  'Otic (Ear)',
  'Nasal',
  'Sublingual / Buccal',
  'Rectal',
  'Transdermal',
  'Vaginal',
  'Intradermal',
  'Other'
];

const MARKUP_PRESETS = [15, 20, 25, 30, 33.33, 35, 40, 50, 75, 100];

export const MedicineManagementView: React.FC = () => {
  const {
    medicines,
    categories,
    batches,
    addMedicine,
    updateMedicine,
    deleteMedicine,
    addCategory,
    updateCategory,
    deleteCategory,
    addBatch,
    settings,
    getMedicineTotalStock,
    getMedicineBatches,
    currentUser,
    hasPermission,
  } = usePharmacy();

  const canManageMedicine = hasPermission('manage_medicines') && currentUser.role !== 'dispensing_assistant' && currentUser.role !== 'cashier';
  const canViewCost = hasPermission('view_cost_price') && currentUser.role !== 'dispensing_assistant';
  const canEditCategory = currentUser.role === 'admin' || currentUser.role === 'storekeeper';

  const [activeSubTab, setActiveSubTab] = useState<'medicines' | 'batches' | 'categories'>('medicines');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [rxFilter, setRxFilter] = useState('all');
  const [nhisFilter, setNhisFilter] = useState('all');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState<Medicine | null>(null);
  const [selectedMedForBatches, setSelectedMedForBatches] = useState<Medicine | null>(null);
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [nhisImportSuccess, setNhisImportSuccess] = useState<string | null>(null);

  // Category Form State
  const [catName, setCatName] = useState('');
  const [catDesc, setCatDesc] = useState('');

  // Markup percentage state in the form
  const [formMarkupPercent, setFormMarkupPercent] = useState<number>(35);

  // Form State for Medicine
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    genericName: '',
    brandName: '',
    categoryId: categories[0]?.id || '',
    categoryName: categories[0]?.name || '',
    dosage: '',
    form: 'Tablet' as DosageForm,
    routeOfAdministration: 'Oral' as RouteOfAdministration,
    strength: '',
    unit: 'Box of 20',
    purchasePrice: 0,
    sellingPrice: 0,
    markupPercentage: 35,
    nhisCovered: false,
    nhisCode: '',
    nhisLevel: 'M' as 'M' | 'B' | 'C' | 'D',
    nhisTariffPrice: 0,
    minimumStockLevel: 20,
    requiresPrescription: false,
    description: '',
    sideEffects: '',
    barcode: '',
    status: 'active' as 'active' | 'inactive' | 'discontinued',
  });

  const resetForm = () => {
    const defaultCost = 10;
    const defaultMarkup = settings.defaultMarkupPercent || 35;
    const defaultPrice = Number((defaultCost * (1 + defaultMarkup / 100)).toFixed(2));
    setFormMarkupPercent(defaultMarkup);
    setFormData({
      code: `MED-${Date.now().toString().slice(-4)}`,
      name: '',
      genericName: '',
      brandName: '',
      categoryId: categories[0]?.id || '',
      categoryName: categories[0]?.name || '',
      dosage: '',
      form: 'Tablet',
      routeOfAdministration: 'Oral',
      strength: '',
      unit: 'Box of 20',
      purchasePrice: defaultCost,
      sellingPrice: defaultPrice,
      markupPercentage: defaultMarkup,
      nhisCovered: false,
      nhisCode: '',
      nhisLevel: 'M',
      nhisTariffPrice: 0,
      minimumStockLevel: 20,
      requiresPrescription: false,
      description: '',
      sideEffects: '',
      barcode: `${Math.floor(100000000000 + Math.random() * 900000000000)}`,
      status: 'active' as 'active' | 'inactive' | 'discontinued',
    });
  };

  const handleOpenAddModal = () => {
    resetForm();
    setEditingMedicine(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (med: Medicine) => {
    setEditingMedicine(med);
    const calculatedMarkup = med.purchasePrice > 0
      ? Number((((med.sellingPrice - med.purchasePrice) / med.purchasePrice) * 100).toFixed(2))
      : (med.markupPercentage || 35);
    setFormMarkupPercent(calculatedMarkup);
    setFormData({
      code: med.code,
      name: med.name,
      genericName: med.genericName,
      brandName: med.brandName || '',
      categoryId: med.categoryId,
      categoryName: med.categoryName,
      dosage: med.dosage,
      form: med.form,
      routeOfAdministration: (med.routeOfAdministration as RouteOfAdministration) || 'Oral',
      strength: med.strength,
      unit: med.unit,
      purchasePrice: med.purchasePrice,
      sellingPrice: med.sellingPrice,
      markupPercentage: calculatedMarkup,
      nhisCovered: !!med.nhisCovered,
      nhisCode: med.nhisCode || '',
      nhisLevel: med.nhisLevel || 'M',
      nhisTariffPrice: med.nhisTariffPrice || 0,
      minimumStockLevel: med.minimumStockLevel,
      requiresPrescription: med.requiresPrescription,
      description: med.description || '',
      sideEffects: med.sideEffects || '',
      barcode: med.barcode || '',
      status: med.status,
    });
    setIsAddModalOpen(true);
  };

  // Price Calculation Handlers
  const handlePurchasePriceChange = (cost: number) => {
    const validCost = Math.max(0, cost);
    const newSelling = Number((validCost * (1 + formMarkupPercent / 100)).toFixed(2));
    setFormData(prev => ({
      ...prev,
      purchasePrice: validCost,
      sellingPrice: newSelling,
      markupPercentage: formMarkupPercent,
    }));
  };

  const handleMarkupPercentChange = (markup: number) => {
    const validMarkup = Math.max(0, markup);
    setFormMarkupPercent(validMarkup);
    const newSelling = Number((formData.purchasePrice * (1 + validMarkup / 100)).toFixed(2));
    setFormData(prev => ({
      ...prev,
      sellingPrice: newSelling,
      markupPercentage: validMarkup,
    }));
  };

  const handleSellingPriceChange = (price: number) => {
    const validPrice = Math.max(0, price);
    const newMarkup = formData.purchasePrice > 0
      ? Number((((validPrice - formData.purchasePrice) / formData.purchasePrice) * 100).toFixed(2))
      : formMarkupPercent;
    setFormMarkupPercent(newMarkup);
    setFormData(prev => ({
      ...prev,
      sellingPrice: validPrice,
      markupPercentage: newMarkup,
    }));
  };

  const handleImportAllNhis = () => {
    if (!window.confirm('Import all Ghana NHIS Standard Medicine Price List medications and categories into your formulary?')) {
      return;
    }

    // 1. Ensure all categories exist
    nhisCategories.forEach(cat => {
      if (!categories.some(c => c.id === cat.id || c.name.toLowerCase() === cat.name.toLowerCase())) {
        addCategory(cat.name, cat.description);
      }
    });

    // 2. Add all NHIS medicines that aren't already present
    let addedCount = 0;
    nhisGhanaMedicines.forEach(med => {
      const exists = medicines.some(m => m.code === med.code || m.name.toLowerCase() === med.name.toLowerCase());
      if (!exists) {
        addMedicine({
          ...med,
        });
        addedCount++;
      }
    });

    // 3. Add initial batches
    nhisInitialBatches.forEach(b => {
      const exists = batches.some(bat => bat.id === b.id || bat.batchNumber === b.batchNumber);
      if (!exists) {
        addBatch({
          medicineId: b.medicineId,
          batchNumber: b.batchNumber,
          supplierId: b.supplierId,
          supplierName: b.supplierName,
          manufacturingDate: b.manufacturingDate,
          expiryDate: b.expiryDate,
          quantityReceived: b.quantityReceived,
          remainingQuantity: b.remainingQuantity,
          purchasePrice: b.purchasePrice,
          sellingPrice: b.sellingPrice,
        });
      }
    });

    setNhisImportSuccess(`Successfully synchronized ${addedCount > 0 ? addedCount : 'all'} NHIS Ghana medicines into the formulary!`);
    setTimeout(() => setNhisImportSuccess(null), 6000);
  };

  const handleSubmitMedicine = (e: React.FormEvent) => {
    e.preventDefault();
    const cat = categories.find(c => c.id === formData.categoryId);
    const resolvedCatName = cat ? cat.name : 'General';

    if (editingMedicine) {
      updateMedicine(editingMedicine.id, {
        ...formData,
        categoryName: resolvedCatName,
      });
    } else {
      addMedicine({
        ...formData,
        categoryName: resolvedCatName,
      });
    }
    setIsAddModalOpen(false);
  };

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatName('');
    setCatDesc('');
    setIsAddCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (category: Category) => {
    setEditingCategory(category);
    setCatName(category.name);
    setCatDesc(category.description || '');
    setIsAddCategoryModalOpen(true);
  };

  const handleSaveCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;

    if (editingCategory) {
      updateCategory(editingCategory.id, catName.trim(), catDesc.trim());
    } else {
      addCategory(catName.trim(), catDesc.trim());
    }

    setCatName('');
    setCatDesc('');
    setEditingCategory(null);
    setIsAddCategoryModalOpen(false);
  };

  // Filtered List
  const filteredMedicines = useMemo(() => {
    return medicines.filter(m => {
      const matchCat = selectedCategory === 'all' || m.categoryId === selectedCategory;
      const matchStatus = statusFilter === 'all' || m.status === statusFilter;
      const matchRx = rxFilter === 'all' || (rxFilter === 'rx' ? m.requiresPrescription : !m.requiresPrescription);
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        m.name.toLowerCase().includes(term) ||
        m.genericName.toLowerCase().includes(term) ||
        (m.brandName && m.brandName.toLowerCase().includes(term)) ||
        m.code.toLowerCase().includes(term) ||
        (m.barcode && m.barcode.includes(term));
      return matchCat && matchStatus && matchRx && matchSearch;
    });
  }, [medicines, selectedCategory, statusFilter, rxFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header & Sub-Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Medicine & Formulary Registry</h2>
          <p className="text-xs text-slate-500 mt-1">
            Maintain authorized pharmaceuticals, therapeutic classifications, and batch inventory.
          </p>
        </div>

        {canManageMedicine && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleImportAllNhis}
              className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
              title="Add all medicines from the official Ghana National Health Insurance Scheme (NHIS) price list"
            >
              <Sparkles className="w-4 h-4 mr-1.5 text-indigo-600" />
              Import All NHIS Ghana Medicines
            </button>

            <button
              type="button"
              onClick={() => setIsBulkUploadModalOpen(true)}
              className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 mr-1.5 text-emerald-600" />
              Bulk Upload (.xlsx)
            </button>

            {canEditCategory && (
              <button
                type="button"
                onClick={handleOpenAddCategory}
                className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
              >
                <FolderPlus className="w-4 h-4 mr-1.5 text-indigo-600" />
                + Category
              </button>
            )}

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Register Medicine
            </button>
          </div>
        )}
      </div>

      {nhisImportSuccess && (
        <div className="flex items-center justify-between p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-5 h-5 text-emerald-600" />
            <span>{nhisImportSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setNhisImportSuccess(null)}
            className="text-emerald-700 hover:text-emerald-900 font-bold"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Sub Tabs: Catalog vs All Batches vs Categories */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('medicines')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'medicines'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Formulary Catalog ({medicines.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('batches')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'batches'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          All Active Batches ({batches.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab('categories')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all ${
            activeSubTab === 'categories'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Categories ({categories.length})
        </button>
      </div>

      {/* VIEW 1: FORMULARY CATALOG */}
      {activeSubTab === 'medicines' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search catalog..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">All Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>

            <select
              value={rxFilter}
              onChange={(e) => setRxFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">All Prescription Types</option>
              <option value="rx">Rx Only (Prescription Required)</option>
              <option value="otc">OTC (Over the Counter)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active Formulary</option>
              <option value="inactive">Inactive</option>
              <option value="discontinued">Discontinued</option>
            </select>
          </div>

          {/* Medicines Table */}
          <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3.5 px-4 font-semibold">Code / Barcode</th>
                    <th className="py-3.5 px-4 font-semibold">Medication & Generic</th>
                    <th className="py-3.5 px-4 font-semibold">Category</th>
                    <th className="py-3.5 px-4 font-semibold">Form, Route & Dose</th>
                    {canViewCost && <th className="py-3.5 px-4 font-semibold text-right">Cost</th>}
                    <th className="py-3.5 px-4 font-semibold text-right">Selling Price</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Stock Level</th>
                    <th className="py-3.5 px-4 font-semibold text-center">Rx Req.</th>
                    <th className="py-3.5 px-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {filteredMedicines.map((med) => {
                    const totalStock = getMedicineTotalStock(med.id);
                    const isLow = totalStock <= med.minimumStockLevel;
                    const isOut = totalStock <= 0;

                    return (
                      <tr key={med.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-indigo-600">
                          <div>{med.code}</div>
                          {med.barcode && <span className="text-[10px] text-slate-400 font-normal">{med.barcode}</span>}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-1.5">
                            <span className="font-bold text-slate-900">{med.name}</span>
                            {med.nhisCovered && (
                              <span
                                className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300"
                                title={`NHIS Ghana Covered • Level ${med.nhisLevel || 'M'} • Tariff: ${settings.currencySymbol}${med.nhisTariffPrice || 0}`}
                              >
                                NHIS L-{med.nhisLevel || 'M'}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 italic flex items-center space-x-2">
                            <span>{med.genericName}</span>
                            {med.nhisCode && (
                              <span className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1 rounded">
                                {med.nhisCode}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                            {med.categoryName}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800">{med.form} • {med.dosage}</div>
                          <div className="text-[10px] font-semibold text-indigo-600">{med.routeOfAdministration || 'Oral'}</div>
                        </td>
                        {canViewCost && (
                          <td className="py-3.5 px-4 text-right font-medium text-slate-600">
                            {settings.currencySymbol}{safeFixed(med.purchasePrice)}
                          </td>
                        )}
                        <td className="py-3.5 px-4 text-right">
                          <div className="font-bold text-slate-900">
                            {settings.currencySymbol}{safeFixed(med.sellingPrice)}
                          </div>
                          {Number(med.purchasePrice) > 0 && Number(med.sellingPrice) > Number(med.purchasePrice) && (
                            <div className="text-[10px] text-emerald-600 font-semibold">
                              +{safeFixed(((Number(med.sellingPrice) - Number(med.purchasePrice)) / Number(med.purchasePrice)) * 100, 1)}%
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full font-bold text-[11px] ${
                              isOut
                                ? 'bg-rose-100 text-rose-700'
                                : isLow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {totalStock} units
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          {med.requiresPrescription ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded-md">
                              Rx Only
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-600 rounded-md">
                              OTC
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end space-x-1.5">
                            <button
                              type="button"
                              onClick={() => setSelectedMedForBatches(med)}
                              className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="View Batches"
                            >
                              <Boxes className="w-4 h-4" />
                            </button>
                            {canManageMedicine && (
                              <button
                                type="button"
                                onClick={() => handleOpenEditModal(med)}
                                className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                                title="Edit"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                            )}
                            {currentUser.role === 'admin' && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Are you sure you want to delete ${med.name}?`)) {
                                    deleteMedicine(med.id);
                                  }
                                }}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                title="Delete"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: ALL BATCHES VIEW */}
      {activeSubTab === 'batches' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Active Pharmaceutical Batches (FEFO Tracking)</h3>
              <p className="text-xs text-slate-500">Batches sorted by expiration date to uphold First-Expired-First-Out dispensing standards.</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Batch #</th>
                  <th className="py-3.5 px-4 font-semibold">Medication</th>
                  <th className="py-3.5 px-4 font-semibold">Supplier</th>
                  <th className="py-3.5 px-4 font-semibold">Mfg Date</th>
                  <th className="py-3.5 px-4 font-semibold">Expiry Date</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Received</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Remaining</th>
                  <th className="py-3.5 px-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {batches
                  .slice()
                  .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime())
                  .map((b) => {
                    const med = medicines.find(m => m.id === b.medicineId);
                    const now = new Date();
                    const exp = new Date(b.expiryDate);
                    const isExpired = exp <= now;
                    const diffDays = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                    const isNearExpiry = !isExpired && diffDays <= (settings.nearExpiryThresholdDays || 60);

                    return (
                      <tr key={b.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-indigo-700">{b.batchNumber}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900">{med ? med.name : 'Unknown'}</td>
                        <td className="py-3.5 px-4 text-slate-600">{b.supplierName}</td>
                        <td className="py-3.5 px-4 text-slate-500">{b.manufacturingDate}</td>
                        <td className="py-3.5 px-4 font-medium">{b.expiryDate}</td>
                        <td className="py-3.5 px-4 text-right">{b.quantityReceived}</td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900">{b.remainingQuantity}</td>
                        <td className="py-3.5 px-4 text-center">
                          {isExpired ? (
                            <span className="px-2 py-0.5 bg-rose-100 text-rose-800 text-[10px] font-bold rounded-md">
                              EXPIRED
                            </span>
                          ) : isNearExpiry ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md">
                              {diffDays}d Left
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-semibold rounded-md">
                              Healthy
                            </span>
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

      {/* VIEW 3: CATEGORIES MANAGER */}
      {activeSubTab === 'categories' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Therapeutic Drug Classifications</h3>
              <p className="text-xs text-slate-500">
                {canEditCategory
                  ? 'Storekeepers and System Admins can add, rename, and edit categories.'
                  : 'Viewing established formulary categories.'}
              </p>
            </div>
            {canEditCategory && (
              <button
                type="button"
                onClick={handleOpenAddCategory}
                className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Category
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((cat) => {
              const count = medicines.filter(m => m.categoryId === cat.id).length;
              return (
                <div key={cat.id} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-bold text-slate-900">{cat.name}</h4>
                      <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-md">
                        {count} Drugs
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">{cat.description || 'No description provided.'}</p>
                  </div>

                  {canEditCategory && (
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-end space-x-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditCategory(cat)}
                        className="inline-flex items-center px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5 mr-1" />
                        Edit Category
                      </button>
                      {currentUser.role === 'admin' && count === 0 && (
                        <button
                          type="button"
                          onClick={() => {
                            if (window.confirm(`Are you sure you want to delete category "${cat.name}"?`)) {
                              deleteCategory(cat.id);
                            }
                          }}
                          className="inline-flex items-center px-2 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Register / Edit Medicine Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <h3 className="text-base font-bold text-slate-900">
                {editingMedicine ? `Edit Medicine: ${editingMedicine.name}` : 'Register New Medicine Formulation'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitMedicine} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Medicine Code *</label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Barcode (EAN/UPC)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-mono focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Commercial / Trade Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxicillin Capsules 500mg"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Generic Name / Molecule *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Amoxicillin Trihydrate"
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Brand Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Amoxil"
                    value={formData.brandName}
                    onChange={(e) => setFormData({ ...formData, brandName: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage Form *</label>
                  <select
                    value={formData.form}
                    onChange={(e) => setFormData({ ...formData, form: e.target.value as DosageForm })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {[
                      'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Inhaler', 
                      'Eye/Ear Drops', 'Ointment/Cream', 'Suppository', 'Powder/Sachet', 'Gel', 'Solution'
                    ].map(form => (
                      <option key={form} value={form}>{form}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Route of Administration *</label>
                  <select
                    value={formData.routeOfAdministration}
                    onChange={(e) => setFormData({ ...formData, routeOfAdministration: e.target.value as RouteOfAdministration })}
                    className="w-full px-3 py-2 text-xs bg-indigo-50/60 border border-indigo-200 text-indigo-950 font-medium rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {ROUTE_OPTIONS.map(route => (
                      <option key={route} value={route}>{route}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage / Strength *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 500mg or 100mcg/dose"
                    value={formData.dosage}
                    onChange={(e) => setFormData({ ...formData, dosage: e.target.value, strength: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Packaging Unit</label>
                  <input
                    type="text"
                    placeholder="e.g. Box of 30, Bottle of 100ml"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Purchase Cost ({settings.currencySymbol}) *</label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={formData.purchasePrice || ''}
                      onChange={(e) => handlePurchasePriceChange(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                    />
                  </div>
                </div>

                {/* Percentage Markup and Selling Price calculation */}
                <div className="sm:col-span-2 p-3 bg-gradient-to-r from-indigo-50/70 to-emerald-50/70 border border-indigo-100 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1.5 text-xs font-bold text-indigo-950">
                      <Calculator className="w-4 h-4 text-indigo-600" />
                      <span>Selling Price Markup Calculator (%)</span>
                    </div>
                    <div className="text-[11px] font-bold text-slate-700">
                      Margin: <span className="text-emerald-700">{settings.currencySymbol}{safeFixed(Math.max(0, formData.sellingPrice - formData.purchasePrice))}</span>
                      <span className="text-slate-400 font-normal"> / unit</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Markup Percentage (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.1"
                          min="0"
                          value={formMarkupPercent}
                          onChange={(e) => handleMarkupPercentChange(parseFloat(e.target.value) || 0)}
                          className="w-full pl-3 pr-7 py-2 text-xs bg-white border border-indigo-200 rounded-xl focus:ring-2 focus:ring-indigo-500 font-bold text-indigo-900"
                        />
                        <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400 pointer-events-none" />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Calculated Retail Price ({settings.currencySymbol}) *</label>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={formData.sellingPrice || ''}
                        onChange={(e) => handleSellingPriceChange(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 text-xs bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500 font-bold text-emerald-900"
                      />
                    </div>
                  </div>

                  {/* Preset Markup Quick Buttons */}
                  <div>
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">Quick Markup Presets:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {MARKUP_PRESETS.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => handleMarkupPercentChange(preset)}
                          className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                            Math.abs(formMarkupPercent - preset) < 0.01
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-white border border-slate-200 text-slate-700 hover:bg-indigo-50 hover:text-indigo-600'
                          }`}
                        >
                          +{preset}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* NHIS Ghana Pricing & Level section */}
                <div className="sm:col-span-2 p-3 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="nhisCovered"
                        checked={formData.nhisCovered}
                        onChange={(e) => setFormData({ ...formData, nhisCovered: e.target.checked })}
                        className="w-4 h-4 text-emerald-600 rounded-sm focus:ring-emerald-500 cursor-pointer"
                      />
                      <label htmlFor="nhisCovered" className="text-xs font-bold text-slate-900 cursor-pointer flex items-center space-x-1.5">
                        <Building2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Covered under Ghana National Health Insurance Scheme (NHIS)</span>
                      </label>
                    </div>
                  </div>

                  {formData.nhisCovered && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 animate-fadeIn">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">NHIS GML Code</label>
                        <input
                          type="text"
                          placeholder="e.g. GML-ACT-001"
                          value={formData.nhisCode}
                          onChange={(e) => setFormData({ ...formData, nhisCode: e.target.value })}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-mono"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">Level of Care</label>
                        <select
                          value={formData.nhisLevel}
                          onChange={(e) => setFormData({ ...formData, nhisLevel: e.target.value as any })}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                        >
                          <option value="M">Level M (Primary/CHPS/Maternity)</option>
                          <option value="B">Level B (Health Centre/District)</option>
                          <option value="C">Level C (Regional Hospital)</option>
                          <option value="D">Level D (Tertiary/Teaching Hospital)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">NHIS Tariff Reimbursement ({settings.currencySymbol})</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          value={formData.nhisTariffPrice || ''}
                          onChange={(e) => setFormData({ ...formData, nhisTariffPrice: parseFloat(e.target.value) || 0 })}
                          className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 font-medium"
                        />
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Min Reorder Stock Threshold</label>
                  <input
                    type="number"
                    min="1"
                    value={formData.minimumStockLevel}
                    onChange={(e) => setFormData({ ...formData, minimumStockLevel: parseInt(e.target.value) || 10 })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div className="flex items-center space-x-2 pt-6">
                  <input
                    type="checkbox"
                    id="reqRx"
                    checked={formData.requiresPrescription}
                    onChange={(e) => setFormData({ ...formData, requiresPrescription: e.target.checked })}
                    className="w-4 h-4 text-indigo-600 rounded-sm focus:ring-indigo-500"
                  />
                  <label htmlFor="reqRx" className="text-xs font-semibold text-slate-800 cursor-pointer">
                    Requires Doctor Prescription (Rx Only)
                  </label>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Description & Clinical Indications</label>
                  <textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  {editingMedicine ? 'Update Medicine' : 'Save Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingCategory ? `Edit Category: ${editingCategory.name}` : 'Add Therapeutic Category'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddCategoryModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveCategorySubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Category Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anticonvulsants / Neuro"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Brief description of therapeutic drug class"
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                >
                  {editingCategory ? 'Update Category' : 'Create Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Batches Inspection Modal */}
      {selectedMedForBatches && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Batches for {selectedMedForBatches.name}</h3>
                <p className="text-xs text-slate-500">{selectedMedForBatches.genericName} • {selectedMedForBatches.code}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedMedForBatches(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-80 overflow-y-auto">
              {getMedicineBatches(selectedMedForBatches.id, false).map((b) => (
                <div key={b.id} className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50 flex justify-between items-center text-xs">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-indigo-700">{b.batchNumber}</span>
                      <span className="text-slate-400">•</span>
                      <span className="text-slate-600">Supplier: {b.supplierName}</span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-1">
                      Mfg: {b.manufacturingDate} • Expiry: <strong>{b.expiryDate}</strong>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-slate-900 text-sm">{b.remainingQuantity} units</div>
                    <div className="text-[10px] text-slate-500">Recv: {b.quantityReceived}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* Bulk Upload Modal */}
      {isBulkUploadModalOpen && (
        <BulkUploadMedicinesModal
          isOpen={isBulkUploadModalOpen}
          onClose={() => setIsBulkUploadModalOpen(false)}
        />
      )}
    </div>
  );
};
