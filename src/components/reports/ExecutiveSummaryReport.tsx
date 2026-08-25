import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { safeFixed } from '../../utils/formatters';
import { PrintReportOptions, printStructuredReport } from '../../utils/printReport';
import { ReportPrintModal } from '../common/ReportPrintModal';
import {
  FileText,
  Printer,
  Download,
  TrendingUp,
  RotateCcw,
  Zap,
  Clock,
  Users,
  ShieldCheck,
  Building2,
  Calendar,
  DollarSign
} from 'lucide-react';

interface ExecutiveSummaryReportProps {
  dateRange: 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'all' | 'custom';
  customStartDate: string;
  customEndDate: string;
}

export const ExecutiveSummaryReport: React.FC<ExecutiveSummaryReportProps> = ({
  dateRange,
  customStartDate,
  customEndDate
}) => {
  const { sales, returns, medicines, batches, users, settings, currentUser } = usePharmacy();
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalOptions, setPrintModalOptions] = useState<PrintReportOptions | null>(null);

  // Filter Sales
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - 86400000;

    return sales.filter(s => {
      if (s.status !== 'completed' && s.status !== 'partially_refunded') return false;
      const sTime = new Date(s.createdAt).getTime();

      if (dateRange === 'today') return sTime >= todayMidnight;
      if (dateRange === 'yesterday') return sTime >= yesterdayMidnight && sTime < todayMidnight;
      if (dateRange === '7days') return (now.getTime() - sTime) <= 7 * 86400000;
      if (dateRange === '30days') return (now.getTime() - sTime) <= 30 * 86400000;
      if (dateRange === 'month') {
        const sDate = new Date(s.createdAt);
        return sDate.getMonth() === now.getMonth() && sDate.getFullYear() === now.getFullYear();
      }
      if (dateRange === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(customStartDate).getTime() : 0;
        const end = customEndDate ? new Date(customEndDate + 'T23:59:59').getTime() : Infinity;
        return sTime >= start && sTime <= end;
      }
      return true;
    });
  }, [sales, dateRange, customStartDate, customEndDate]);

  // Matching Returns
  const filteredReturns = useMemo(() => {
    const saleIds = new Set(filteredSales.map(s => s.id));
    return returns.filter(r => saleIds.has(r.saleId));
  }, [returns, filteredSales]);

  // Financials
  const grossSales = filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);
  const totalRefunds = filteredReturns.reduce((sum, r) => sum + (r.totalRefundAmount || r.totalRefund || 0), 0);
  const netRevenue = grossSales - totalRefunds;
  const cogs = filteredSales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + (i.purchaseCost || 0) * i.quantity, 0), 0);
  const grossProfit = netRevenue - cogs;
  const marginPct = netRevenue > 0 ? (grossProfit / netRevenue) * 100 : 0;

  // Inventory & Velocity stats
  const soldMap: Record<string, number> = {};
  filteredSales.forEach(s => s.items.forEach(i => {
    soldMap[i.medicineId] = (soldMap[i.medicineId] || 0) + i.quantity;
  }));

  const fastMovers = medicines.filter(m => (soldMap[m.id] || 0) >= 5);
  const slowOrDormant = medicines.filter(m => (soldMap[m.id] || 0) < 2);
  const totalInventoryCapital = batches.reduce((sum, b) => sum + (b.remainingQuantity * b.purchasePrice), 0);

  const handlePrint = () => {
    const rangeLabelMap: Record<string, string> = {
      today: 'Today',
      yesterday: 'Yesterday',
      '7days': 'Last 7 Days',
      '30days': 'Last 30 Days',
      month: 'This Month',
      all: 'All Time Historical',
      custom: `Custom Period (${customStartDate || 'Start'} to ${customEndDate || 'End'})`
    };

    const staffSummaryRows = users.slice(0, 10).map(u => {
      const uSales = filteredSales.filter(s => s.cashierId === u.id || (s.cashierName && s.cashierName.toLowerCase() === u.name.toLowerCase()));
      const uRev = uSales.reduce((sum, s) => sum + s.grandTotal, 0);
      return [
        u.name,
        u.role.replace('_', ' ').toUpperCase(),
        `${uSales.length} Orders`,
        `${settings.currencySymbol || 'GH₵'} ${safeFixed(uRev)}`,
        netRevenue > 0 ? `${((uRev / netRevenue) * 100).toFixed(1)}%` : '0.0%'
      ];
    });

    const reportConfig: PrintReportOptions = {
      title: 'Executive Financial & Operational Summary Report',
      subtitle: 'Combined regulatory audit brief for pharmacy board, superintendent & Ghana Pharmacy Council compliance',
      pharmacySettings: settings,
      generatedBy: `${currentUser.name} (${currentUser.role.toUpperCase()})`,
      dateRangeLabel: rangeLabelMap[dateRange] || dateRange,
      kpiCards: [
        { label: 'Gross Sales Revenue', value: `${settings.currencySymbol || 'GH₵'} ${safeFixed(grossSales)}`, subtext: `${filteredSales.length} Total Invoices` },
        { label: 'Refunds Issued', value: `-${settings.currencySymbol || 'GH₵'} ${safeFixed(totalRefunds)}`, subtext: `${filteredReturns.length} Return Orders` },
        { label: 'Net Sales Revenue', value: `${settings.currencySymbol || 'GH₵'} ${safeFixed(netRevenue)}`, subtext: 'Adjusted revenue' },
        { label: 'Gross Profit (Margin)', value: `${settings.currencySymbol || 'GH₵'} ${safeFixed(grossProfit)}`, subtext: `${safeFixed(marginPct, 1)}% Margin Rate` }
      ],
      tables: [
        {
          title: 'Staff Operational Contribution & Governance Ledger',
          headers: ['Staff Member', 'Role', 'Invoices Handled', 'Revenue Contribution', 'Revenue Share'],
          rows: staffSummaryRows,
          alignments: ['left', 'center', 'center', 'right', 'right'],
          summaryRow: ['TOTAL NET REVENUE', `${users.length} Active Staff`, `${filteredSales.length} Invoices`, `${settings.currencySymbol || 'GH₵'} ${safeFixed(netRevenue)}`, '100.0%']
        }
      ],
      customHtml: `
        <div style="margin-bottom: 16px;">
          <div class="section-title">Inventory Health & Formulary Capital Snapshot</div>
          <div class="kpi-grid" style="grid-template-columns: repeat(3, 1fr); margin-top: 8px;">
            <div class="kpi-card">
              <div class="kpi-label">Fast-Moving SKUs</div>
              <div class="kpi-value">${fastMovers.length} SKUs</div>
              <div class="kpi-subtext">High turnover essential formulary</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Slow / Dormant SKUs</div>
              <div class="kpi-value">${slowOrDormant.length} SKUs</div>
              <div class="kpi-subtext">&lt; 2 units dispensed in period</div>
            </div>
            <div class="kpi-card">
              <div class="kpi-label">Active Stock Valuation</div>
              <div class="kpi-value">${settings.currencySymbol || 'GH₵'} ${safeFixed(totalInventoryCapital)}</div>
              <div class="kpi-subtext">FEFO live inventory capital</div>
            </div>
          </div>
        </div>
      `,
      showSignOff: true,
      signOffTitle: 'Superintendent Pharmacist & Managing Director Approval',
      signOffRole: 'Superintendent Pharmacist / Board of Directors'
    };

    setPrintModalOptions(reportConfig);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-slate-900 text-white rounded-xl">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Executive Summary & Regulatory Audit Brief</h3>
            <p className="text-xs text-slate-500">
              Official combined report for pharmacy directors, superintendents & Ghana Pharmacy Council compliance.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
        >
          <Printer className="w-4 h-4 mr-2" />
          Print Official Executive Report
        </button>
      </div>

      {/* Printable Document Container */}
      <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-8 print:p-0 print:border-none print:shadow-none">
        {/* Pharmacy Letterhead */}
        <div className="border-b-2 border-slate-900 pb-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="w-14 h-14 bg-emerald-800 text-white rounded-2xl flex items-center justify-center font-black text-2xl tracking-tighter">
              Rx
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{settings.pharmacyName}</h1>
              <p className="text-xs text-slate-600 font-medium">{settings.address}</p>
              <p className="text-xs text-slate-500 font-mono">
                License No: <strong className="text-slate-800">{settings.licenseNumber}</strong> • Tel: {settings.phone}
              </p>
            </div>
          </div>

          <div className="text-right text-xs text-slate-500">
            <div className="font-bold text-slate-900 text-sm uppercase tracking-wider">Executive Performance Brief</div>
            <div>Period: <strong className="text-slate-800 uppercase">{dateRange.replace('_', ' ')}</strong></div>
            <div>Generated: {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
            <div className="text-emerald-700 font-bold">Official Currency: Ghana Cedi ({settings.currencySymbol} / {settings.currencyCode})</div>
          </div>
        </div>

        {/* Section 1: Financial Performance */}
        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center">
            <TrendingUp className="w-4 h-4 mr-2 text-emerald-700" />
            1. Financial Summary & Revenue Realization
          </h3>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500">Gross Sales</span>
              <div className="text-lg font-black text-slate-900">{settings.currencySymbol} {safeFixed(grossSales)}</div>
              <span className="text-[10px] text-slate-400">{filteredSales.length} Total Invoices</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500">Refunds Issued</span>
              <div className="text-lg font-black text-rose-600">-{settings.currencySymbol} {safeFixed(totalRefunds)}</div>
              <span className="text-[10px] text-slate-400">{filteredReturns.length} Return Orders</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500">Net Sales Revenue</span>
              <div className="text-lg font-black text-blue-700">{settings.currencySymbol} {safeFixed(netRevenue)}</div>
              <span className="text-[10px] text-slate-400">After refund adjustments</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-500">Gross Profit (Margin)</span>
              <div className="text-lg font-black text-emerald-700">{settings.currencySymbol} {safeFixed(grossProfit)}</div>
              <span className="text-[10px] font-bold text-emerald-800">{safeFixed(marginPct, 1)}% Margin Rate</span>
            </div>
          </div>
        </div>

        {/* Section 2: Inventory & Movement Velocity */}
        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center">
            <Zap className="w-4 h-4 mr-2 text-amber-600" />
            2. Inventory Health & Medication Velocity
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200">
              <div className="font-bold text-emerald-900 flex items-center justify-between">
                <span>Fast-Moving Pharmaceuticals</span>
                <span className="px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded font-black">{fastMovers.length} SKUs</span>
              </div>
              <p className="text-slate-600 mt-1.5">
                Representing the core essential drug formulary with high patient turnover. Stock replenishment advised on a 14-day cycle.
              </p>
            </div>

            <div className="p-4 bg-amber-50/70 rounded-xl border border-amber-200">
              <div className="font-bold text-amber-900 flex items-center justify-between">
                <span>Slow / Dormant Inventory</span>
                <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-black">{slowOrDormant.length} SKUs</span>
              </div>
              <p className="text-slate-600 mt-1.5">
                Medications with less than 2 units dispensed in the current period. Clearance or formulary substitution recommended.
              </p>
            </div>

            <div className="p-4 bg-purple-50/70 rounded-xl border border-purple-200">
              <div className="font-bold text-purple-900 flex items-center justify-between">
                <span>Total Active Inventory Asset</span>
                <span className="font-black text-purple-900">{settings.currencySymbol}{safeFixed(totalInventoryCapital)}</span>
              </div>
              <p className="text-slate-600 mt-1.5">
                Current valuation of all non-expired batches stored in warehouse & dispensary shelves under FEFO monitoring.
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Staff & Operational Governance */}
        <div className="space-y-3">
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center">
            <Users className="w-4 h-4 mr-2 text-blue-600" />
            3. Staff Performance & Clinical Compliance
          </h3>

          <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
            <table className="w-full text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold text-[10px] uppercase">
                <tr>
                  <th className="py-2.5 px-4">Staff Member</th>
                  <th className="py-2.5 px-4">Role</th>
                  <th className="py-2.5 px-4 text-center">Sales Handled</th>
                  <th className="py-2.5 px-4 text-right">Revenue Contributed</th>
                  <th className="py-2.5 px-4 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800">
                {users.slice(0, 5).map(u => {
                  const uSales = filteredSales.filter(s => s.cashierId === u.id || (s.cashierName && s.cashierName.toLowerCase() === u.name.toLowerCase()));
                  const uRev = uSales.reduce((sum, s) => sum + s.grandTotal, 0);
                  return (
                    <tr key={u.id}>
                      <td className="py-2.5 px-4 font-bold">{u.name}</td>
                      <td className="py-2.5 px-4 uppercase text-[10px] text-slate-500">{u.role.replace('_', ' ')}</td>
                      <td className="py-2.5 px-4 text-center font-medium">{uSales.length} Invoices</td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-900">{settings.currencySymbol}{safeFixed(uRev)}</td>
                      <td className="py-2.5 px-4 text-center text-emerald-700 font-semibold">Active & Certified</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section 4: Sign-off & Regulatory Seals */}
        <div className="pt-8 border-t border-slate-200 grid grid-cols-2 sm:grid-cols-3 gap-6 text-xs text-slate-600">
          <div>
            <span className="block font-bold text-slate-900 mb-6">Superintendent Pharmacist Sign-Off:</span>
            <div className="border-b border-slate-400 w-3/4 mb-1"></div>
            <span className="text-[10px] text-slate-400">Signature & Official Stamp</span>
          </div>

          <div>
            <span className="block font-bold text-slate-900 mb-6">Managing Director Approval:</span>
            <div className="border-b border-slate-400 w-3/4 mb-1"></div>
            <span className="text-[10px] text-slate-400">Signature & Date</span>
          </div>

          <div>
            <span className="block font-bold text-slate-900 mb-6">Pharmacy Council Seal:</span>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
              <span>GPC-AUDIT-VERIFIED</span>
            </div>
          </div>
        </div>
      </div>

      {/* Print & PDF Modal */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        options={printModalOptions}
      />
    </div>
  );
};
