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
  Store,
  UserCheck,
  KeyRound,
  Lock,
  Minus,
  Plus,
  SlidersHorizontal,
  AlertOctagon,
  CheckCircle2,
  X,
  Eye,
  Info,
  PenTool,
  FileSignature
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
    resetToDefaultSeedData,
    clearAllOperationalData
  } = usePharmacy();

  const [formData, setFormData] = useState<PharmacySettings>({
    ...settings,
    systemName: settings.systemName || 'PharmaCare PMS',
    systemLogo: settings.systemLogo || settings.logoUrl || '',
    logoUrl: settings.logoUrl || settings.systemLogo || '',
    logoSize: settings.logoSize || 48,
    superintendentSignatureUrl: settings.superintendentSignatureUrl || settings.signatureURL || settings.signatureUrl || '',
    signatureURL: settings.signatureURL || settings.superintendentSignatureUrl || settings.signatureUrl || '',
    signatureUrl: settings.signatureUrl || settings.superintendentSignatureUrl || settings.signatureURL || '',
  });

  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [saveSuccessDetails, setSaveSuccessDetails] = useState<{
    timestamp: string;
    systemName: string;
    currency: string;
    taxRate: number;
    logoAttached: boolean;
    signatureAttached: boolean;
  } | null>(null);
  const [backupMsg, setBackupMsg] = useState('');
  const [isDraggingLogo, setIsDraggingLogo] = useState(false);
  const [logoUploadError, setLogoUploadError] = useState('');
  const [signatureUploadError, setSignatureUploadError] = useState('');

  // Confirmation warning window modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    type: 'purge' | 'reset' | null;
    title: string;
    description: string;
    warningNote: string;
    affectedList: string[];
    preservedList?: string[];
    confirmBtnText: string;
    accent: 'amber' | 'rose';
  }>({
    isOpen: false,
    type: null,
    title: '',
    description: '',
    warningNote: '',
    affectedList: [],
    preservedList: [],
    confirmBtnText: '',
    accent: 'amber',
  });

  // Success popup notification modal state
  const [successModal, setSuccessModal] = useState<{
    isOpen: boolean;
    type: 'purge' | 'reset' | null;
    title: string;
    summary: string;
    clearedItems: { label: string; status: string }[];
    timestamp: string;
  }>({
    isOpen: false,
    type: null,
    title: '',
    summary: '',
    clearedItems: [],
    timestamp: '',
  });

  const logoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  // Synchronize with external settings updates
  React.useEffect(() => {
    setFormData(prev => ({
      ...prev,
      ...settings,
      systemName: settings.systemName || prev.systemName || 'PharmaCare PMS',
      systemLogo: settings.systemLogo || settings.logoUrl || prev.systemLogo || '',
      logoUrl: settings.logoUrl || settings.systemLogo || prev.logoUrl || '',
      logoSize: settings.logoSize || prev.logoSize || 48,
      superintendentSignatureUrl: settings.superintendentSignatureUrl || settings.signatureURL || settings.signatureUrl || prev.superintendentSignatureUrl || '',
      signatureURL: settings.signatureURL || settings.superintendentSignatureUrl || settings.signatureUrl || prev.signatureURL || '',
      signatureUrl: settings.signatureUrl || settings.superintendentSignatureUrl || settings.signatureURL || prev.signatureUrl || '',
    }));
  }, [settings]);

  const handleSaveSettings = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    updateSettings(formData);
    const nowStr = new Date().toLocaleTimeString();
    setSaveSuccessDetails({
      timestamp: nowStr,
      systemName: formData.systemName || 'PharmaCare PMS',
      currency: formData.currencySymbol || 'GH₵',
      taxRate: formData.taxRatePercent || 0,
      logoAttached: Boolean(formData.systemLogo || formData.logoUrl),
      signatureAttached: Boolean(formData.superintendentSignatureUrl || formData.signatureURL || formData.signatureUrl),
    });
    setSaveSuccessMsg(`System configurations & brand settings saved successfully at ${nowStr}.`);
    setIsSaving(false);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
    }, 4500);
    setTimeout(() => {
      setSaveSuccessMsg('');
    }, 7000);
  };

  const handleLogoSizeChange = (newSize: number) => {
    const clamped = Math.min(Math.max(Math.round(newSize), 24), 120);
    setFormData(prev => ({ ...prev, logoSize: clamped }));
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
        const MAX_DIM = 320;
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

        // Export as PNG at high quality
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

  const handleSignatureFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSignatureUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setSignatureUploadError('Please select a valid image file (PNG, JPG, SVG, or WebP).');
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setSignatureUploadError('Signature file size exceeds 2MB limit.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        setFormData(prev => ({
          ...prev,
          superintendentSignatureUrl: dataUrl,
          signatureURL: dataUrl,
          signatureUrl: dataUrl,
        }));
      }
    };
    reader.onerror = () => {
      setSignatureUploadError('Failed to read signature image.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveSignature = () => {
    setFormData(prev => ({
      ...prev,
      superintendentSignatureUrl: '',
      signatureURL: '',
      signatureUrl: '',
    }));
    if (signatureInputRef.current) {
      signatureInputRef.current.value = '';
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

  // Warning Window handlers
  const openPurgeConfirmation = () => {
    setConfirmModal({
      isOpen: true,
      type: 'purge',
      title: 'Warning: Purge All Operational Records',
      description: 'You are about to permanently erase all transactional history, customer purchases, patient prescriptions, and financial ledgers.',
      warningNote: 'This action cannot be undone. All operational receipts, refund ledgers, and dispensing records will be permanently removed from Cloud Firestore and local storage.',
      affectedList: [
        'All Sales Invoices & Point-of-Sale Transactions',
        'All Customer Returns, Credit Notes & Refund Ledgers',
        'All Supplier Purchase Orders & Goods Received Logs',
        'All Registered Doctor Prescriptions & Dispensing Records',
        'All Patient Profiles & Customer Registry Records',
        'All Temporary Held Carts & Manual Stock Discrepancy Adjustments',
      ],
      preservedList: [
        'Master Medicine Catalog & Therapeutic Categories',
        'Staff User Accounts, Passwords & Access Roles',
        'Pharmacy Facility Settings, Brand Logo & License Information',
      ],
      confirmBtnText: 'Yes, Purge All Operational Records',
      accent: 'amber',
    });
  };

  const openResetConfirmation = () => {
    setConfirmModal({
      isOpen: true,
      type: 'reset',
      title: 'Warning: Factory Baseline Seed Reset',
      description: 'You are about to reset all system records back to initial factory setup defaults and sample data.',
      warningNote: 'This will reset current inventory stock, operational history, and catalog data back to the clean demonstration seed baseline.',
      affectedList: [
        'Re-initializes all test transactions & sales ledgers',
        'Restores initial NHIS medicine catalog and baseline stock batches',
        'Restores default staff user accounts and baseline permissions',
        'Re-synchronizes Cloud Firestore schema collections',
      ],
      preservedList: [
        'Cloud Firestore database connectivity credentials',
      ],
      confirmBtnText: 'Yes, Reset System to Factory Seed',
      accent: 'rose',
    });
  };

  // Execution after confirmation
  const handleExecuteConfirmedAction = () => {
    const actionType = confirmModal.type;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));

    if (actionType === 'purge') {
      if (clearAllOperationalData) {
        clearAllOperationalData();
      }
      setSuccessModal({
        isOpen: true,
        type: 'purge',
        title: 'Operational Records Successfully Purged',
        summary: 'All system sales transactions, refunds, purchase orders, registered prescriptions, and patient records have been permanently cleared.',
        clearedItems: [
          { label: 'Sales & Invoices Ledger', status: 'Purged (GH₵ 0.00 Total Revenue)' },
          { label: 'Returns & Refund Claims', status: 'Purged (0 Active Claims)' },
          { label: 'Supplier Purchase Orders', status: 'Purged (0 Orders)' },
          { label: 'Doctor Prescriptions', status: 'Purged (0 Prescriptions)' },
          { label: 'Patient & Customer Registry', status: 'Purged (0 Records)' },
          { label: 'Held Carts & Adjustments', status: 'Purged' },
        ],
        timestamp: new Date().toLocaleTimeString(),
      });
    } else if (actionType === 'reset') {
      resetToDefaultSeedData();
      setSuccessModal({
        isOpen: true,
        type: 'reset',
        title: 'System Factory Reset Successful',
        summary: 'The application database has been successfully re-initialized with clean factory seed catalogs, baseline inventory batches, and default configurations.',
        clearedItems: [
          { label: 'Medicine Catalog', status: 'Restored Factory NHIS Catalog' },
          { label: 'Inventory Batches', status: 'Restored Baseline Stock Batches' },
          { label: 'Operational Records', status: 'Reset to Clean Baseline' },
          { label: 'System Configurations', status: 'Restored Default Setup' },
        ],
        timestamp: new Date().toLocaleTimeString(),
      });
    }
  };

  const activeLogo = formData.systemLogo || formData.logoUrl;
  const currentLogoSize = formData.logoSize || 48;

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
            Customize facility identity, upload and resize system brand logo, configure tax rules, and manage database maintenance.
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
          <button
            type="button"
            onClick={() => handleSaveSettings()}
            disabled={isSaving}
            className={`inline-flex items-center px-4 py-2.5 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs ${
              isSaved
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isSaved ? (
              <>
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-white" />
                Configuration Saved!
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-1.5 text-white" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>

      {/* Success Notification Banner */}
      {saveSuccessMsg && (
        <div className="p-4 sm:p-5 bg-emerald-50 border border-emerald-200 rounded-3xl text-emerald-950 text-xs shadow-xs animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start space-x-3">
              <div className="w-9 h-9 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5 shadow-2xs">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center space-x-2">
                  <h4 className="font-bold text-sm text-emerald-950">System Configuration Successfully Updated</h4>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                    Live • {saveSuccessDetails?.timestamp || 'Applied'}
                  </span>
                </div>
                <p className="text-xs text-emerald-800">
                  Pharmacy branding, currency symbol, tax rules, superintendent signature, and operational thresholds have been saved to local state and synchronized with Cloud Firestore.
                </p>
                {saveSuccessDetails && (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="px-2.5 py-1 rounded-xl bg-white/90 border border-emerald-200 font-semibold text-[11px] text-emerald-900 shadow-2xs">
                      Facility: <strong className="text-slate-900">{saveSuccessDetails.systemName}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-white/90 border border-emerald-200 font-semibold text-[11px] text-emerald-900 shadow-2xs">
                      Currency: <strong className="text-slate-900">{saveSuccessDetails.currency}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-white/90 border border-emerald-200 font-semibold text-[11px] text-emerald-900 shadow-2xs">
                      Tax: <strong className="text-slate-900">{saveSuccessDetails.taxRate}%</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-white/90 border border-emerald-200 font-semibold text-[11px] text-emerald-900 shadow-2xs">
                      Logo: <strong className="text-slate-900">{saveSuccessDetails.logoAttached ? 'Configured' : 'Default'}</strong>
                    </span>
                    <span className="px-2.5 py-1 rounded-xl bg-white/90 border border-emerald-200 font-semibold text-[11px] text-emerald-900 shadow-2xs">
                      Superintendent Signature: <strong className="text-slate-900">{saveSuccessDetails.signatureAttached ? 'Attached' : 'None'}</strong>
                    </span>
                  </div>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSaveSuccessMsg('')}
              className="text-emerald-700 hover:text-emerald-950 p-1.5 rounded-xl hover:bg-emerald-100 transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {backupMsg && (
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-2xl text-indigo-800 text-xs font-bold flex items-center space-x-2 shadow-xs">
          <CheckCircle2 className="w-4 h-4 text-indigo-600 shrink-0" />
          <span>{backupMsg}</span>
        </div>
      )}

      {/* Main Settings Form */}
      <form onSubmit={handleSaveSettings} className="space-y-6">

        {/* Section 1: System Brand Identity & Enlarged Logo Management */}
        <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-5">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-2xl bg-indigo-100/80 flex items-center justify-center text-indigo-600 shadow-xs">
                <ImageIcon className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">System Brand Logo & Dynamic Sizing</h3>
                <p className="text-xs text-slate-500">
                  Upload your pharmacy clinic logo, scale its size to your preference, and save to apply across top navigation, sidebar, receipts, and login screens.
                </p>
              </div>
            </div>
            {activeLogo && (
              <div className="flex items-center space-x-2 shrink-0">
                <span className="inline-flex items-center px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                  <CheckCircle className="w-3.5 h-3.5 mr-1.5" />
                  Logo Active ({currentLogoSize}px)
                </span>
              </div>
            )}
          </div>

          {/* Enlarged Brand Showcase Display Canvas */}
          <div className="p-6 bg-gradient-to-br from-slate-50 via-slate-50/50 to-indigo-50/30 rounded-2xl border border-slate-200">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              {/* Logo Stage Canvas */}
              <div className="flex flex-col items-center justify-center flex-1 w-full text-center">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-3">
                  Brand Logo Live Stage
                </span>
                <div className="w-full min-h-[160px] sm:min-h-[190px] bg-white rounded-2xl border border-slate-200/80 shadow-inner flex items-center justify-center p-6 relative overflow-hidden bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px]">
                  {activeLogo ? (
                    <div className="flex flex-col items-center justify-center space-y-2 transition-all duration-200">
                      <img
                        src={activeLogo}
                        alt="Active Brand Logo"
                        style={{ maxHeight: `${currentLogoSize}px`, maxWidth: '280px' }}
                        className="object-contain drop-shadow-sm transition-all duration-200"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-2">
                      <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                        <ImageIcon className="w-8 h-8" />
                      </div>
                      <p className="text-xs font-semibold">No custom logo uploaded yet</p>
                      <p className="text-[11px] text-slate-400">Default PharmaCare typography & shield emblem will be used</p>
                    </div>
                  )}
                  {activeLogo && (
                    <div className="absolute top-3 right-3 px-2 py-0.5 bg-slate-900/80 text-white text-[10px] font-mono font-semibold rounded-md backdrop-blur-xs">
                      Height: {currentLogoSize}px
                    </div>
                  )}
                </div>
              </div>

              {/* Logo Size Control Panel */}
              <div className="w-full md:w-80 lg:w-96 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4 shrink-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center space-x-1.5">
                    <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
                    <span>Adjust Logo Sizing</span>
                  </span>
                  <span className="text-xs font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-lg border border-indigo-100">
                    {currentLogoSize} px
                  </span>
                </div>

                {/* Range Slider + Steppers */}
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <button
                      type="button"
                      onClick={() => handleLogoSizeChange(currentLogoSize - 4)}
                      disabled={currentLogoSize <= 24}
                      title="Decrease logo size"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <input
                      type="range"
                      min={24}
                      max={120}
                      step={2}
                      value={currentLogoSize}
                      onChange={(e) => handleLogoSizeChange(Number(e.target.value))}
                      className="w-full accent-indigo-600 cursor-pointer h-2 bg-slate-200 rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => handleLogoSizeChange(currentLogoSize + 4)}
                      disabled={currentLogoSize >= 120}
                      title="Increase logo size"
                      className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 disabled:opacity-40 transition-colors cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold px-1">
                    <span>24px (Compact)</span>
                    <span>48px (Standard)</span>
                    <span>120px (Maximum)</span>
                  </div>
                </div>

                {/* Quick Preset Sizing Pills */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Quick Presets</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: 'Compact', size: 32 },
                      { label: 'Standard', size: 48 },
                      { label: 'Large', size: 64 },
                      { label: 'Prominent', size: 80 },
                      { label: 'Extra Large', size: 96 },
                      { label: 'Maximum', size: 120 }
                    ].map((preset) => {
                      const isActive = currentLogoSize === preset.size;
                      return (
                        <button
                          key={preset.size}
                          type="button"
                          onClick={() => handleLogoSizeChange(preset.size)}
                          className={`py-1.5 px-2 text-[11px] font-bold rounded-xl border transition-all cursor-pointer ${
                            isActive
                              ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                          }`}
                        >
                          {preset.label} ({preset.size}px)
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-[11px] text-slate-400 italic">
                  💡 Tip: Click "Save Brand & Configuration Changes" below after adjusting to persist your logo size across all devices.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left: Upload Zone & Controls (7 cols) */}
            <div className="lg:col-span-7 space-y-4">
              <label className="block text-xs font-bold text-slate-700">
                Upload New Brand Logo File (PNG, JPG, SVG, WebP)
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
                      Click to choose brand logo
                    </span>
                    <span className="text-xs text-slate-500"> or drag and drop image file here</span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Transparent PNG, SVG, or high-res JPG (Max 5MB • Recommended: Square or Horizontal)
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
                            ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20 shadow-xs'
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
                  <span>Live Multi-Theme Previews</span>
                </span>
                <span className="text-[10px] text-slate-400 font-medium">Auto-scales at {currentLogoSize}px</span>
              </div>

              {/* Preview 1: Light Navbar Header */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Top Navigation Bar</span>
                <div className="p-3 bg-white rounded-xl border border-slate-200 shadow-2xs flex items-center space-x-3">
                  {activeLogo ? (
                    <div 
                      style={{
                        width: `${Math.min(Math.max(currentLogoSize, 28), 54)}px`,
                        height: `${Math.min(Math.max(currentLogoSize, 28), 54)}px`
                      }}
                      className="rounded-xl overflow-hidden border border-slate-200 bg-white p-0.5 shrink-0 flex items-center justify-center transition-all"
                    >
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
                    <div 
                      style={{
                        width: `${Math.min(Math.max(currentLogoSize, 32), 60)}px`,
                        height: `${Math.min(Math.max(currentLogoSize, 32), 60)}px`
                      }}
                      className="rounded-xl overflow-hidden bg-white p-1 border border-slate-700 shrink-0 flex items-center justify-center transition-all"
                    >
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
                        style={{ maxHeight: `${Math.min(Math.max(currentLogoSize, 28), 64)}px` }}
                        className="max-w-[140px] object-contain transition-all"
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
            <h3 className="text-sm font-bold text-slate-900">Pharmacy Facility Profile & Naming</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Software System Branding Name
              </label>
              <input
                type="text"
                value={formData.systemName || ''}
                onChange={(e) => setFormData({ ...formData, systemName: e.target.value })}
                placeholder="e.g. PharmaCare PMS"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Displayed in browser title, navbar header, and login terminals.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Licensed Pharmacy Facility Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.pharmacyName}
                onChange={(e) => setFormData({ ...formData, pharmacyName: e.target.value })}
                placeholder="e.g. PharmaCare Pharmacy Ltd"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Official legal entity name printed on sales receipts and tax invoices.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pharmacy Council License / Registration No. <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.licenseNumber}
                onChange={(e) => setFormData({ ...formData, licenseNumber: e.target.value })}
                placeholder="e.g. PHA-GH-2026-98421"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Facility Phone / Contact
              </label>
              <input
                type="text"
                value={formData.phone || formData.telephone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value, telephone: e.target.value })}
                placeholder="e.g. +233 024 174 4004"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Official Email Address
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. contact@pharmacare-ghana.com"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Physical Premise Address
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Ring Road Central, Adabraka, Accra, Ghana"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>

          {/* Superintendent Pharmacist Digital Sign-off Section */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4.5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileSignature className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-bold text-slate-900">
                    Superintendent Pharmacist Official Sign-Off Signature
                  </span>
                </div>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                  Used in Official Audit & Stock Reports
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Upload the authorized signature of the Superintendent Pharmacist / Pharmacist-in-Charge. This digital signature automatically authenticates all printed Audit Ledgers, Executive Summaries, and Prescription Dispensing records.
              </p>

              <input
                ref={signatureInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml,image/webp"
                onChange={handleSignatureFileChange}
                className="hidden"
              />

              {formData.superintendentSignatureUrl || formData.signatureURL || formData.signatureUrl ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-white border border-slate-200 rounded-xl">
                  <div className="flex items-center space-x-3.5">
                    <div className="h-14 w-36 bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex items-center justify-center overflow-hidden">
                      <img
                        src={formData.superintendentSignatureUrl || formData.signatureURL || formData.signatureUrl}
                        alt="Superintendent Signature Preview"
                        className="max-h-12 max-w-full object-contain"
                      />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 flex items-center">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 mr-1 shrink-0" />
                        Signature Active & Configured
                      </div>
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Will appear on PDF exports and print-ready reports
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => signatureInputRef.current?.click()}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                    >
                      Change
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveSignature}
                      className="px-3 py-1.5 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-xl transition-colors cursor-pointer flex items-center"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      Remove
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => signatureInputRef.current?.click()}
                  className="border border-dashed border-slate-300 hover:border-emerald-500 rounded-xl p-4 text-center cursor-pointer bg-white hover:bg-emerald-50/40 transition-all"
                >
                  <div className="flex flex-col items-center justify-center space-y-1.5">
                    <PenTool className="w-5 h-5 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-700">
                      Upload Superintendent Pharmacist Signature
                    </span>
                    <span className="text-[10px] text-slate-400">
                      Supports PNG with transparent background or high-res JPG (Max 2MB)
                    </span>
                  </div>
                </div>
              )}

              {signatureUploadError && (
                <p className="text-xs text-rose-600 font-semibold flex items-center">
                  <AlertTriangle className="w-3.5 h-3.5 mr-1 shrink-0" />
                  {signatureUploadError}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Section 3: Financial & Currency Rules */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <DollarSign className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Financial & Currency Standards</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Currency Symbol <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.currencySymbol}
                onChange={(e) => setFormData({ ...formData, currencySymbol: e.target.value })}
                placeholder="GH₵"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-bold"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Standard Ghana Cedi symbol: GH₵
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ISO Currency Code
              </label>
              <input
                type="text"
                value={formData.currencyCode}
                onChange={(e) => setFormData({ ...formData, currencyCode: e.target.value })}
                placeholder="GHS"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden uppercase font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Sales Tax Rate (%)
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={formData.taxRatePercent}
                  onChange={(e) => setFormData({ ...formData, taxRatePercent: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
                <label className="inline-flex items-center space-x-1.5 text-xs text-slate-700 font-semibold cursor-pointer shrink-0">
                  <input
                    type="checkbox"
                    checked={formData.enableTax}
                    onChange={(e) => setFormData({ ...formData, enableTax: e.target.checked })}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <span>Enable Tax</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Section 4: Receipt & POS Document Headers */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Receipt & Point-of-Sale Print Formatting</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receipt Header Subtitle
              </label>
              <input
                type="text"
                value={formData.receiptHeader || ''}
                onChange={(e) => setFormData({ ...formData, receiptHeader: e.target.value })}
                placeholder="e.g. Quality Healthcare & Certified Prescription Dispensing"
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Receipt Footer Disclaimer / Advice Note
              </label>
              <input
                type="text"
                value={formData.receiptFooter || formData.receiptFooterNote || ''}
                onChange={(e) => setFormData({ ...formData, receiptFooter: e.target.value, receiptFooterNote: e.target.value })}
                placeholder="e.g. Keep medicine out of reach of children. Thank you for your patronage."
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Inventory & Operational Thresholds */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Inventory & Operational Thresholds</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Default Low Stock Alert Threshold (Units)
              </label>
              <input
                type="number"
                min="1"
                value={formData.lowStockThresholdDefault}
                onChange={(e) => setFormData({ ...formData, lowStockThresholdDefault: parseInt(e.target.value) || 10 })}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Near-Expiry Alert Window (Days)
              </label>
              <input
                type="number"
                min="7"
                value={formData.nearExpiryThresholdDays}
                onChange={(e) => setFormData({ ...formData, nearExpiryThresholdDays: parseInt(e.target.value) || 60 })}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Automated Screen Lock Timeout (Minutes)
              </label>
              <input
                type="number"
                min="1"
                max="240"
                value={formData.sessionTimeoutMinutes}
                onChange={(e) => setFormData({ ...formData, sessionTimeoutMinutes: parseInt(e.target.value) || 10 })}
                className="w-full px-3.5 py-2 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">
                Automatically locks the terminal after inactivity (Default: 10 mins).
              </span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
          <div className="text-xs text-slate-500 flex items-center space-x-2">
            {isSaved ? (
              <span className="inline-flex items-center text-emerald-800 font-bold bg-emerald-100/80 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 mr-1.5 text-emerald-600 shrink-0" />
                <span>Configuration changes saved and active ({saveSuccessDetails?.timestamp || 'Just now'})</span>
              </span>
            ) : (
              <span className="text-slate-500 text-xs">
                Saving updates brand identity, currency, taxes, and security parameters across all stations.
              </span>
            )}
          </div>
          <div className="flex items-center space-x-3 shrink-0 w-full sm:w-auto">
            <button
              type="submit"
              disabled={isSaving}
              className={`w-full sm:w-auto inline-flex items-center justify-center px-7 py-3 text-xs font-bold rounded-2xl shadow-md transition-all cursor-pointer ${
                isSaved
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/20'
              }`}
            >
              {isSaved ? (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2 text-white" />
                  Changes Saved Successfully!
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Brand & Configuration Changes
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Section 6: Database Maintenance & System Purge Controls */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center space-x-3 border-b border-slate-100 pb-4">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Database Maintenance & Administrative Controls</h3>
            <p className="text-xs text-slate-500">
              Export system backups, restore snapshots, purge operational test records, or restore factory baseline.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Backup & Restore Card */}
          <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 flex items-center">
                <Upload className="w-4 h-4 mr-1.5 text-indigo-600" />
                Restore Snapshot (.json)
              </h4>
              <p className="text-[11px] text-slate-500 mt-1">
                Upload a verified system backup file to restore database state.
              </p>
            </div>
            <div>
              <input
                ref={backupInputRef}
                type="file"
                accept=".json"
                onChange={handleBackupFileSelect}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => backupInputRef.current?.click()}
                className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs"
              >
                Select Backup File
              </button>
            </div>
          </div>

          {/* Purge Operational Records Card */}
          <div className="p-5 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-amber-950 flex items-center">
                  <Trash2 className="w-4 h-4 mr-1.5 text-amber-600" />
                  Purge Operational Records
                </h4>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-amber-200/80 text-amber-900 rounded">
                  Caution
                </span>
              </div>
              <p className="text-[11px] text-amber-800 mt-1">
                Permanently purge all sales invoices, refunds, purchase orders, prescriptions, and patient records. Catalog & users are preserved.
              </p>
            </div>
            <button
              type="button"
              onClick={openPurgeConfirmation}
              className="w-full py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center space-x-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Purge Records</span>
            </button>
          </div>

          {/* Seed Factory Reset Card */}
          <div className="p-5 bg-rose-50/70 rounded-2xl border border-rose-200 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-rose-950 flex items-center">
                  <RotateCcw className="w-4 h-4 mr-1.5 text-rose-600" />
                  Seed Factory Reset
                </h4>
                <span className="text-[9px] font-extrabold uppercase px-1.5 py-0.5 bg-rose-200/80 text-rose-900 rounded">
                  Baseline
                </span>
              </div>
              <p className="text-[11px] text-rose-800 mt-1">
                Reset system database back to initial factory setup defaults, baseline stock batches, and standard demonstration catalogs.
              </p>
            </div>
            <button
              type="button"
              onClick={openResetConfirmation}
              className="w-full py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors cursor-pointer shadow-xs flex items-center justify-center space-x-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset System</span>
            </button>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* WARNING CONFIRMATION MODAL WINDOW (Purge Records & Reset System) */}
      {/* ========================================================================= */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden space-y-0">
            {/* Modal Header */}
            <div className={`p-6 border-b ${
              confirmModal.accent === 'rose' 
                ? 'bg-rose-50/80 border-rose-100 text-rose-950' 
                : 'bg-amber-50/80 border-amber-100 text-amber-950'
            }`}>
              <div className="flex items-start space-x-3.5">
                <div className={`p-3 rounded-2xl shrink-0 ${
                  confirmModal.accent === 'rose'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                }`}>
                  {confirmModal.accent === 'rose' ? (
                    <AlertOctagon className="w-6 h-6" />
                  ) : (
                    <AlertTriangle className="w-6 h-6" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-base font-bold text-slate-900 leading-snug">
                    {confirmModal.title}
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {confirmModal.description}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* Warning Callout */}
              <div className={`p-3.5 rounded-2xl border text-xs font-semibold flex items-start space-x-2.5 ${
                confirmModal.accent === 'rose'
                  ? 'bg-rose-50/60 border-rose-200 text-rose-900'
                  : 'bg-amber-50/60 border-amber-200 text-amber-900'
              }`}>
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{confirmModal.warningNote}</span>
              </div>

              {/* What will be affected list */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                  Records & Data Affected:
                </span>
                <ul className="space-y-1.5">
                  {confirmModal.affectedList.map((item, idx) => (
                    <li key={idx} className="flex items-center text-xs text-slate-700 space-x-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0"></span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Preserved items if any */}
              {confirmModal.preservedList && confirmModal.preservedList.length > 0 && (
                <div className="p-3 bg-emerald-50/60 rounded-2xl border border-emerald-200 space-y-1.5">
                  <span className="text-[11px] font-bold text-emerald-900 flex items-center space-x-1">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Safely Preserved & Protected:</span>
                  </span>
                  <ul className="space-y-1 text-[11px] text-emerald-800">
                    {confirmModal.preservedList.map((item, idx) => (
                      <li key={idx} className="flex items-center space-x-1.5">
                        <span className="w-1 h-1 rounded-full bg-emerald-500"></span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Modal Footer Controls */}
            <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-xl transition-colors cursor-pointer"
              >
                Cancel & Keep Data
              </button>
              <button
                type="button"
                onClick={handleExecuteConfirmedAction}
                className={`w-full sm:w-auto px-5 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-colors cursor-pointer flex items-center justify-center space-x-1.5 ${
                  confirmModal.accent === 'rose'
                    ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                    : 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                }`}
              >
                <span>{confirmModal.confirmBtnText}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* POPUP NOTIFICATION OF SUCCESSFUL PURGE OR RESET */}
      {/* ========================================================================= */}
      {successModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden text-center p-6 sm:p-8 space-y-5">
            {/* Celebration Icon */}
            <div className="mx-auto w-16 h-16 rounded-3xl bg-emerald-100 text-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-bounce duration-1000">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <div className="space-y-1.5">
              <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                Action Completed • {successModal.timestamp}
              </span>
              <h3 className="text-lg font-bold text-slate-900 pt-1">
                {successModal.title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {successModal.summary}
              </p>
            </div>

            {/* Checklist of Completed Actions */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left space-y-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider block">
                Execution Summary:
              </span>
              <div className="space-y-1.5">
                {successModal.clearedItems.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium">{item.label}</span>
                    <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md text-[11px] border border-emerald-100">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Close / Acknowledge Button */}
            <button
              type="button"
              onClick={() => {
                setSuccessModal(prev => ({ ...prev, isOpen: false }));
              }}
              className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-2xl shadow-md transition-colors cursor-pointer"
            >
              Acknowledge & Continue
            </button>
          </div>
        </div>
      )}
      {/* Floating Success Confirmation Badge */}
      {isSaved && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 fade-in duration-300">
          <div className="bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 flex items-center space-x-3.5 max-w-md">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow-md">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h5 className="text-xs font-bold text-white">Configurations Saved & Synced</h5>
              <p className="text-[11px] text-slate-300 truncate">
                Updated brand, tax, currency, and pharmacy settings live across the system.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsSaved(false)}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
