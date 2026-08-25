import React, { useState, useRef } from 'react';
import * as XLSX from 'xlsx';
import { usePharmacy } from '../../context/PharmacyContext';
import { DosageForm, RouteOfAdministration } from '../../types';
import {
  Upload,
  FileSpreadsheet,
  Download,
  AlertCircle,
  CheckCircle2,
  X,
  FileText,
  AlertTriangle,
  RefreshCw,
  Layers,
  ChevronRight,
  Database
} from 'lucide-react';
import { safeFixed } from '../../utils/formatters';

interface BulkUploadMedicinesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface ParsedMedicineRow {
  rowIndex: number;
  code: string;
  name: string;
  genericName: string;
  brandName?: string;
  categoryName: string;
  dosage: string;
  form: DosageForm;
  routeOfAdministration: RouteOfAdministration | string;
  strength: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  minimumStockLevel: number;
  requiresPrescription: boolean;
  barcode?: string;
  description?: string;
  initialBatchNumber?: string;
  initialBatchExpiry?: string;
  initialBatchQuantity?: number;
  isValid: boolean;
  errors: string[];
}

export const BulkUploadMedicinesModal: React.FC<BulkUploadMedicinesModalProps> = ({
  isOpen,
  onClose,
}) => {
  const {
    categories,
    addCategory,
    addMedicine,
    addBatch,
    suppliers,
    settings,
  } = usePharmacy();

  const [dragActive, setDragActive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [parsedRows, setParsedRows] = useState<ParsedMedicineRow[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [importSummary, setImportSummary] = useState<{
    total: number;
    medicinesAdded: number;
    categoriesCreated: number;
    batchesAdded: number;
  } | null>(null);
  const [autoCreateCategories, setAutoCreateCategories] = useState(true);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Download Sample Excel Template
  const handleDownloadTemplate = () => {
    const templateData = [
      {
        'Medicine Code': 'MED-1001',
        'Medicine Name': 'Amoxicillin Trihydrate Capsules 500mg',
        'Generic Name': 'Amoxicillin',
        'Brand Name': 'Amoxil',
        'Category': 'Antibiotics',
        'Dosage Form': 'Capsule',
        'Route of Administration': 'Oral',
        'Dosage / Strength': '500mg',
        'Packaging Unit': 'Box of 20 (2x10 Blisters)',
        'Purchase Price': 4.50,
        'Selling Price': 8.00,
        'Min Stock Level': 20,
        'Requires Prescription (Yes/No)': 'Yes',
        'Barcode / EAN': '8901234567890',
        'Description': 'Broad-spectrum beta-lactam antibiotic for bacterial infections.',
        'Initial Batch # (Optional)': 'BATCH-AMX-001',
        'Batch Expiry Date (YYYY-MM-DD)': '2027-12-31',
        'Initial Batch Quantity': 100,
      },
      {
        'Medicine Code': 'MED-1002',
        'Medicine Name': 'Paracetamol 500mg Tablets',
        'Generic Name': 'Acetaminophen / Paracetamol',
        'Brand Name': 'Panadol',
        'Category': 'Analgesics & Antipyretics',
        'Dosage Form': 'Tablet',
        'Route of Administration': 'Oral',
        'Dosage / Strength': '500mg',
        'Packaging Unit': 'Box of 100',
        'Purchase Price': 1.20,
        'Selling Price': 3.50,
        'Min Stock Level': 50,
        'Requires Prescription (Yes/No)': 'No',
        'Barcode / EAN': '8901234567891',
        'Description': 'Analgesic and antipyretic for mild-to-moderate pain and fever reduction.',
        'Initial Batch # (Optional)': 'BATCH-PCM-002',
        'Batch Expiry Date (YYYY-MM-DD)': '2028-06-30',
        'Initial Batch Quantity': 250,
      },
      {
        'Medicine Code': 'MED-1003',
        'Medicine Name': 'Salbutamol Inhaler 100mcg',
        'Generic Name': 'Albuterol / Salbutamol',
        'Brand Name': 'Ventolin',
        'Category': 'Respiratory & Anti-Asthma',
        'Dosage Form': 'Inhaler',
        'Route of Administration': 'Inhalation',
        'Dosage / Strength': '100mcg/puff (200 doses)',
        'Packaging Unit': 'Canister of 200 actuations',
        'Purchase Price': 6.00,
        'Selling Price': 12.50,
        'Min Stock Level': 15,
        'Requires Prescription (Yes/No)': 'Yes',
        'Barcode / EAN': '8901234567892',
        'Description': 'Short-acting beta2-adrenergic agonist bronchodilator for acute asthma relief.',
        'Initial Batch # (Optional)': 'BATCH-SLB-003',
        'Batch Expiry Date (YYYY-MM-DD)': '2027-09-30',
        'Initial Batch Quantity': 40,
      },
      {
        'Medicine Code': 'MED-1004',
        'Medicine Name': 'Ceftriaxone Sodium 1g Powder for Injection',
        'Generic Name': 'Ceftriaxone Sodium',
        'Brand Name': 'Rocephin',
        'Category': 'Antibiotics',
        'Dosage Form': 'Injection',
        'Route of Administration': 'Intravenous (IV)',
        'Dosage / Strength': '1g / vial',
        'Packaging Unit': 'Vial with Solvent 10ml',
        'Purchase Price': 7.50,
        'Selling Price': 15.00,
        'Min Stock Level': 20,
        'Requires Prescription (Yes/No)': 'Yes',
        'Barcode / EAN': '8901234567893',
        'Description': 'Third-generation cephalosporin for severe bacterial infections.',
        'Initial Batch # (Optional)': 'BATCH-CFT-004',
        'Batch Expiry Date (YYYY-MM-DD)': '2027-05-31',
        'Initial Batch Quantity': 60,
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(templateData);
    // Set column widths for readability
    worksheet['!cols'] = [
      { wch: 14 }, // Code
      { wch: 36 }, // Name
      { wch: 28 }, // Generic
      { wch: 18 }, // Brand
      { wch: 24 }, // Category
      { wch: 16 }, // Form
      { wch: 22 }, // Route
      { wch: 20 }, // Dosage
      { wch: 26 }, // Unit
      { wch: 14 }, // Purchase Price
      { wch: 14 }, // Selling Price
      { wch: 14 }, // Min Stock
      { wch: 26 }, // Prescription
      { wch: 18 }, // Barcode
      { wch: 40 }, // Description
      { wch: 24 }, // Batch #
      { wch: 28 }, // Expiry Date
      { wch: 20 }, // Batch Qty
    ];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Medicines');
    XLSX.writeFile(workbook, 'PharmaCare_Medicine_Bulk_Upload_Template.xlsx');
  };

  // Helper to normalize field extraction
  const getFieldValue = (row: Record<string, any>, ...keys: string[]): any => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
        return row[key];
      }
    }
    // Also check case-insensitive match
    const rowKeys = Object.keys(row);
    for (const key of keys) {
      const match = rowKeys.find(k => k.toLowerCase().replace(/[^a-z0-9]/g, '') === key.toLowerCase().replace(/[^a-z0-9]/g, ''));
      if (match && row[match] !== undefined && row[match] !== null && String(row[match]).trim() !== '') {
        return row[match];
      }
    }
    return '';
  };

  const processFile = (file: File) => {
    setFileName(file.name);
    setImportSummary(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        const rawJson: Record<string, any>[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (!rawJson || rawJson.length === 0) {
          alert('The uploaded Excel sheet contains no data rows.');
          return;
        }

        const validDosageForms: DosageForm[] = [
          'Tablet', 'Capsule', 'Syrup', 'Suspension', 'Injection', 'Inhaler',
          'Eye/Ear Drops', 'Ointment/Cream', 'Suppository', 'Powder/Sachet', 'Gel', 'Solution'
        ];

        const validRoutes: RouteOfAdministration[] = [
          'Oral', 'Intravenous (IV)', 'Intramuscular (IM)', 'Subcutaneous (SC)',
          'Topical', 'Inhalation', 'Ophthalmic (Eye)', 'Otic (Ear)', 'Nasal',
          'Sublingual / Buccal', 'Rectal', 'Transdermal', 'Vaginal', 'Intradermal', 'Other'
        ];

        const parsed: ParsedMedicineRow[] = rawJson.map((row, index) => {
          const errors: string[] = [];

          const name = String(getFieldValue(row, 'Medicine Name', 'Name', 'Item Name', 'Drug Name')).trim();
          if (!name) errors.push('Medicine Name is required');

          const genericName = String(getFieldValue(row, 'Generic Name', 'Generic', 'Molecule', 'Active Ingredient')).trim() || name;
          const code = String(getFieldValue(row, 'Medicine Code', 'Code', 'Item Code', 'SKU')).trim() || `MED-${Date.now().toString().slice(-4)}-${index + 1}`;
          const brandName = String(getFieldValue(row, 'Brand Name', 'Brand', 'Trade Name')).trim();
          const categoryName = String(getFieldValue(row, 'Category', 'Category Name', 'Classification', 'Therapeutic Group')).trim() || 'General Pharmaceuticals';

          // Form
          let form: DosageForm = 'Tablet';
          const rawForm = String(getFieldValue(row, 'Dosage Form', 'Form', 'Type')).trim();
          const matchedForm = validDosageForms.find(f => f.toLowerCase() === rawForm.toLowerCase());
          if (matchedForm) {
            form = matchedForm;
          } else if (rawForm) {
            form = 'Tablet';
          }

          // Route of Administration
          let route: RouteOfAdministration = 'Oral';
          const rawRoute = String(getFieldValue(row, 'Route of Administration', 'Route', 'Administration Route')).trim();
          const matchedRoute = validRoutes.find(r => r.toLowerCase().includes(rawRoute.toLowerCase()) || rawRoute.toLowerCase().includes(r.toLowerCase()));
          if (matchedRoute) {
            route = matchedRoute;
          } else if (rawRoute) {
            route = rawRoute as RouteOfAdministration;
          } else {
            // Infer from form
            if (form === 'Injection') route = 'Intravenous (IV)';
            else if (form === 'Inhaler') route = 'Inhalation';
            else if (form === 'Eye/Ear Drops') route = 'Ophthalmic (Eye)';
            else if (form === 'Ointment/Cream' || form === 'Gel') route = 'Topical';
            else if (form === 'Suppository') route = 'Rectal';
            else route = 'Oral';
          }

          const dosage = String(getFieldValue(row, 'Dosage / Strength', 'Dosage', 'Strength', 'Dose')).trim() || 'Standard';
          const strength = dosage;
          const unit = String(getFieldValue(row, 'Packaging Unit', 'Unit', 'Package', 'Pack Size')).trim() || 'Box of 20';

          const purchasePrice = parseFloat(getFieldValue(row, 'Purchase Price', 'Cost Price', 'Cost', 'Buy Price')) || 0;
          const sellingPrice = parseFloat(getFieldValue(row, 'Selling Price', 'Price', 'Retail Price', 'MRP')) || 0;

          if (sellingPrice < 0) errors.push('Selling price cannot be negative');

          const minimumStockLevel = parseInt(getFieldValue(row, 'Min Stock Level', 'Minimum Stock', 'Reorder Level', 'Min Stock')) || 20;

          const rxRaw = String(getFieldValue(row, 'Requires Prescription (Yes/No)', 'Requires Prescription', 'Prescription Required', 'Rx', 'Rx Only')).toLowerCase();
          const requiresPrescription = rxRaw === 'yes' || rxRaw === 'true' || rxRaw === '1' || rxRaw === 'rx';

          const barcode = String(getFieldValue(row, 'Barcode / EAN', 'Barcode', 'UPC', 'EAN')).trim() || `${Math.floor(100000000000 + Math.random() * 900000000000)}`;
          const description = String(getFieldValue(row, 'Description', 'Clinical Notes', 'Indications')).trim();

          const initialBatchNumber = String(getFieldValue(row, 'Initial Batch # (Optional)', 'Batch Number', 'Batch #', 'Lot Number')).trim();
          const initialBatchExpiry = String(getFieldValue(row, 'Batch Expiry Date (YYYY-MM-DD)', 'Expiry Date', 'Expiration Date', 'Expiry')).trim();
          const initialBatchQuantity = parseInt(getFieldValue(row, 'Initial Batch Quantity', 'Quantity', 'Stock Qty', 'Initial Qty')) || 0;

          return {
            rowIndex: index + 2,
            code,
            name,
            genericName,
            brandName,
            categoryName,
            dosage,
            form,
            routeOfAdministration: route,
            strength,
            unit,
            purchasePrice,
            sellingPrice,
            minimumStockLevel,
            requiresPrescription,
            barcode,
            description,
            initialBatchNumber,
            initialBatchExpiry,
            initialBatchQuantity,
            isValid: errors.length === 0,
            errors,
          };
        });

        setParsedRows(parsed);
      } catch (err) {
        console.error('Error reading excel sheet:', err);
        alert('Failed to parse the file. Please ensure it is a valid .xlsx, .xls or .csv spreadsheet.');
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleFileDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  // Perform Bulk Import
  const handleCommitImport = async () => {
    if (parsedRows.length === 0) return;
    setIsProcessing(true);

    try {
      let categoriesCreatedCount = 0;
      let medicinesAddedCount = 0;
      let batchesAddedCount = 0;

      // Existing categories cache
      const categoryMap = new Map<string, string>();
      categories.forEach(c => categoryMap.set(c.name.toLowerCase().trim(), c.id));

      // First, handle category creations if needed
      for (const row of parsedRows) {
        if (!row.isValid) continue;

        const normalizedCat = row.categoryName.toLowerCase().trim();
        if (!categoryMap.has(normalizedCat) && autoCreateCategories) {
          const newCatId = `cat-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          addCategory(row.categoryName, `Auto-created during Excel bulk import`);
          categoryMap.set(normalizedCat, newCatId);
          categoriesCreatedCount++;
        }
      }

      // Add medicines and batches
      for (const row of parsedRows) {
        if (!row.isValid) continue;

        const normalizedCat = row.categoryName.toLowerCase().trim();
        const categoryId = categoryMap.get(normalizedCat) || categories[0]?.id || 'cat-gen';

        const newMedId = addMedicine({
          code: row.code,
          name: row.name,
          genericName: row.genericName,
          brandName: row.brandName,
          categoryId,
          categoryName: row.categoryName,
          dosage: row.dosage,
          form: row.form,
          routeOfAdministration: row.routeOfAdministration,
          strength: row.strength,
          unit: row.unit,
          purchasePrice: row.purchasePrice,
          sellingPrice: row.sellingPrice,
          minimumStockLevel: row.minimumStockLevel,
          requiresPrescription: row.requiresPrescription,
          description: row.description,
          barcode: row.barcode,
          status: 'active',
        });

        medicinesAddedCount++;

        // Add batch if specified
        if (row.initialBatchNumber && row.initialBatchQuantity && row.initialBatchQuantity > 0) {
          const sup = suppliers[0];
          addBatch({
            medicineId: newMedId,
            batchNumber: row.initialBatchNumber,
            supplierId: sup ? sup.id : 'sup-bulk',
            supplierName: sup ? sup.name : 'Bulk Stock Inbound',
            manufacturingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            expiryDate: row.initialBatchExpiry || new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            quantityReceived: row.initialBatchQuantity,
            remainingQuantity: row.initialBatchQuantity,
            purchasePrice: row.purchasePrice,
            sellingPrice: row.sellingPrice,
          });
          batchesAddedCount++;
        }
      }

      setImportSummary({
        total: parsedRows.length,
        medicinesAdded: medicinesAddedCount,
        categoriesCreated: categoriesCreatedCount,
        batchesAdded: batchesAddedCount,
      });
    } catch (err) {
      console.error('Error importing medicines:', err);
      alert('An error occurred while importing some rows. Please check logs.');
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedRows.filter(r => r.isValid).length;
  const invalidCount = parsedRows.filter(r => !r.isValid).length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Bulk Upload Medicines via Excel Sheet
              </h3>
              <p className="text-xs text-slate-500">
                Upload .xlsx, .xls, or .csv files to batch register pharmaceuticals, routes, and initial batches.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleDownloadTemplate}
              className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download Excel Template
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Success summary view */}
          {importSummary ? (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-6 text-center space-y-4">
              <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-base font-bold text-slate-900">Bulk Upload Successful!</h4>
                <p className="text-xs text-slate-600 mt-1">
                  Successfully imported {importSummary.medicinesAdded} medicines into your live formulary catalog.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3 max-w-lg mx-auto text-left">
                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Medicines Created</span>
                  <p className="text-lg font-bold text-emerald-600">{importSummary.medicinesAdded}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Categories Linked</span>
                  <p className="text-lg font-bold text-indigo-600">{importSummary.categoriesCreated}</p>
                </div>
                <div className="bg-white p-3 rounded-xl border border-emerald-100">
                  <span className="text-[10px] uppercase font-bold text-slate-400">Batches Seeded</span>
                  <p className="text-lg font-bold text-slate-800">{importSummary.batchesAdded}</p>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-6 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors"
                >
                  Return to Formulary
                </button>
              </div>
            </div>
          ) : parsedRows.length === 0 ? (
            /* Upload Drop Area */
            <div className="space-y-4">
              <div
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDrop={handleFileDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-3xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center space-y-3 ${
                  dragActive
                    ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]'
                    : 'border-slate-300 hover:border-emerald-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-xs">
                  <Upload className="w-7 h-7" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Click to select or drag and drop your Excel spreadsheet
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Supports Microsoft Excel (.xlsx, .xls) and Comma-Separated Values (.csv)
                  </p>
                </div>
                <span className="inline-flex items-center px-3 py-1 bg-white text-xs font-semibold text-slate-700 border border-slate-200 rounded-lg shadow-2xs">
                  Browse Files
                </span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Informative Guidance Card */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2">
                <div className="flex items-center space-x-2 text-xs font-bold text-slate-800">
                  <Layers className="w-4 h-4 text-emerald-600" />
                  <span>Excel Formatting & Auto-Detection Guidelines</span>
                </div>
                <ul className="text-xs text-slate-600 space-y-1 list-disc pl-5">
                  <li>
                    <strong>Required Columns:</strong> Medicine Name, Generic Name, Category, Dosage / Strength, Dosage Form, Route of Administration, Purchase Price, Selling Price.
                  </li>
                  <li>
                    <strong>Route of Administration:</strong> Accepts standard WHO routes like <code>Oral</code>, <code>Intravenous (IV)</code>, <code>Topical</code>, <code>Inhalation</code>, <code>Ophthalmic</code>, etc.
                  </li>
                  <li>
                    <strong>Automatic Category Mapping:</strong> Any new medicine category present in the sheet will be automatically created and indexed in the catalog.
                  </li>
                  <li>
                    <strong>Optional Initial Batch Seed:</strong> If you supply Batch #, Expiry Date (YYYY-MM-DD), and Initial Quantity, it will automatically register stock into FEFO inventory.
                  </li>
                </ul>
              </div>
            </div>
          ) : (
            /* Parsed Data Preview Table */
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="flex items-center space-x-3 text-xs">
                  <span className="font-bold text-slate-800">File: {fileName}</span>
                  <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-semibold rounded-md text-[11px]">
                    {validCount} Ready to Import
                  </span>
                  {invalidCount > 0 && (
                    <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-semibold rounded-md text-[11px]">
                      {invalidCount} Invalid Rows
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-3 text-xs">
                  <label className="flex items-center space-x-1.5 text-slate-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={autoCreateCategories}
                      onChange={(e) => setAutoCreateCategories(e.target.checked)}
                      className="rounded-sm text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Auto-create missing categories</span>
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      setParsedRows([]);
                      setFileName(null);
                    }}
                    className="text-xs font-semibold text-slate-500 hover:text-slate-700"
                  >
                    Upload Different File
                  </button>
                </div>
              </div>

              {/* Table Preview */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-80 overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">#</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">Medicine Name</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3">Form & Route</th>
                      <th className="py-2.5 px-3 text-right">Cost ({settings.currencySymbol})</th>
                      <th className="py-2.5 px-3 text-right">Price ({settings.currencySymbol})</th>
                      <th className="py-2.5 px-3 text-center">Rx</th>
                      <th className="py-2.5 px-3">Initial Batch</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {parsedRows.map((r, i) => (
                      <tr
                        key={i}
                        className={`hover:bg-slate-50 ${
                          !r.isValid ? 'bg-rose-50/50' : ''
                        }`}
                      >
                        <td className="py-2.5 px-3 font-mono text-slate-400">{r.rowIndex}</td>
                        <td className="py-2.5 px-3">
                          {r.isValid ? (
                            <span className="inline-flex items-center text-emerald-700 font-semibold text-[10px]">
                              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
                              Valid
                            </span>
                          ) : (
                            <span
                              className="inline-flex items-center text-rose-700 font-semibold text-[10px]"
                              title={r.errors.join(', ')}
                            >
                              <AlertCircle className="w-3.5 h-3.5 mr-1 text-rose-600" />
                              {r.errors[0]}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-bold text-slate-900">{r.name}</p>
                          <p className="text-[10px] text-slate-500">{r.genericName} • {r.dosage}</p>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-medium text-[11px]">
                            {r.categoryName}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <p className="font-semibold text-slate-800">{r.form}</p>
                          <p className="text-[10px] text-indigo-600 font-medium">{r.routeOfAdministration}</p>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600">
                          {safeFixed(r.purchasePrice)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-700">
                          {safeFixed(r.sellingPrice)}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          {r.requiresPrescription ? (
                            <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 font-bold text-[9px] rounded-sm">
                              Rx
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 font-semibold text-[9px] rounded-sm">
                              OTC
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          {r.initialBatchNumber ? (
                            <p className="text-[10px] font-mono text-slate-700">
                              {r.initialBatchNumber} ({r.initialBatchQuantity} units)
                            </p>
                          ) : (
                            <span className="text-[10px] text-slate-400">None</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        {!importSummary && parsedRows.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              Ready to import <strong>{validCount}</strong> valid medicines out of {parsedRows.length} total rows.
            </p>

            <div className="flex items-center space-x-2">
              <button
                type="button"
                onClick={() => setParsedRows([])}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                disabled={isProcessing || validCount === 0}
                onClick={handleCommitImport}
                className="inline-flex items-center px-5 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 mr-2 animate-spin" />
                    Importing to Formulary...
                  </>
                ) : (
                  <>
                    <Database className="w-3.5 h-3.5 mr-1.5" />
                    Commit & Import {validCount} Medicines
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
