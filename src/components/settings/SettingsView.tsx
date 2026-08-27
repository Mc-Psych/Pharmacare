import React, { useState, useRef } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { PharmacySettings } from '../../types';
import {
  Save,
  Download,
  Upload,
  RotateCcw,
  Building,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  Database,
  Image as ImageIcon,
  Trash2,
  Sparkles,
  UploadCloud,
  FileText,
  Shield,
  Layers,
  Store
} from 'lucide-react';

// Preset sample pharmacy logos for instant branding selection
const SAMPLE_PRESET_LOGOS = [
  {
    name: 'Green Cross Shield',
    svg: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="%23059669"/><path d="M50 15 L80 28 V52 C80 70 50 85 50 85 C50 85 20 70 20 52 V28 Z" fill="white"/><path d="M44 34 H56 V44 H66 V56 H56 V66 H44 V56 H34 V44 H44 Z" fill="%23059669"/></svg>'
  },
  {
    name: 'Rx Mortar & Pestle',
    svg: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="%230f172a"/><circle cx="50" cy="50" r="38" fill="%230284c7"/><path d="M28 42 C28 65 72 65 72 42 Z" fill="white"/><path d="M35 70 H65 V76 H35 Z" fill="white"/><path d="M58 20 L42 46" stroke="white" stroke-width="7" stroke-linecap="round"/><text x="40" y="58" font-family="Arial" font-weight="bold" font-size="14" fill="%230284c7">Rx</text></svg>'
  },
  {
    name: 'Modern Pharma Capsule',
    svg: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="%234f46e5"/><g transform="rotate(45 50 50)"><rect x="30" y="20" width="40" height="30" rx="15" fill="white"/><rect x="30" y="50" width="40" height="30" rx="15" fill="%2310b981"/><line x1="30" y1="50" x2="70" y2="50" stroke="%23312e81" stroke-width="2"/></g><circle cx="50" cy="50" r="8" fill="white" opacity="0.3"/></svg>'
  },
  {
    name: 'Emerald Health Cross',
    svg: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" fill="none"><rect width="100" height="100" rx="20" fill="%23064e3b"/><circle cx="50" cy="50" r="36" fill="%2310b981"/><path d="M42 26 H58 V42 H74 V58 H58 V74 H42 V58 H26 V42 H42 Z" fill="white"/><circle cx="50" cy="50" r="4" fill="%23064e3b"/></svg>'
  }
];

