import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { ReturnOrder, ReturnItem } from '../../types';
import { safeFixed } from '../../utils/formatters';
import { PrintReportOptions, printStructuredReport } from '../../utils/printReport';
import { ReportPrintModal } from '../common/ReportPrintModal';
import {
  RotateCcw,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  DollarSign,
  Package,
  Calendar,
  Eye,
  X,
  ShieldAlert,
  ArrowDownRight,
  TrendingDown
} from 'lucide-react';

interface ReturnsRefundsReportProps {
  dateRange: 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'all' | 'custom';
  setDateRange: (range: 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'all' | 'custom') => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
}

export const ReturnsRefundsReport: React.FC<ReturnsRefundsReportProps> = ({
  dateRange,
  setDateRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate
}) => {
  const { returns, sales, settings, currentUser } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedReasonFilter, setSelectedReasonFilter] = useState('all');
  const [selectedRestockFilter, setSelectedRestockFilter] = useState('all');
  const [selectedReturnDetail, setSelectedReturnDetail] = useState<ReturnOrder | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalOptions, setPrintModalOptions] = useState<PrintReportOptions | null>(null);

  // Filter returns by selected date range
  const filteredReturns = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - 86400000;

    return returns.filter(r => {
      const rTime = new Date(r.createdAt || r.returnDate).getTime();

      if (dateRange === 'today') {
        return rTime >= todayMidnight;
      }
      if (dateRange === 'yesterday') {
        return rTime >= yesterdayMidnight && rTime < todayMidnight;
      }
      if (dateRange === '7days') {
        return (now.getTime() - rTime) <= 7 * 86400000;
      }
      if (dateRange === '30days') {
        return (now.getTime() - rTime) <= 30 * 86400000;
      }
      if (dateRange === 'month') {
        const rDate = new Date(r.createdAt || r.returnDate);
        return rDate.getMonth() === now.getMonth() && rDate.getFullYear() === now.getFullYear();
      }
      if (dateRange === 'custom') {
        if (!customStartDate && !customEndDate) return true;
        const start = customStartDate ? new Date(customStartDate).getTime() : 0;
        const end = customEndDate ? new Date(customEndDate + 'T23:59:59').getTime() : Infinity;
        return rTime >= start && rTime <= end;
      }
      return true;
    });
  }, [returns, dateRange, customStartDate, customEndDate]);

  // Matching gross sales in the period to calculate return %
  const totalSalesRevenue = useMemo(() => {
    return sales.filter(s => s.status === 'completed' || s.status === 'partially_refunded')
      .reduce((sum, s) => sum + s.grandTotal, 0);
  }, [sales]);

  // Helper function to check if item is restocked
  const isItemRestocked = (item: ReturnItem) => {
    return !!item.restockedToInventory || item.condition === 'restockable';
  };

  // Helper function to get item quantity
  const getItemQty = (item: ReturnItem) => {
    return item.quantityReturned ?? item.quantity ?? 1;
  };

  // Helper function to get refund amount
  const getItemRefund = (item: ReturnItem) => {
    return item.refundAmount ?? (item.unitPrice * getItemQty(item));
  };

  // Aggregate Metrics
  const totalRefundAmount = useMemo(() => {
    return filteredReturns.reduce((sum, r) => sum + (r.totalRefundAmount || r.totalRefund || 0), 0);
  }, [filteredReturns]);

  const returnRatePercent = totalSalesRevenue > 0 ? (totalRefundAmount / totalSalesRevenue) * 100 : 0;

  const totalReturnedUnits = useMemo(() => {
    return filteredReturns.reduce((sum, r) => {
      return sum + (r.items ? r.items.reduce((iSum, i) => iSum + getItemQty(i), 0) : 0);
    }, 0);
  }, [filteredReturns]);

  const restockedUnits = useMemo(() => {
    return filteredReturns.reduce((sum, r) => {
      return sum + (r.items ? r.items.filter(isItemRestocked).reduce((iSum, i) => iSum + getItemQty(i), 0) : 0);
    }, 0);
  }, [filteredReturns]);

  const quarantinedUnits = totalReturnedUnits - restockedUnits;

  // Breakdown by Clinical / Operational Reason
  const reasonBreakdown = useMemo(() => {
    const map: Record<string, { count: number; totalRefund: number }> = {
      'Dispensing Error': { count: 0, totalRefund: 0 },
      'Adverse Reaction': { count: 0, totalRefund: 0 },
      'Defective Packaging': { count: 0, totalRefund: 0 },
      'Prescription Changed': { count: 0, totalRefund: 0 },
      'Patient Request': { count: 0, totalRefund: 0 },
      'Other': { count: 0, totalRefund: 0 }
    };

    filteredReturns.forEach(r => {
      let key = 'Other';
      const reasonLower = (r.reason || '').toLowerCase();
      if (reasonLower.includes('dispens') || reasonLower.includes('error') || reasonLower.includes('wrong')) {
        key = 'Dispensing Error';
      } else if (reasonLower.includes('adverse') || reasonLower.includes('reaction') || reasonLower.includes('allergy')) {
        key = 'Adverse Reaction';
      } else if (reasonLower.includes('defect') || reasonLower.includes('damaged') || reasonLower.includes('seal')) {
        key = 'Defective Packaging';
      } else if (reasonLower.includes('prescript') || reasonLower.includes('doctor') || reasonLower.includes('switched')) {
        key = 'Prescription Changed';
      } else if (reasonLower.includes('request') || reasonLower.includes('patient') || reasonLower.includes('cancel')) {
        key = 'Patient Request';
      }

      if (!map[key]) map[key] = { count: 0, totalRefund: 0 };
      map[key].count += 1;
      map[key].totalRefund += (r.totalRefundAmount || r.totalRefund || 0);
    });

    return map;
  }, [filteredReturns]);

  // Filtered rows for Ledger Table
  const searchedReturns = useMemo(() => {
    return filteredReturns.filter(r => {
      // Search
      const matchSearch =
        r.returnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (r.invoiceNumber && r.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.customerName && r.customerName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.processedByName && r.processedByName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (r.reason && r.reason.toLowerCase().includes(searchQuery.toLowerCase()));

      // Reason filter
      let matchReason = true;
      if (selectedReasonFilter !== 'all') {
        matchReason = (r.reason || '').toLowerCase().includes(selectedReasonFilter.toLowerCase());
      }

      // Restock filter
      let matchRestock = true;
      if (selectedRestockFilter === 'restocked') {
        matchRestock = r.items?.some(isItemRestocked);
      } else if (selectedRestockFilter === 'quarantined') {
        matchRestock = r.items?.some(i => !isItemRestocked(i));
      }

      return matchSearch && matchReason && matchRestock;
    });
  }, [filteredReturns, searchQuery, selectedReasonFilter, selectedRestockFilter]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Return ID',
      'Original Invoice #',
      'Date & Time',
      'Patient Name',
      'Total Returned Units',
      'Total Refund (GHS)',
      'Clinical / Dispensing Reason',
      'Restock Status',
      'Processed By Pharmacist/Staff',
      'Notes'
    ];

    const rows = filteredReturns.map(r => [
      r.returnNumber,
      r.invoiceNumber,
      `"${new Date(r.createdAt || r.returnDate).toLocaleString('en-GB')}"`,
      `"${r.customerName || 'Walk-in Patient'}"`,
      r.items?.reduce((s, i) => s + getItemQty(i), 0) || 0,
      safeFixed(r.totalRefundAmount || r.totalRefund || 0),
      `"${r.reason || 'Not specified'}"`,
      r.items?.every(isItemRestocked) ? 'ALL RESTOCKED' : r.items?.some(isItemRestocked) ? 'PARTIALLY RESTOCKED' : 'QUARANTINED / WRITTEN OFF',
      `"${r.processedByName || r.processedBy || 'Staff'}"`,
      `"${r.notes || ''}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PharmaCare_Returns_Refunds_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const rangeLabelMap: Record<string, string> = {
      today: "Today's Returns",
      yesterday: "Yesterday's Returns",
      '7days': 'Last 7 Days',
      '30days': 'Last 30 Days',
      month: 'This Month',
      all: 'All Time Records',
      custom: `Custom Period (${customStartDate || 'Start'} to ${customEndDate || 'End'})`
    };

    const reasonRows = Object.entries(reasonBreakdown)
      .filter(([_, data]) => data.count > 0)
      .map(([reason, data]) => [
        reason,
        data.count,
        `${settings.currencySymbol || 'GH₵'} ${safeFixed(data.totalRefund)}`,
        totalRefundAmount > 0 ? `${((data.totalRefund / totalRefundAmount) * 100).toFixed(1)}%` : '0.0%'
      ]);

    const returnRows = filteredReturns.slice(0, 100).map(r => {
      const itemsCount = r.items ? r.items.reduce((sum, i) => sum + getItemQty(i), 0) : 0;
      const refundAmt = r.totalRefundAmount || r.totalRefund || 0;
      const allRestocked = r.items?.every(isItemRestocked);
      const someRestocked = r.items?.some(isItemRestocked);
      const disposition = allRestocked ? 'Restocked' : someRestocked ? 'Partially Restocked' : 'Quarantined / Destroyed';

      return [
        new Date(r.createdAt || r.returnDate || Date.now()).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
        r.returnNumber || r.id.substring(0, 8),
        r.invoiceNumber || '-',
        r.customerName || 'Walk-in Patient',
        r.reason || 'General Return',
        itemsCount,
        disposition,
        `${settings.currencySymbol || 'GH₵'} ${safeFixed(refundAmt)}`,
        r.processedByName || r.processedBy || 'Staff'
      ];
    });

    const reportConfig: PrintReportOptions = {
      title: 'Sales Returns & Refunds Audit Report',
      subtitle: 'Official incident audit of returned medications, refund reconciliations, and inventory restock disposition',
      pharmacySettings: settings,
      generatedBy: `${currentUser.name} (${currentUser.role.toUpperCase()})`,
      dateRangeLabel: rangeLabelMap[dateRange] || dateRange,
      kpiCards: [
        { label: 'Total Returns Logged', value: `${filteredReturns.length}`, subtext: 'Incidents processed' },
        { label: 'Total Restitution Refunded', value: `${settings.currencySymbol || 'GH₵'} ${safeFixed(totalRefundAmount)}`, subtext: `Return rate: ${returnRatePercent.toFixed(2)}%` },
        { label: 'Units Restocked', value: `${restockedUnits}`, subtext: 'Returned to live shelves' },
        { label: 'Units Quarantined / Written Off', value: `${quarantinedUnits}`, subtext: 'Isolated / destroyed' }
      ],
      tables: [
        {
          title: 'Return Incidents by Root Cause',
          headers: ['Root Cause / Reason', 'Incidents Count', 'Total Refund Amount', '% of Total Refund'],
          rows: reasonRows,
          alignments: ['left', 'center', 'right', 'right'],
          summaryRow: ['TOTAL REFUNDS', filteredReturns.length, `${settings.currencySymbol || 'GH₵'} ${safeFixed(totalRefundAmount)}`, '100.0%']
        },
        {
          title: `Returns Audit Log (Showing ${returnRows.length} of ${filteredReturns.length} records)`,
          headers: ['Date/Time', 'Return #', 'Invoice #', 'Patient / Customer', 'Reason', 'Units', 'Disposition', 'Refund Paid', 'Handled By'],
          rows: returnRows,
          alignments: ['left', 'left', 'left', 'left', 'left', 'center', 'center', 'right', 'left']
        }
      ],
      showSignOff: true,
      signOffTitle: 'Clinical Quality & Pharmacovigilance Sign-off',
      signOffRole: 'Quality Assurance / Superintendent Pharmacist'
    };

    setPrintModalOptions(reportConfig);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-rose-50 text-rose-600 rounded-xl">
            <RotateCcw className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Returns & Refunds Audit Report</h3>
            <p className="text-xs text-slate-500">
              Refund reconciliation, dispensing error incident reviews, and inventory restock telemetry.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'today', label: 'Today' },
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateRange(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateRange === tab.id
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-rose-600" />
            Export CSV
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shadow-xs"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print Report
          </button>
        </div>
      </div>

      {/* Summary KPI Cards in Ghana Cedis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Refunds */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Refunds Issued</p>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-rose-600 mt-2">
            {settings.currencySymbol} {safeFixed(totalRefundAmount)}
          </h3>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            {filteredReturns.length} Return transactions recorded
          </p>
        </div>

        {/* Return Rate % */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Return Rate of Sales</p>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <TrendingDown className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">
            {safeFixed(returnRatePercent, 2)}%
          </h3>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Global target: &lt; 2.5% of dispensary gross volume
          </p>
        </div>

        {/* Restocked Units */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Restocked Units</p>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <CheckCircle2 className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 mt-2">
            {restockedUnits} Units
          </h3>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Intact sealed items returned to active stock
          </p>
        </div>

        {/* Quarantined / Written Off */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Quarantined / Discarded</p>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <ShieldAlert className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-purple-700 mt-2">
            {quarantinedUnits} Units
          </h3>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Damaged / unsealed / adverse reaction items
          </p>
        </div>
      </div>

      {/* Reason Breakdown & Inventory Impact Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Reasons Breakdown (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center">
            <AlertTriangle className="w-4 h-4 mr-2 text-rose-600" />
            Return & Refund Clinical Root Causes
          </h4>

          <div className="space-y-4 pt-1">
            {Object.entries(reasonBreakdown).map(([reason, data]) => {
              const percent = totalRefundAmount > 0 ? (data.totalRefund / totalRefundAmount) * 100 : 0;
              return (
                <div key={reason} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{reason}</span>
                    <span className="font-bold text-slate-900">
                      {settings.currencySymbol}{safeFixed(data.totalRefund)} ({data.count} incident{data.count !== 1 ? 's' : ''})
                    </span>
                  </div>
                  <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${
                        reason === 'Dispensing Error'
                          ? 'bg-rose-500'
                          : reason === 'Adverse Reaction'
                          ? 'bg-purple-500'
                          : reason === 'Defective Packaging'
                          ? 'bg-amber-500'
                          : 'bg-blue-500'
                      } rounded-full transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Restock & Quarantine Card (1 Col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900 flex items-center">
              <Package className="w-4 h-4 mr-2 text-emerald-600" />
              Inventory Restock Disposition
            </h4>
            <p className="text-xs text-slate-500 mt-1">
              Safety handling of returned pharmaceuticals under Ghana Pharmacy Council standards.
            </p>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs">
                <div className="flex items-center justify-between font-bold text-emerald-900">
                  <span>Safely Restocked</span>
                  <span>{restockedUnits} Units</span>
                </div>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Returned to dispensary shelf after batch expiration & seal verification.
                </p>
              </div>

              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs">
                <div className="flex items-center justify-between font-bold text-rose-900">
                  <span>Quarantined & Discarded</span>
                  <span>{quarantinedUnits} Units</span>
                </div>
                <p className="text-[11px] text-rose-700 mt-1">
                  Sent to pharmaceutical destruction quarantine (Adverse reaction / open blister).
                </p>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Standard Operating Procedure SOP-GH-RET-04 compliant.
          </div>
        </div>
      </div>

      {/* Returns Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Returns & Refund Audit Log</h4>
            <p className="text-xs text-slate-500">Official log of all approved pharmaceutical refund transactions.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Return #, Invoice, Patient..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-rose-600"
              />
            </div>

            {/* Restock Filter */}
            <select
              value={selectedRestockFilter}
              onChange={e => setSelectedRestockFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-rose-600"
            >
              <option value="all">All Restock Types</option>
              <option value="restocked">Restocked into Shelf</option>
              <option value="quarantined">Quarantined / Written Off</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Return ID</th>
                <th className="py-3.5 px-4 font-semibold">Original Invoice</th>
                <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                <th className="py-3.5 px-4 font-semibold">Patient / Customer</th>
                <th className="py-3.5 px-4 font-semibold">Clinical Reason</th>
                <th className="py-3.5 px-4 font-semibold text-center">Disposition</th>
                <th className="py-3.5 px-4 font-semibold text-right">Refund Amount</th>
                <th className="py-3.5 px-4 font-semibold">Approved By</th>
                <th className="py-3.5 px-4 font-semibold text-center">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {searchedReturns.map(ret => {
                const totalUnits = ret.items?.reduce((s, i) => s + getItemQty(i), 0) || 0;
                const isRestocked = ret.items?.every(isItemRestocked);
                const isPartial = ret.items?.some(isItemRestocked) && !isRestocked;

                return (
                  <tr key={ret.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-rose-700">
                      {ret.returnNumber}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-800">
                      {ret.invoiceNumber}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(ret.createdAt || ret.returnDate).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {ret.customerName || 'Walk-in Patient'}
                    </td>
                    <td className="py-3 px-4">
                      <span className="font-semibold text-slate-800 block">{ret.reason}</span>
                      {ret.notes && (
                        <span className="text-[10px] text-slate-400 truncate max-w-xs block">{ret.notes}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isRestocked ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Restocked
                        </span>
                      ) : isPartial ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          Partial Restock
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          <XCircle className="w-3 h-3 mr-1" /> Quarantined
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-rose-600">
                      {settings.currencySymbol}{safeFixed(ret.totalRefundAmount || ret.totalRefund || 0)}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-800">
                      {ret.processedByName || ret.processedBy || 'Pharmacist'}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedReturnDetail(ret)}
                        className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="View Return Slip"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {searchedReturns.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                    No return orders matched the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Return Slip Modal */}
      {selectedReturnDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-rose-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-rose-300 font-bold">Return Audit Slip</span>
                <h3 className="text-base font-bold font-mono">{selectedReturnDetail.returnNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedReturnDetail(null)}
                className="p-1 text-rose-200 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Original Invoice</span>
                  <strong className="text-slate-900 font-mono">{selectedReturnDetail.invoiceNumber}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Date & Time</span>
                  <strong className="text-slate-900">
                    {new Date(selectedReturnDetail.createdAt || selectedReturnDetail.returnDate).toLocaleString('en-GB')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Patient</span>
                  <strong className="text-slate-900">{selectedReturnDetail.customerName || 'Walk-in'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Primary Reason</span>
                  <strong className="text-rose-700">{selectedReturnDetail.reason}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Processed By</span>
                  <strong className="text-slate-900">{selectedReturnDetail.processedByName || selectedReturnDetail.processedBy || 'Pharmacist'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Refund Total</span>
                  <strong className="text-rose-600 font-mono text-sm">
                    {settings.currencySymbol}{safeFixed(selectedReturnDetail.totalRefundAmount || selectedReturnDetail.totalRefund || 0)}
                  </strong>
                </div>
              </div>

              {selectedReturnDetail.notes && (
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs">
                  <span className="font-bold text-amber-900 block text-[10px]">Clinical / Pharmacist Notes:</span>
                  <p className="text-amber-800 mt-0.5">{selectedReturnDetail.notes}</p>
                </div>
              )}

              {/* Items Table */}
              <div>
                <h5 className="text-xs font-bold text-slate-900 mb-2">Returned Medicine Line Items</h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Medicine & Batch</th>
                        <th className="py-2.5 px-3 text-center">Qty Returned</th>
                        <th className="py-2.5 px-3 text-right">Unit Refund</th>
                        <th className="py-2.5 px-3 text-center">Restocked?</th>
                        <th className="py-2.5 px-3 text-right">Total Refund</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {selectedReturnDetail.items?.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-medium">
                            {item.medicineName}
                            <span className="text-[10px] text-slate-400 block font-mono">Batch: {item.batchNumber || '-'}</span>
                          </td>
                          <td className="py-2.5 px-3 text-center font-bold text-slate-900">{getItemQty(item)}</td>
                          <td className="py-2.5 px-3 text-right">{settings.currencySymbol}{safeFixed(item.unitPrice)}</td>
                          <td className="py-2.5 px-3 text-center">
                            {isItemRestocked(item) ? (
                              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[9px]">
                                Yes (Restocked)
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[9px]">
                                Quarantined
                              </span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-rose-600">
                            {settings.currencySymbol}{safeFixed(getItemRefund(item))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedReturnDetail(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print & PDF Modal */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        options={printModalOptions}
      />
    </div>
  );
};
