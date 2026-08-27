import React, { useState } from 'react';
import {
  BookOpen,
  Server,
  Shield,
  Layers,
  Code2,
  Lock,
  Boxes,
  Database,
  Cpu,
  CheckCircle2,
  Workflow,
  RotateCcw,
  Download,
  Upload,
  AlertTriangle,
  FileSpreadsheet,
  Pill,
  ShoppingCart,
  Truck,
  UserCheck,
  Image as ImageIcon,
  KeyRound,
  ShieldAlert,
  HelpCircle,
  Search,
  Check,
  ChevronRight,
  Sparkles,
  RefreshCw,
  Printer
} from 'lucide-react';

interface CriticalActionDoc {
  id: string;
  title: string;
  badge: string;
  badgeColor: string;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
  category: 'Database & Disaster Recovery' | 'Inventory & Batch Management' | 'Clinical & Point of Sale' | 'Security, RBAC & Identity';
  purpose: string;
  impact: string[];
  prerequisites: string[];
  auditLogged: boolean;
  reversible: boolean;
  safeguards: string;
  steps: string[];
}

export const SystemDocsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedActionId, setExpandedActionId] = useState<string | null>('action-reset');

  const criticalActions: CriticalActionDoc[] = [
    {
      id: 'action-reset',
      title: 'Seed Factory Reset & Complete Database Wipe',
      badge: 'Critical High-Risk',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-200',
      icon: RotateCcw,
      iconColor: 'text-rose-600 bg-rose-50',
      category: 'Database & Disaster Recovery',
      purpose:
        'Resets all active transactional databases, sales histories, purchase orders, customer ledgers, and inventory mutations back to the official NHIS demonstration baseline.',
      impact: [
        'Permanently wipes all POS Sales, Invoices, Held Carts, and Cashier Shift histories.',
        'Wipes all Purchase Orders, Inbound GRNs, and Supplier balances.',
        'Wipes all Prescriptions, Dispensing logs, and Clinical Consultations.',
        'Purges all custom staff user accounts and restores default Administrator (Courage Kay).',
        'Reseeds the standardized Ghana NHIS Medicine Formulary with baseline active batches.'
      ],
      prerequisites: [
        'Must be logged in with Administrator role privileges.',
        'Strongly recommended to export an encrypted JSON backup file before initiating.',
        'Requires explicit confirmation dialog acknowledgement.'
      ],
      auditLogged: true,
      reversible: false,
      safeguards:
        'Requires browser confirmation. If triggered accidentally without a prior JSON backup, transactional data cannot be recovered.',
      steps: [
        'Navigate to System Settings -> Offline Database Snapshot & Recovery.',
        'Click the "Seed Factory Reset" button (highlighted in red).',
        'Confirm the system warning modal prompt.',
        'The terminal re-initializes all tables and refreshes the application automatically.'
      ]
    },
    {
      id: 'action-backup-restore',
      title: 'Offline JSON Database Backup & Disaster Recovery',
      badge: 'Air-Gapped Recovery',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: Database,
      iconColor: 'text-indigo-600 bg-indigo-50',
      category: 'Database & Disaster Recovery',
      purpose:
        'Provides single-click zero-dependency export and atomic ingestion of the entire pharmacy database state (Medicines, Batches, Sales, Prescriptions, Audit Logs, Settings, Users, RBAC matrix).',
      impact: [
        'Export creates a timestamped, sanitized JSON payload containing all application state.',
        'Restore performs schema validation and atomically replaces active browser storage and Firestore documents.',
        'Refreshes in-memory state without requiring server restarts or database migrations.'
      ],
      prerequisites: [
        'Administrator role required for both export and restore operations.',
        'Restoration file must be a valid JSON backup exported from PharmaCare PMS.'
      ],
      auditLogged: true,
      reversible: true,
      safeguards:
        'Restore verifies payload structure integrity before applying. Rejects corrupted or non-schema JSON files.',
      steps: [
        'To Export: Go to System Settings and click "Export Offline Backup" to download the .json file.',
        'To Restore: Click "Select Backup File", choose your saved .json file, and confirm prompt.',
        'The database replaces all local and cloud state and reloads the terminal session.'
      ]
    },
    {
      id: 'action-stock-adjustment',
      title: 'Inventory Stock Adjustment & Discard / Disposal Logs',
      badge: 'Inventory Audit',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: Boxes,
      iconColor: 'text-amber-600 bg-amber-50',
      category: 'Inventory & Batch Management',
      purpose:
        'Reconciles physical count variances or writes off damaged, expired, or stolen pharmaceuticals from active batch stock.',
      impact: [
        'Mutates the exact remaining quantity of the targeted pharmaceutical batch.',
        'Creates an immutable Stock Movement entry (ADJUSTMENT_IN, ADJUSTMENT_OUT, DAMAGE_DISPOSAL, or EXPIRED_DISPOSAL).',
        'Updates inventory valuation metrics, low-stock threshold triggers, and fast/slow-moving reports.'
      ],
      prerequisites: [
        'Requires "adjust_inventory" permission (Admin, Pharmacist, or Storekeeper).',
        'Mandatory reason selection (Damaged, Expired Disposal, Lost/Theft, Discrepancy, Correction).'
      ],
      auditLogged: true,
      reversible: false,
      safeguards:
        'Prevents negative remaining quantity adjustments unless "Allow Negative Stock" is explicitly enabled in Settings.',
      steps: [
        'Go to Inventory Management -> Select Medicine -> Click Adjust Stock.',
        'Select specific Batch Number and enter New Physical Count or adjustment delta.',
        'Select official Adjustment Reason and enter authorization notes.',
        'Submit to commit the change to the stock movement ledger.'
      ]
    },
    {
      id: 'action-prescription-dispense',
      title: 'Clinical Prescription Verification & Safety Dispensing Gate',
      badge: 'Clinical Compliance',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: Pill,
      iconColor: 'text-emerald-600 bg-emerald-50',
      category: 'Clinical & Point of Sale',
      purpose:
        'Enforces clinical oversight by verifying medical prescriptions against patient allergy profiles and loading verified orders directly into the POS cart.',
      impact: [
        'Scans drug molecules against patient allergies and active chronic conditions, rendering high-contrast warning alerts.',
        'Updates prescription status from "pending" to "partial" or "dispensed".',
        'Transfers prescribed items to the POS Checkout cart with deterministic FEFO batch locking.'
      ],
      prerequisites: [
        'Requires "dispense_prescriptions" or "register_prescriptions" permissions.',
        'Prescription must have valid doctor/clinic details and active customer assignment.'
      ],
      auditLogged: true,
      reversible: true,
      safeguards:
        'Prevents duplicate dispensing of already finalized prescriptions. Enforces pharmacist sign-off.',
      steps: [
        'Navigate to Prescriptions tab -> Open Pending Prescription.',
        'Review items, patient allergy warnings, and dosage directions.',
        'Click "Verify & Load to POS Cart" or "Dispense Medication".',
        'Proceed to POS view where customer and prescribed items are automatically locked for checkout.'
      ]
    },
    {
      id: 'action-pos-checkout',
      title: 'Point-of-Sale Real-Time FEFO Checkout & Invoice Finalization',
      badge: 'Financial & Stock Deduction',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-200',
      icon: ShoppingCart,
      iconColor: 'text-teal-600 bg-teal-50',
      category: 'Clinical & Point of Sale',
      purpose:
        'Processes over-the-counter and prescription retail sales, automatically deducting physical stock via deterministic FEFO (First-Expired, First-Out).',
      impact: [
        'Deducts exact item quantities from the earliest unexpired batch.',
        'Generates an immutable Invoice Number (e.g. INV-2026-XXXX) with Ghana Cedi (GH₵) tax and discount breakdown.',
        'Triggers printable thermal receipt modal with facility brand logo and QR/barcode.',
        'Updates daily sales financial analytics, revenue charts, and staff sales metrics.'
      ],
      prerequisites: [
        'Requires "access_pos" and "receive_payment" permissions.',
        'Adequate batch stock must exist for all cart items.'
      ],
      auditLogged: true,
      reversible: false,
      safeguards:
        'Automatic change calculation, tender validation, and multi-tender support (Cash, Card, Mobile Money, Insurance).',
      steps: [
        'Scan barcode or select medicines into the POS cart.',
        'Select Customer (or Guest Walk-in) and apply discounts/NHIS coverage if applicable.',
        'Click "Complete Payment" -> Select Tender Method -> Enter Amount Tendered.',
        'Finalize sale to trigger receipt printing and instant batch deduction.'
      ]
    },
    {
      id: 'action-returns-refunds',
      title: 'Sales Returns & Product Refunds Processing',
      badge: 'Financial & Re-Stock',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      icon: RotateCcw,
      iconColor: 'text-indigo-600 bg-indigo-50',
      category: 'Clinical & Point of Sale',
      purpose:
        'Manages customer merchandise returns, clinical adverse reaction reports, and handles restockable vs damaged inventory write-offs.',
      impact: [
        'Calculates refund amount and updates the original sale record status to "refunded" or "partially_refunded".',
        'If item condition is marked "Restockable", the quantity is re-credited to the exact batch number with a RETURN stock movement.',
        'If item is marked "Damaged/Expired", stock is written off to prevent hazardous re-dispensing.',
        'Updates Returns & Refunds financial audit reports.'
      ],
      prerequisites: [
        'Requires "manage_returns" permission (Administrator or Pharmacist).',
        'Valid original invoice lookup.'
      ],
      auditLogged: true,
      reversible: false,
      safeguards:
        'Prevents refunding more units than originally purchased. Mandatory reason selection.',
      steps: [
        'Navigate to Returns & Refunds tab -> Search original Invoice Number.',
        'Select items to return, return quantities, condition (Restockable / Damaged), and reason.',
        'Enter customer refund payment method and process return.',
        'Print return receipt and review updated batch stock.'
      ]
    },
    {
      id: 'action-inbound-grn',
      title: 'Purchase Order Inbound Receipt & Dynamic Batch Ingestion (GRN)',
      badge: 'Goods Receipt',
      badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      icon: Truck,
      iconColor: 'text-emerald-600 bg-emerald-50',
      category: 'Inventory & Batch Management',
      purpose:
        'Receives supplier shipments against approved Purchase Orders and automatically registers new active batches in the formulary.',
      impact: [
        'Creates new `MedicineBatch` records with unique batch numbers, manufacturing dates, and FEFO expiry dates.',
        'Increases total sellable stock for each medicine.',
        'Updates purchase cost pricing and recommended selling price based on default markup percentage.',
        'Generates PURCHASE stock movement entries and marks PO as "received".'
      ],
      prerequisites: [
        'Requires "manage_purchases" permission (Admin or Storekeeper).',
        'Valid Supplier assignment and purchase cost details.'
      ],
      auditLogged: true,
      reversible: false,
      safeguards:
        'Expiry date validation ensures receiving dates precede expiration dates by minimum safety thresholds.',
      steps: [
        'Go to Purchases & Inbound Orders -> Open Approved PO.',
        'Click "Receive Inbound Goods (GRN)".',
        'Verify received quantities, enter supplier batch numbers, and verify expiration dates.',
        'Confirm receipt to inject batches into active dispensing stock.'
      ]
    },
    {
      id: 'action-rbac-management',
      title: 'Global RBAC Permission Matrix & Staff Account Governance',
      badge: 'Security Governance',
      badgeColor: 'bg-slate-100 text-slate-800 border-slate-200',
      icon: UserCheck,
      iconColor: 'text-slate-700 bg-slate-100',
      category: 'Security, RBAC & Identity',
      purpose:
        'Controls system access across 19 granular permission keys, enforces multi-role policies, handles account suspensions, and manages first-login password changes.',
      impact: [
        'Modifies global access matrix for Administrator, Pharmacist, Dispensing Assistant, Cashier, and Storekeeper roles.',
        'Supports granular custom permission overrides for specific individual staff accounts.',
        'Suspends or activates user credentials instantly.',
        'Enforces mandatory password resets upon initial staff login.'
      ],
      prerequisites: [
        'Restricted strictly to Administrator role.',
        'Cannot revoke Administrator own access.'
      ],
      auditLogged: true,
      reversible: true,
      safeguards:
        'Admin account permissions are protected from self-lockout. All permission changes are logged to the immutable audit trail.',
      steps: [
        'Go to User & Staff Management -> RBAC Permission Matrix.',
        'Toggle permissions per role or select individual user for custom overrides.',
        'To force password reset on next login, toggle "Require Password Change on Next Login" in user profile modal.',
        'Save changes to apply immediately across all terminal sessions.'
      ]
    },
    {
      id: 'action-bulk-upload',
      title: 'Bulk Medicine Catalog Ingestion (Excel / CSV)',
      badge: 'Catalog Ingestion',
      badgeColor: 'bg-blue-100 text-blue-800 border-blue-200',
      icon: FileSpreadsheet,
      iconColor: 'text-blue-600 bg-blue-50',
      category: 'Inventory & Batch Management',
      purpose:
        'Imports large pharmaceutical catalogs from external spreadsheets into the standardized formulary schema.',
      impact: [
        'Validates mandatory fields (Code, Name, Generic Name, Form, Category, Price, Expiry, Initial Stock).',
        'Auto-maps dosage forms (Tablet, Capsule, Syrup, Injection, etc.) and Ghana NHIS tariff classifications.',
        'Generates initial stock batches automatically for newly ingested items.'
      ],
      prerequisites: [
        'Requires "manage_medicines" permission.',
        'File must be valid CSV or XLSX format matching template headers.'
      ],
      auditLogged: true,
      reversible: false,
      safeguards:
        'Provides preview table and skips malformed rows with detailed error reporting.',
      steps: [
        'Go to Medicine Formulary -> Click "Bulk Import CSV/Excel".',
        'Download the standard sample template.',
        'Upload your formatted file -> Review detected items and validation status.',
        'Click "Import Medicines" to ingest items into the database.'
      ]
    },
    {
      id: 'action-brand-logo-compression',
      title: 'System Brand Customization & Canvas Compression Engine',
      badge: 'Visual Identity',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
      icon: ImageIcon,
      iconColor: 'text-purple-600 bg-purple-50',
      category: 'Security, RBAC & Identity',
      purpose:
        'Customizes facility branding, logo emblems, receipt slogans, and tax settings with built-in client-side canvas compression to prevent browser storage quota overflows.',
      impact: [
        'Scales uploaded raster images to optimal 240x240px dimensions and compresses them into high-efficiency WebP/PNG formats (~15KB).',
        'Synchronizes custom emblem across Top Navigation, Dark Sidebar, POS Thermal Receipts, and PDF Reports.',
        'Guarantees zero QuotaExceededError crashes in local browser storage.'
      ],
      prerequisites: [
        'Administrator role required.',
        'Image file must be valid PNG, JPG, SVG, or WebP.'
      ],
      auditLogged: true,
      reversible: true,
      safeguards:
        'Safe storage wrapper automatically catches storage exceptions and prevents application downtime.',
      steps: [
        'Go to System Settings -> System Brand Logo & Visual Identity.',
        'Upload your custom pharmacy image file or select a pre-made vector emblem.',
        'Review the instant live preview on receipts and navigation.',
        'Click "Save Brand & Configuration Changes".'
      ]
    },
    {
      id: 'action-quick-fill-demo',
      title: 'Quick Fill Demo & Terminal Authentication Policies',
      badge: 'Terminal Security',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
      icon: Sparkles,
      iconColor: 'text-amber-600 bg-amber-50',
      category: 'Security, RBAC & Identity',
      purpose:
        'Governs terminal login security. When disabled (default for production), staff must enter valid credentials; when enabled by Admin, 1-click fast login buttons appear for training and onboarding.',
      impact: [
        'Default state: Disabled (Production Mode) — login terminal displays clean, secure credential entry with pharmacy branding.',
        'Enabled state: Demo Mode — 1-click staff selector displays for rapid role switching and feature testing.',
        'Admin can toggle this setting on/off anytime from System Settings or directly on the login screen.'
      ],
      prerequisites: [
        'Administrator role privilege to manage in System Settings.',
        'Credentials required when in Production Mode.'
      ],
      auditLogged: true,
      reversible: true,
      safeguards:
        'Production mode hides 1-click shortcuts to protect clinical workspaces from unauthorized counter access.',
      steps: [
        'To Enable/Disable in Settings: Go to System Settings -> Terminal Authentication & Demo Settings -> Toggle "Quick Fill Demo".',
        'To Toggle on Login Screen: Click "Enable Quick Fill Demo" or "Disable Demo Mode" at the bottom of the login card.',
        'Changes take effect immediately across all terminal sessions.'
      ]
    }
  ];

  const categories = [
    'all',
    'Database & Disaster Recovery',
    'Inventory & Batch Management',
    'Clinical & Point of Sale',
    'Security, RBAC & Identity'
  ];

  const filteredActions = criticalActions.filter((action) => {
    const matchesCategory = selectedCategory === 'all' || action.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === '' ||
      action.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.purpose.toLowerCase().includes(searchQuery.toLowerCase()) ||
      action.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-3.5">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-xl font-bold text-slate-900">PharmaCare Technical Specs & System Documentation</h2>
                <span className="px-2.5 py-0.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full">
                  Admin Master Guide
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Ghana Cedi (GH₵ / GHS) Financials, FEFO Engine, Critical Operational Actions, Security Governance & REST APIs.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="inline-flex items-center px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4 mr-1.5 text-slate-600" />
              Print Guide
            </button>
          </div>
        </div>
      </div>

      {/* SECTION A: CRITICAL ACTIONS OPERATIONAL DIRECTORY */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-5">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Critical Actions & System Features Guide</h3>
              <p className="text-xs text-slate-500">
                Detailed explanations, impacts, prerequisites, and recovery protocols for all high-impact system operations.
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search critical actions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap gap-2 pt-1">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedCategory === cat
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat === 'all' ? 'All Critical Actions' : cat}
            </button>
          ))}
        </div>

        {/* Actions Accordion / Card List */}
        <div className="space-y-4 pt-2">
          {filteredActions.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs">
              No critical action matching "{searchQuery}" in category "{selectedCategory}".
            </div>
          ) : (
            filteredActions.map((action) => {
              const Icon = action.icon;
              const isExpanded = expandedActionId === action.id;

              return (
                <div
                  key={action.id}
                  className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                    isExpanded
                      ? 'border-emerald-300 bg-white shadow-md ring-1 ring-emerald-500/20'
                      : 'border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300'
                  }`}
                >
                  {/* Header Row */}
                  <button
                    type="button"
                    onClick={() => setExpandedActionId(isExpanded ? null : action.id)}
                    className="w-full p-4 sm:p-5 flex items-center justify-between text-left cursor-pointer"
                  >
                    <div className="flex items-center space-x-3.5 min-w-0 pr-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${action.iconColor}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900 truncate">
                            {action.title}
                          </h4>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-md border ${action.badgeColor}`}>
                            {action.badge}
                          </span>
                          <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-md">
                            {action.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">
                          {action.purpose}
                        </p>
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center space-x-2">
                      <span className="text-[11px] font-bold text-emerald-600 hidden sm:inline">
                        {isExpanded ? 'Hide Details' : 'View Full Guide'}
                      </span>
                      <ChevronRight
                        className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                          isExpanded ? 'rotate-90 text-emerald-600' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Expanded Content */}
                  {isExpanded && (
                    <div className="px-5 pb-6 pt-2 border-t border-slate-100 space-y-5 text-xs text-slate-700 animate-in fade-in duration-200">
                      {/* Summary Box */}
                      <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Operational Purpose & Scope
                        </span>
                        <p className="text-xs text-slate-800 font-medium leading-relaxed">
                          {action.purpose}
                        </p>
                      </div>

                      {/* Two Column Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Scope of Impact */}
                        <div className="p-4 bg-rose-50/40 rounded-xl border border-rose-100 space-y-2">
                          <h5 className="font-bold text-rose-900 flex items-center text-xs">
                            <AlertTriangle className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
                            Direct Scope of Impact
                          </h5>
                          <ul className="space-y-1.5 text-[11px] text-slate-700">
                            {action.impact.map((imp, idx) => (
                              <li key={idx} className="flex items-start">
                                <span className="text-rose-500 mr-2 font-bold">•</span>
                                <span>{imp}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        {/* Prerequisites & Security Governance */}
                        <div className="p-4 bg-emerald-50/40 rounded-xl border border-emerald-100 space-y-2">
                          <h5 className="font-bold text-emerald-900 flex items-center text-xs">
                            <Shield className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                            Prerequisites & Governance
                          </h5>
                          <ul className="space-y-1.5 text-[11px] text-slate-700">
                            {action.prerequisites.map((pre, idx) => (
                              <li key={idx} className="flex items-start">
                                <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-600 shrink-0 mt-0.5" />
                                <span>{pre}</span>
                              </li>
                            ))}
                          </ul>
                          <div className="pt-2 flex items-center space-x-3 text-[10px] text-slate-500 font-semibold border-t border-emerald-100">
                            <span>Audit Trail Logged: {action.auditLogged ? '✓ Yes (Immutable)' : 'No'}</span>
                            <span>Reversible: {action.reversible ? '✓ Yes' : '✗ No'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Step-by-Step Procedure */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                          Step-by-Step Execution Procedure
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          {action.steps.map((step, idx) => (
                            <div
                              key={idx}
                              className="p-3 bg-white rounded-xl border border-slate-200 text-[11px] space-y-1"
                            >
                              <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[10px] font-bold">
                                {idx + 1}
                              </span>
                              <p className="text-slate-700 font-medium">{step}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Safeguards Note */}
                      <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-900 text-[11px] flex items-start space-x-2">
                        <HelpCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <div>
                          <strong>Safety Advisory & Safeguards: </strong>
                          {action.safeguards}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* SECTION B: CORE ARCHITECTURAL SPECIFICATIONS */}
      {/* 1. Offline-First Continuity Architecture */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center">
          <Cpu className="w-4 h-4 mr-2 text-emerald-600" />
          1. Offline-First Continuity Architecture & Quota Fault Tolerance
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          The system is architected for <strong>100% operational autonomy offline</strong> without mandatory cloud internet dependency. All transactional state, inventory mutations, prescription records, and audit events are immediately written to local persistent browser storage and synced in-memory. In enterprise deployments, an embedded local Express server serves static assets and endpoints on local intranet ports (e.g. <code>localhost:3000</code> or local LAN IP).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="font-bold text-xs text-slate-900">Zero Internet Downtime</span>
            <p className="text-[11px] text-slate-500">POS checkout, thermal receipt rendering, and FEFO inventory deduction run locally on the workstation.</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="font-bold text-xs text-slate-900">Safe Storage Manager</span>
            <p className="text-[11px] text-slate-500">Auto-traps browser storage quota exceptions, automatically compresses custom logos, and purges non-critical caches.</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
            <span className="font-bold text-xs text-slate-900">Encrypted Backups</span>
            <p className="text-[11px] text-slate-500">Single-file JSON database export/import with validation checksums for air-gapped backups (Admin only).</p>
          </div>
        </div>
      </div>

      {/* 2. FEFO & Clinical Safety Engine */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center">
          <Workflow className="w-4 h-4 mr-2 text-emerald-600" />
          2. FEFO (First-Expired, First-Out) & Allergy Safeguard Protocols
        </h3>
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            <strong>Batch Sorting Heuristic:</strong> When a medication is added to POS cart or prescription dispensing, the system evaluates all active batches for that medication:
          </p>
          <pre className="p-3.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-xl overflow-x-auto">
{`// FEFO Batch Selection Algorithm
const eligibleBatches = batches
  .filter(b => b.medicineId === medId && b.remainingQuantity > 0 && new Date(b.expiryDate) > new Date())
  .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());

return eligibleBatches[0]; // Earliest unexpired batch`}
          </pre>
          <p>
            <strong>Allergy Cross-Validation:</strong> Patient clinical profiles are scanned against drug molecules during POS addition. If an allergy match is detected (e.g. Penicillin allergy vs Amoxicillin prescription), the system renders a prominent clinical warning banner.
          </p>
        </div>
      </div>

      {/* 3. Role-Based Access Control (RBAC) */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center">
          <Shield className="w-4 h-4 mr-2 text-emerald-600" />
          3. Security, Multi-Role Access Control & Audit Immutability
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="font-bold text-slate-900">Administrator</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Full access to system settings, database snapshots, staff accounts, RBAC Permission Matrix editing, and audit trail.</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="font-bold text-slate-900">Pharmacist</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Authorized for prescription verification, medicine formulary setup, clinical dispensing, and sales returns/refunds.</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="font-bold text-slate-900">Dispensing Assistant</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Can dispense prescriptions & operate POS. Restricted from setting up new medicines or adjusting stock.</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="font-bold text-slate-900">Cashier</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Restricted to POS checkout, cash receipt printing, and saving held carts. Cannot register prescriptions or load them to cart.</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <span className="font-bold text-slate-900">Storekeeper</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Manages supplier purchase orders, physical inbound goods receipt, batch expiry inspection, and stock counts.</p>
          </div>
        </div>
      </div>

      {/* 4. External REST API Endpoints Specification */}
      <div className="bg-white p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center">
            <Code2 className="w-4 h-4 mr-2 text-emerald-600" />
            4. External Inventory & ERP Integration REST APIs
          </h3>
          <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md font-mono border border-emerald-200">
            Express /api/v1
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 bg-emerald-600 text-white font-bold rounded-md text-[10px]">GET</span>
              <span className="text-white font-bold">/api/v1/medicines</span>
            </div>
            <p className="text-slate-400 text-[10px]">Retrieve formulary list with current aggregated stock quantities.</p>
          </div>

          <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 bg-blue-600 text-white font-bold rounded-md text-[10px]">POST</span>
              <span className="text-white font-bold">/api/v1/sales/checkout</span>
            </div>
            <p className="text-slate-400 text-[10px]">Submit external transaction with automatic FEFO batch inventory deduction.</p>
          </div>

          <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 bg-amber-600 text-white font-bold rounded-md text-[10px]">GET</span>
              <span className="text-white font-bold">/api/v1/inventory/alerts</span>
            </div>
            <p className="text-slate-400 text-[10px]">Poll low-stock items and batches nearing or exceeding expiration date.</p>
          </div>

          <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 bg-purple-600 text-white font-bold rounded-md text-[10px]">POST</span>
              <span className="text-white font-bold">/api/v1/purchases/inbound</span>
            </div>
            <p className="text-slate-400 text-[10px]">Ingest supplier shipments and automatically register new pharmaceutical batches.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
