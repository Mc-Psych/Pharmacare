import React from 'react';
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
  Workflow
} from 'lucide-react';

export const SystemDocsView: React.FC = () => {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900">PharmaCare Pharmacy • Technical Specs & RBAC Matrix</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly restricted to Administrators. Ghana Cedi (GH₵ / GHS) Financials, FEFO Engine, Global RBAC Governance & REST APIs.
            </p>
          </div>
        </div>
      </div>

      {/* 1. Offline-First Continuity Architecture */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center">
          <Cpu className="w-4 h-4 mr-2 text-emerald-600" />
          1. Offline-First Architectural Architecture
        </h3>
        <p className="text-xs text-slate-600 leading-relaxed">
          The system is architected for <strong>100% operational autonomy offline</strong> without internet dependency. All transactional state, inventory mutations, prescription records, and audit events are immediately written to local persistent browser storage and synced in-memory. In enterprise deployments, an embedded local Express server serves static assets and endpoints on local intranet ports (e.g. <code>localhost:3000</code> or local LAN IP).
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="font-bold text-xs text-slate-900">Zero Internet Dependency</span>
            <p className="text-[11px] text-slate-500">POS checkout, receipt thermal rendering, and FEFO inventory deduction run locally on the workstation.</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="font-bold text-xs text-slate-900">Deterministic FEFO Logic</span>
            <p className="text-[11px] text-slate-500">Earliest expiration batches are automatically identified and locked during dispensing.</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1">
            <span className="font-bold text-xs text-slate-900">Encrypted Backups</span>
            <p className="text-[11px] text-slate-500">Single-file JSON database export/import with validation checksums for air-gapped backups (Admin only).</p>
          </div>
        </div>
      </div>

      {/* 2. FEFO & Clinical Safety Engine */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center">
          <Workflow className="w-4 h-4 mr-2 text-emerald-600" />
          2. FEFO (First-Expired, First-Out) & Allergy Safeguard Protocols
        </h3>
        <div className="space-y-2 text-xs text-slate-600 leading-relaxed">
          <p>
            <strong>Batch Sorting Heuristic:</strong> When a medication is added to POS cart or prescription dispensing, the system evaluates all active batches for that medication:
          </p>
          <pre className="p-3.5 bg-slate-900 text-emerald-400 font-mono text-[11px] rounded-lg overflow-x-auto">
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
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center">
          <Shield className="w-4 h-4 mr-2 text-emerald-600" />
          3. Security, Multi-Role Access Control & Audit Immutability
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900">Administrator</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Full access to system settings, database snapshots, staff accounts, RBAC Permission Matrix editing, and audit trail.</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900">Pharmacist</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Authorized for prescription verification, medicine formulary setup, clinical dispensing, and sales returns/refunds.</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900">Dispensing Assistant</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Can dispense prescriptions & operate POS. Restricted from setting up new medicines or adjusting stock.</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900">Cashier</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Restricted to POS checkout, cash receipt printing, and saving held carts. Cannot register prescriptions or load them to cart.</p>
          </div>
          <div className="p-3.5 bg-slate-50 rounded-lg border border-slate-200">
            <span className="font-bold text-slate-900">Storekeeper</span>
            <p className="text-[11px] text-slate-500 mt-0.5">Manages supplier purchase orders, physical inbound goods receipt, batch expiry inspection, and stock counts.</p>
          </div>
        </div>
      </div>

      {/* 4. External REST API Endpoints Specification */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center">
            <Code2 className="w-4 h-4 mr-2 text-emerald-600" />
            4. External Inventory & ERP Integration REST APIs
          </h3>
          <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md font-mono border border-emerald-200">
            Express /api/v1
          </span>
        </div>

        <div className="space-y-2.5">
          <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 bg-emerald-600 text-white font-bold rounded-md text-[10px]">GET</span>
              <span className="text-white font-bold">/api/v1/medicines</span>
            </div>
            <p className="text-slate-400 text-[10px]">Retrieve formulary list with current aggregated stock quantities.</p>
          </div>

          <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 bg-blue-600 text-white font-bold rounded-md text-[10px]">POST</span>
              <span className="text-white font-bold">/api/v1/sales/checkout</span>
            </div>
            <p className="text-slate-400 text-[10px]">Submit external transaction with automatic FEFO batch inventory deduction.</p>
          </div>

          <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] space-y-1">
            <div className="flex items-center space-x-2">
              <span className="px-1.5 py-0.5 bg-amber-600 text-white font-bold rounded-md text-[10px]">GET</span>
              <span className="text-white font-bold">/api/v1/inventory/alerts</span>
            </div>
            <p className="text-slate-400 text-[10px]">Poll low-stock items and batches nearing or exceeding expiration date.</p>
          </div>

          <div className="p-3 bg-slate-900 text-slate-200 rounded-lg font-mono text-[11px] space-y-1">
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