export const SettingsView: React.FC = () => {
  const {
    settings,
    updateSettings,
    exportFullDatabaseBackup,
    restoreDatabaseBackup,
    resetToDefaultSeedData
  } = usePharmacy();

  const [formData, setFormData] = useState<PharmacySettings>({
    ...settings,
    systemName: settings.systemName || 'PharmaCare PMS',
    systemLogo: settings.systemLogo || settings.logoUrl || '',
    logoUrl: settings.logoUrl || settings.systemLogo || '',
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [backupMsg, setBackupMsg] = useState('');
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState('');

  const logoInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Synchronize with external settings updates
  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ...settings,
      systemName: settings.systemName || prev.systemName || 'PharmaCare PMS',
      systemLogo: settings.systemLogo || settings.logoUrl || prev.systemLogo || '',
      logoUrl: settings.logoUrl || settings.systemLogo || prev.logoUrl || '',
    }));
  }, [settings]);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    updateSettings(formData);
    setSaveSuccessMsg('System brand identity and configuration saved successfully.');
    setTimeout(() => setSaveSuccessMsg(''), 4500);
  };

  const processLogoFile = (file: File) => {
    setLogoUploadError('');
    if (!file.type.startsWith('image/')) {
      setLogoUploadError('Please select a valid image file (PNG, JPG, SVG, or WebP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setLogoUploadError('File size exceeds 5MB limit. Please upload an optimized image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const rawDataUrl = e.target?.result as string;
      if (!rawDataUrl) return;

      // If SVG, use directly
      if (file.type === 'image/svg+xml') {
        setFormData(prev => ({
          ...prev,
          systemLogo: rawDataUrl,
          logoUrl: rawDataUrl
        }));
        return;
      }

      // For raster images (PNG, JPG, WebP), compress and resize to optimal logo dimensions
      const img = new Image();
      img.onload = () => {
        const MAX_DIM = 240;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          setFormData(prev => ({ ...prev, systemLogo: rawDataUrl, logoUrl: rawDataUrl }));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img, 0, 0, width, height);

        // Export as WebP/PNG at high quality but ultra-compact footprint (~10-25KB)
        const compressedDataUrl = canvas.toDataURL('image/png');
        setFormData(prev => ({
          ...prev,
          systemLogo: compressedDataUrl,
          logoUrl: compressedDataUrl
        }));
      };
      img.onerror = () => {
        setLogoUploadError('Failed to decode image data.');
      };
      img.src = rawDataUrl;
    };
    reader.onerror = () => {
      setLogoUploadError('Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processLogoFile(file);
    }
  };

  const handleLogoDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDraggingLogo(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processLogoFile(file);
    }
  };

  const handleRemoveLogo = () => {
    setFormData(prev => ({
      ...prev,
      systemLogo: '',
      logoUrl: ''
    }));
    if (logoInputRef.current) {
      logoInputRef.current.value = '';
    }
  };

  const handleSelectPresetLogo = (svg: string) => {
    setFormData(prev => ({
      ...prev,
      systemLogo: svg,
      logoUrl: svg
    }));
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

  const handleBackupFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const activeLogo = formData.systemLogo || formData.logoUrl;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-xl font-bold text-slate-900">System Brand & Pharmacy Configuration</h2>
            <span className="px-2.5 py-0.5 text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full">
              Admin Control
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Customize facility identity, upload system brand logo, configure tax rules, and manage database snapshots.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            type="button"
            onClick={handleDownloadBackup}
            className="inline-flex items-center px-4 py-2.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <Download className="w-4 h-4 mr-1.5 text-indigo-600" />
            Export Backup (.json)
          </button>
        </div>
      </div>

      {saveSuccessMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold flex items-center space-x-2 animate-in fade-in duration-200">
          <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

      {backupMsg && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-800 text-xs font-bold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{backupMsg}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">

        {/* Section 1: System Brand Identity & Logo Upload */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">System Brand Logo & Visual Identity</h3>
                <p className="text-[11px] text-slate-500">
                  Upload your pharmacy clinic logo. It will appear on the top navigation, sidebar, point-of-sale thermal receipts, and printable audit reports.
                </p>
              </div>
            </div>
            {activeLogo && (
              <span className="hidden sm:inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <CheckCircle className="w-3.5 h-3.5 mr-1" />
                Custom Logo Active
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Upload Zone & Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                Upload Brand Logo File (PNG, JPG, SVG, WebP)
              </label>

              {/* Drag & Drop Area */}
              <div
                onDragOver={(e) => { e.preventDefault(); setIsDraggingLogo(true); }}
                onDragLeave={() => setIsDraggingLogo(false)}
                onDrop={handleLogoDrop}
                onClick={() => logoInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${
                  isDraggingLogo
                    ? 'border-indigo-500 bg-indigo-50/50 scale-[0.99]'
                    : 'border-slate-300 hover:border-indigo-400 bg-slate-50/50 hover:bg-slate-50'
                }`}
              >
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  onChange={handleLogoFileChange}
                  className="hidden"
                />

                <div className="flex flex-col items-center justify-center space-y-2">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-xs">
                    <UploadCloud className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-indigo-600 hover:underline">
                      Click to upload logo
                    </span>
                    <span className="text-xs text-slate-500"> or drag and drop image here</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Transparent PNG, SVG, or high-res JPG (Max 3MB • Recommended: Square or 3:1 Ratio)
                  </p>
                </div>
              </div>

              {logoUploadError && (
                <p className="text-xs text-rose-600 font-semibold flex items-center space-x-1">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
                  {logoUploadError}
                </p>
              )}

              {/* Actions row: remove logo or clear */}
              {activeLogo && (
                <div className="flex items-center justify-between pt-1">
                  <div className="text-[11px] text-slate-500 font-medium flex items-center space-x-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                    <span>Brand logo loaded in system memory</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5 mr-1" />
                    Remove Logo
                  </button>
                </div>
              )}

              {/* Preset Sample Logos Selector */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center space-x-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                    <span>Or Select a Professional Pharmacy Emblem Preset:</span>
                  </span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {SAMPLE_PRESET_LOGOS.map((preset) => {
                    const isSelected = formData.systemLogo === preset.svg;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => handleSelectPresetLogo(preset.svg)}
                        className={`flex flex-col items-center p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                            : 'border-slate-200 hover:border-slate-300 bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="w-10 h-10 rounded-lg overflow-hidden flex items-center justify-center p-1 mb-1.5 bg-slate-50 border border-slate-100">
                          <img
                            src={preset.svg}
                            alt={preset.name}
                            className="max-h-full max-w-full object-contain"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-800 leading-tight">
                          {preset.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: Live Real-Time Brand Identity Previews (5 cols) */}
            <div className="lg:col-span-5 space-y-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                  <Layers className="w-4 h-4 text-indigo-600" />
                  <span>Live System Previews</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Automatic multi-theme styling</span>
              </div>

              {/* Preview 1: Light Navbar Header */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Top Navigation Bar</span>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
                  {activeLogo ? (
                    <div className="w-8 h-8 rounded-lg overflow-hidden border border-slate-200 bg-white p-0.5 shrink-0 flex items-center justify-center">
                      <img
                        src={activeLogo}
                        alt="Logo Preview"
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white font-bold flex items-center justify-center text-xs shrink-0">
                      P
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-slate-900 truncate">
                      {formData.systemName || formData.pharmacyName || 'PharmaCare Pharmacy'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {formData.pharmacyName || 'PharmaCare'} • Live Terminal
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview 2: Dark Sidebar Header */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Dark Sidebar Header</span>
                <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-white flex items-center space-x-3">
                  {activeLogo ? (
                    <div className="w-9 h-9 rounded-xl overflow-hidden bg-white p-1 border border-slate-700 shrink-0 flex items-center justify-center">
                      <img
                        src={activeLogo}
                        alt="Sidebar Preview"
                        className="max-h-full max-w-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white font-bold flex items-center justify-center text-sm shrink-0">
                      P
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-white truncate">
                      {formData.systemName || 'PharmaCare PMS'}
                    </div>
                    <div className="text-[10px] text-slate-400 truncate">
                      {formData.licenseNumber ? `Lic: ${formData.licenseNumber}` : 'PMS • Enterprise'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Preview 3: Official Thermal Receipt / Report Header */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Thermal Receipt & Report Print</span>
                <div className="p-3 bg-white rounded-xl border border-dashed border-slate-300 text-center space-y-1">
                  {activeLogo ? (
                    <div className="flex justify-center">
                      <img
                        src={activeLogo}
                        alt="Receipt Preview"
                        className="max-h-8 max-w-[100px] object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="inline-block px-2 py-0.5 bg-emerald-600 text-white font-bold rounded text-[10px]">
                      ✚ PHARMACARE
                    </div>
                  )}
                  <div className="text-[11px] font-bold text-slate-900 leading-tight">
                    {formData.pharmacyName || 'PharmaCare Pharmacy'}
                  </div>
                  <div className="text-[9px] text-slate-500">
                    {formData.address || 'Ring Road Central, Accra'} • Tel: {formData.phone || formData.telephone || '+233 024 174 4004'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Pharmacy Facility Profile & Naming */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Building className="w-5 h-5 text-indigo-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pharmacy License & Facility Profile</h3>
              <p className="text-xs text-slate-500">Official registry details displayed on customer receipts and Pharmacy Council reports.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">System Software Display Name *</label>
              <input
                type="text"
                required
                value={formData.systemName}
                onChange={(e) => setFormData({ ...formData, systemName: e.target.value })}
                placeholder="e.g. PharmaCare PMS"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pharmacy Facility / Trade Name *</label>
              <input
                type="text"
                required
                value={formData.pharmacyName}
                onChange={(e) => setFormData({ ...formData, pharmacyName: e.target.value })}
                placeholder="e.g. PharmaCare Pharmacy"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pharmacy Premises License # (GPC)</label>
              <input
                type="text"
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                placeholder="e.g. PHA-GH-2026-98421"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Primary Telephone</label>
              <input
                type="text"
                value={formData.telephone || formData.phone}
                onChange={(e) => setFormData({ ...formData, telephone: e.target.value, phone: e.target.value })}
                placeholder="e.g. +233 024 174 4004"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Contact Email</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. info@pharmacare-ghana.com"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Physical Facility Address</label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Ring Road Central, Adabraka, Accra, Ghana"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Financial & Tax Configuration */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Financial, Tax & Invoice Formatting</h3>
              <p className="text-xs text-slate-500">Configure currency codes, sales VAT rate, and receipt headers.</p>
            </div>
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
                value={formData.invoicePrefix || 'INV'}
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
                  className="w-4 h-4 text-indigo-600 rounded-sm cursor-pointer"
                />
                <label htmlFor="enableTax" className="font-semibold text-slate-800 cursor-pointer">
                  Enable Sales Tax / VAT Calculation on Point-of-Sale
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
              <label className="block font-semibold text-slate-700 mb-1">Receipt Header Slogan</label>
              <input
                type="text"
                value={formData.receiptHeader}
                onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                placeholder="e.g. Quality Healthcare & Compassionate Service"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>

            <div className="sm:col-span-3">
              <label className="block font-semibold text-slate-700 mb-1">Receipt Footer Note / Slogan</label>
              <input
                type="text"
                value={formData.receiptFooter || formData.receiptFooterNote}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value, receiptFooterNote: e.target.value })}
                placeholder="e.g. Thank you for choosing PharmaCare Pharmacy. Medicate responsibly."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Clinical & Inventory Alerts */}
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

        {/* Save Button */}
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            className="inline-flex items-center px-8 py-3 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-2xl shadow-md transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4 mr-2" />
            Save Brand & Configuration Changes
          </button>
        </div>
      </form>

      {/* Section 5: Offline Backup & Database Snapshot Manager */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
          <Database className="w-5 h-5 text-indigo-600" />
          <div>
            <h3 className="text-sm font-bold text-slate-900">Offline Database Snapshot & Recovery</h3>
            <p className="text-xs text-slate-500">
              Export portable encrypted JSON backups or restore data snapshots securely.
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
                Download JSON file containing all sales, inventory, batches, customers, and audit trails.
              </p>
            </div>
            <button
              type="button"
              onClick={handleDownloadBackup}
              className="w-full py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-bold rounded-xl transition-colors mt-3 cursor-pointer"
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
                ref={backupInputRef}
                accept=".json"
                onChange={handleBackupFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => backupInputRef.current?.click()}
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors mt-3 cursor-pointer"
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
              className="w-full py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors mt-3 cursor-pointer"
            >
              Reset Seed Data
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
