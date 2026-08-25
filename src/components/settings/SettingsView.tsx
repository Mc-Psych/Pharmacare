import React, { useState, useRef } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { PharmacySettings } from '../../types';
import {
  Settings,
  Save,
  Download,
  Upload,
  RotateCcw,
  ShieldCheck,
  Building,
  DollarSign,
  AlertTriangle,
  FileCheck,
  CheckCircle,
  Database
} from 'lucide-react';

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    exportFullDatabaseBackup,
    restoreDatabaseBackup,
    resetToDefaultSeedData
  } = usePharmacy();

  const [formData, setFormData] = useState<PharmacySettings>({ ...settings });
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSaveSuccessMsg('System configuration settings saved successfully.');
    setTimeout(() => setSaveSuccessMsg(''), 4000);
  };

  const handleDownloadBackup = () => {
    const backupJson = exportFullDatabaseBackup();
    const blob = new Blob([backupJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `pharmacare_backup_${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setBackupMsg('Full system database backup exported successfully.');
    setTimeout(() => setBackupMsg(''), 4000);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const success = restoreDatabaseBackup(content);
      if (success) {
        setBackupMsg('System database successfully restored from backup.');
        window.location.reload();
      } else {
        alert('Invalid or corrupted backup JSON file.');
      }
    };
    reader.readAsText(file);
  };

  const handleResetDefaults = () => {
    if (
      window.confirm(
        'WARNING: This will reset all current transactions, batches, and patient data back to system demonstration seed defaults. Proceed?'
      )
    ) {
      resetToDefaultSeedData();
      window.location.reload();
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Pharmacy System Configuration & Backups</h2>
          <p className="text-xs text-slate-500 mt-1">
            Configure clinic identity, tax parameters, currency symbols, and perform offline database snapshot backups.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="inline-flex items-center px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4 mr-1.5 text-indigo-600" />
            Export Backup (.json)
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {backupMsg && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-800 text-xs font-bold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4" />
          <span>{backupMsg}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">
        {/* Section 1: Pharmacy Facility Profile */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Building className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Pharmacy License & Facility Profile</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pharmacy Trade Name *</label>
              <input
                type="text"
                required
                value={formData.pharmacyName}
                onChange={(e) => setFormData({ ...formData, pharmacyName: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pharmacy Premises License #</label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Telephone</label>
              <input
                type="text"
                value={formData.telephone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Physical Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Financial & Tax Configuration */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Financial, Tax & Invoice Formatting</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency Symbol *</label>
              <input
                type="text"
                required
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Currency Code (ISO)</label>
              <input
                type="text"
                value={formData.currencyCode}
                onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono uppercase"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Invoice Number Prefix</label>
              <input
                type="text"
                value={formData.invoicePrefix}
                onChange={(e) => setFormData({ ...formData, invoicePrefix: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div className="sm:col-span-3 flex items-center space-x-4 pt-2">
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enableTax"
                  checked={formData.enableTax}
                  onChange={(e) => setFormData({ ...formData, enableTax: e.target.checked })}
                  className="w-4 h-4 text-indigo-600 rounded-sm"
                />
                <label htmlFor="enableTax" className="font-semibold text-slate-800 cursor-pointer">
                  Enable Sales Tax / VAT Calculation on POS
                </label>
              </div>

              {formData.enableTax && (
                <div className="flex items-center space-x-2">
                  <label className="font-semibold text-slate-700">Tax Rate (%):</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={formData.taxRatePercent}
                    onChange={(e) => setFormData({ ...formData, taxRatePercent: parseFloat(e.target.value) || 0 })}
                    className="w-20 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg font-bold text-center"
                  />
                </div>
              )}
            </div>

            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">Receipt Footer Note</label>
              <input
                type="text"
                value={formData.receiptFooterNote}
                onChange={(e) => setFormData({ ...formData, receiptFooterNote: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Clinical & Inventory Alerts */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-bold text-slate-900">Inventory Alert Thresholds</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Near Expiry Warning Window (Days before expiration)
              </label>
              <input
                type="number"
                min="10"
                max="365"
                value={formData.nearExpiryThresholdDays}
                onChange={(e) => setFormData({ ...formData, nearExpiryThresholdDays: parseInt(e.target.value) || 60 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
              <p className="text-[10px] text-slate-400 mt-1">
                Batches expiring within this number of days trigger amber alerts.
              </p>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Default Minimum Stock Reorder Threshold
              </label>
              <input
                type="number"
                min="1"
                value={formData.lowStockThresholdDefault}
                onChange={(e) => setFormData({ ...formData, lowStockThresholdDefault: parseInt(e.target.value) || 15 })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-bold"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="inline-flex items-center px-6 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-md transition-colors"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Configuration Changes
          </button>
        </div>
      </form>

      {/* Section 4: Offline Backup & Database Snapshot Manager */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Database className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Offline Database Snapshot & Recovery</h3>
            <p className="text-xs text-slate-500">
              The PMS runs standalone offline without requiring internet connection. Backups are saved as portable JSON files.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          {/* Export */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center">
                <Download className="w-4 h-4 mr-1.5 text-indigo-600" />
                Export Offline Backup
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Download encrypted JSON file containing all sales, inventory, batches, customers, and audit trails.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition-colors mt-3"
            >
              Export JSON File
            </button>
          </div>

          {/* Import */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center">
                <Upload className="w-4 h-4 mr-1.5 text-emerald-600" />
                Restore from Backup File
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Upload a valid JSON backup file to overwrite and restore database tables.
              </p>
            </div>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors mt-3"
              >
                Select Backup File
              </button>
            </div>
          </div>

          {/* Reset */}
          <div className="p-4 bg-rose-50/50 rounded-2xl border border-rose-200 space-y-2 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-rose-950 flex items-center">
                <RotateCcw className="w-4 h-4 mr-1.5 text-rose-600" />
                Seed Factory Reset
              </h4>
              <p className="text-[11px] text-rose-800 mt-1">
                Reset system back to default pharmaceutical seed records.
              </p>
            </div>
            <button
              type="button"
              onClick={handleResetDefaults}
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors mt-3"
            >
              Reset Seed Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
