import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { Sale, SaleItem } from '../../types';
import { safeFixed } from '../../utils/formatters';
import { printStructuredReport } from '../../utils/printReport';
import {
  TrendingUp,
  Download,
  Calendar,
  CreditCard,
  Search,
  Filter,
  DollarSign,
  Package,
  Layers,
  ArrowUpRight,
  Printer,
  FileSpreadsheet,
  Clock,
  Eye,
  X,
  Smartphone,
  ShieldCheck
} from 'lucide-react';

interface SalesReportProps {
  dateRange: 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'all' | 'custom';
  setDateRange: (range: 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'all' | 'custom') => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
}

export const SalesReport: React.FC<SalesReportProps> = ({
  dateRange,
  setDateRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate
}) => {
  const { sales, returns, settings, categories, currentUser } = usePharmacy();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPaymentFilter, setSelectedPaymentFilter] = useState<string>('all');
  const [selectedSaleDetail, setSelectedSaleDetail] = useState<Sale | null>(null);

  // Filter sales based on selected date range
  const filteredSales = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayMidnight = todayMidnight - 86400000;

    return sales.filter(s => {
      if (s.status !== 'completed' && s.status !== 'partially_refunded') return false;
      const sTime = new Date(s.createdAt).getTime();

      if (dateRange === 'today') {
        return sTime >= todayMidnight;
      }
      if (dateRange === 'yesterday') {
        return sTime >= yesterdayMidnight && sTime < todayMidnight;
      }
      if (dateRange === '7days') {
        return (now.getTime() - sTime) <= 7 * 86400000;
      }
      if (dateRange === '30days') {
        return (now.getTime() - sTime) <= 30 * 86400000;
      }
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

  // Matching returns within the same filtered time frame
  const filteredReturns = useMemo(() => {
    const saleIds = new Set(filteredSales.map(s => s.id));
    return returns.filter(r => saleIds.has(r.saleId));
  }, [returns, filteredSales]);

  // Aggregate Key Metrics
  const totalGrossSales = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);
  }, [filteredSales]);

  const totalRefundsDeducted = useMemo(() => {
    const saleRefundSum = filteredSales.reduce((sum, s) => sum + (s.refundedAmount || 0), 0);
    const returnSum = filteredReturns.reduce((sum, r) => sum + (r.totalRefundAmount || r.totalRefund || 0), 0);
    return Math.max(saleRefundSum, returnSum);
  }, [filteredSales, filteredReturns]);

  const netSalesRevenue = Math.max(0, totalGrossSales - totalRefundsDeducted);

  const totalCOGS = useMemo(() => {
    return filteredSales.reduce((acc, sale) => {
      const saleCOGS = sale.items.reduce((iSum, item) => iSum + (item.purchaseCost || 0) * item.quantity, 0);
      return acc + saleCOGS;
    }, 0);
  }, [filteredSales]);

  const grossProfit = netSalesRevenue - totalCOGS;
  const marginPercent = netSalesRevenue > 0 ? (grossProfit / netSalesRevenue) * 100 : 0;
  const totalTax = filteredSales.reduce((sum, s) => sum + (s.taxAmount || 0), 0);
  const totalDiscount = filteredSales.reduce((sum, s) => sum + (s.discountTotal || 0), 0);
  const totalItemsSold = filteredSales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
  const averageOrderValue = filteredSales.length > 0 ? netSalesRevenue / filteredSales.length : 0;

  // Payment Breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {
      mobile_money: { count: 0, total: 0 },
      cash: { count: 0, total: 0 },
      card: { count: 0, total: 0 },
      insurance: { count: 0, total: 0 },
      bank_transfer: { count: 0, total: 0 }
    };

    filteredSales.forEach(s => {
      const method = s.paymentMethod || 'cash';
      if (!map[method]) {
        map[method] = { count: 0, total: 0 };
      }
      map[method].count += 1;
      map[method].total += s.grandTotal;
    });

    return map;
  }, [filteredSales]);

  // Hourly / Daily Trend Data
  const trendData = useMemo(() => {
    const map: Record<string, { label: string; revenue: number; count: number }> = {};
    
    // Sort chronological
    const sorted = [...filteredSales].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    sorted.forEach(s => {
      const d = new Date(s.createdAt);
      const key = dateRange === 'today' || dateRange === 'yesterday'
        ? `${d.getHours()}:00`
        : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });

      if (!map[key]) {
        map[key] = { label: key, revenue: 0, count: 0 };
      }
      map[key].revenue += s.grandTotal;
      map[key].count += 1;
    });

    return Object.values(map);
  }, [filteredSales, dateRange]);

  const maxTrendRevenue = useMemo(() => {
    return Math.max(...trendData.map(t => t.revenue), 10);
  }, [trendData]);

  // Filtered Table rows
  const searchedSales = useMemo(() => {
    return filteredSales.filter(s => {
      const matchSearch =
        s.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (s.cashierName && s.cashierName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (s.dispensedByName && s.dispensedByName.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchPayment = selectedPaymentFilter === 'all' || s.paymentMethod === selectedPaymentFilter;

      return matchSearch && matchPayment;
    });
  }, [filteredSales, searchQuery, selectedPaymentFilter]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      'Invoice Number',
      'Date & Time',
      'Customer / Patient',
      'Items Count',
      'Subtotal (GHS)',
      'Discount (GHS)',
      'VAT / Tax (GHS)',
      'Grand Total (GHS)',
      'Payment Method',
      'Cashier',
      'Dispenser / Pharmacist',
      'Status'
    ];

    const rows = filteredSales.map(s => [
      s.invoiceNumber,
      `"${new Date(s.createdAt).toLocaleString('en-GB')}"`,
      `"${s.customerName || 'Walk-in Customer'}"`,
      s.items.reduce((sum, i) => sum + i.quantity, 0),
      safeFixed(s.subtotal),
      safeFixed(s.discountTotal),
      safeFixed(s.taxAmount),
      safeFixed(s.grandTotal),
      s.paymentMethod ? s.paymentMethod.replace('_', ' ').toUpperCase() : 'CASH',
      `"${s.cashierName || 'Cashier'}"`,
      `"${s.dispensedByName || s.cashierName || '-'}"`,
      s.status
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PharmaCare_Ghana_Sales_Report_${dateRange}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintReport = () => {
    const rangeLabelMap: Record<string, string> = {
      today: "Today's Ledger",
      yesterday: "Yesterday's Ledger",
      '7days': 'Last 7 Days',
      '30days': 'Last 30 Days',
      month: 'This Month',
      all: 'All Time Historical Ledger',
      custom: `Custom Period (${customStartDate || 'Start'} to ${customEndDate || 'End'})`
    };

    const paymentRows = Object.entries(paymentBreakdown)
      .filter(([_, data]) => data.count > 0)
      .map(([method, data]) => {
        const methodLabel = method.replace('_', ' ').toUpperCase();
        const pct = netSalesRevenue > 0 ? ((data.total / netSalesRevenue) * 100).toFixed(1) : '0.0';
        return [
          methodLabel,
          data.count,
          `${settings.currencySymbol || 'GH₵'} ${safeFixed(data.total)}`,
          `${pct}%`
        ];
      });

    const ledgerRows = filteredSales.slice(0, 100).map(s => [
      new Date(s.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }),
      s.invoiceNumber,
      s.customerName || 'Walk-in Patient',
      s.paymentMethod ? s.paymentMethod.replace('_', ' ').toUpperCase() : 'CASH',
      s.items.reduce((sum, i) => sum + i.quantity, 0),
      `${settings.currencySymbol || 'GH₵'} ${safeFixed(s.grandTotal)}`,
      s.dispensedByName || s.cashierName || 'Cashier'
    ]);

    printStructuredReport({
      title: 'Sales & Revenue Financial Audit Report',
      subtitle: 'Comprehensive sales performance, payment channels, and transaction ledger',
      pharmacySettings: settings,
      generatedBy: `${currentUser.name} (${currentUser.role.toUpperCase()})`,
      dateRangeLabel: rangeLabelMap[dateRange] || dateRange,
      kpiCards: [
        { label: 'Gross Sales', value: `${settings.currencySymbol || 'GH₵'} ${safeFixed(totalGrossSales)}`, subtext: `${filteredSales.length} Total Transactions` },
        { label: 'Refunds Deducted', value: `-${settings.currencySymbol || 'GH₵'} ${safeFixed(totalRefundsDeducted)}`, subtext: `${filteredReturns.length} Return Orders` },
        { label: 'Net Sales Revenue', value: `${settings.currencySymbol || 'GH₵'} ${safeFixed(netSalesRevenue)}`, subtext: `Avg Order: ${settings.currencySymbol || 'GH₵'} ${safeFixed(averageOrderValue)}` },
        { label: 'Estimated Gross Profit', value: `${settings.currencySymbol || 'GH₵'} ${safeFixed(grossProfit)}`, subtext: `Margin: ${marginPercent.toFixed(1)}%` }
      ],
      tables: [
        {
          title: 'Payment Channel Breakdown & Revenue Settlement',
          headers: ['Payment Channel', 'Transactions', 'Settled Total', '% of Total'],
          rows: paymentRows,
          alignments: ['left', 'center', 'right', 'right'],
          summaryRow: ['TOTAL SETTLEMENT', filteredSales.length, `${settings.currencySymbol || 'GH₵'} ${safeFixed(netSalesRevenue)}`, '100.0%']
        },
        {
          title: `Sales Transactions Ledger (Showing ${ledgerRows.length} of ${filteredSales.length} records)`,
          headers: ['Date/Time', 'Invoice #', 'Patient / Customer', 'Payment', 'Items', 'Total Amount', 'Handled By'],
          rows: ledgerRows,
          alignments: ['left', 'left', 'left', 'center', 'center', 'right', 'left'],
          summaryRow: ['TOTALS', `${filteredSales.length} Invoices`, '-', '-', `${totalItemsSold} Units`, `${settings.currencySymbol || 'GH₵'} ${safeFixed(totalGrossSales)}`, '-']
        }
      ],
      showSignOff: true,
      signOffTitle: 'Superintendent Pharmacist / Financial Controller',
      signOffRole: 'Superintendent Pharmacist'
    });
  };

  return (
    <div className="space-y-6">
      {/* Action Header & Date Filter Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Sales & Revenue Audit Report</h3>
            <p className="text-xs text-slate-500">
              Financial performance, gross profit margins, and Ghana revenue reconciliation.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Range Pills */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: '7days', label: '7 Days' },
              { id: '30days', label: '30 Days' },
              { id: 'month', label: 'This Month' },
              { id: 'all', label: 'All Time' },
              { id: 'custom', label: 'Custom' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setDateRange(tab.id as any)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  dateRange === tab.id
                    ? 'bg-white text-emerald-800 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              title="Download detailed CSV report"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
              Export CSV
            </button>

            <button
              type="button"
              onClick={handlePrintReport}
              className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-white bg-emerald-700 hover:bg-emerald-800 rounded-xl transition-colors cursor-pointer shadow-xs"
              title="Print Sales Report"
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print Report
            </button>
          </div>
        </div>
      </div>

      {/* Custom Date Range Selectors */}
      {dateRange === 'custom' && (
        <div className="flex flex-wrap items-center gap-3 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200 text-xs">
          <Calendar className="w-4 h-4 text-emerald-700" />
          <span className="font-bold text-emerald-900">Custom Date Period:</span>
          <div className="flex items-center space-x-2">
            <label className="text-slate-600">From:</label>
            <input
              type="date"
              value={customStartDate}
              onChange={e => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
            />
          </div>
          <div className="flex items-center space-x-2">
            <label className="text-slate-600">To:</label>
            <input
              type="date"
              value={customEndDate}
              onChange={e => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-slate-800 font-medium"
            />
          </div>
          <span className="text-[11px] text-emerald-700 ml-auto">
            Showing transactions from {customStartDate || 'beginning'} to {customEndDate || 'today'}
          </span>
        </div>
      )}

      {/* Financial Key Metric Cards in Ghana Cedis */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Gross Sales */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Sales</p>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">
            {settings.currencySymbol} {safeFixed(totalGrossSales)}
          </h3>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>{filteredSales.length} Total Invoices</span>
            <span className="font-semibold text-slate-700">{totalItemsSold} units sold</span>
          </div>
        </div>

        {/* Net Revenue after Returns */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Sales Revenue</p>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-blue-700 mt-2">
            {settings.currencySymbol} {safeFixed(netSalesRevenue)}
          </h3>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span className="text-rose-600 font-medium">Refunds: {settings.currencySymbol}{safeFixed(totalRefundsDeducted)}</span>
            <span className="text-slate-600 font-semibold">AOV: {settings.currencySymbol}{safeFixed(averageOrderValue)}</span>
          </div>
        </div>

        {/* Estimated Gross Profit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Profit</p>
            <span className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg">
              <ArrowUpRight className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 mt-2">
            {settings.currencySymbol} {safeFixed(grossProfit)}
          </h3>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span className="text-slate-500">COGS: {settings.currencySymbol}{safeFixed(totalCOGS)}</span>
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold text-[11px]">
              {safeFixed(marginPercent, 1)}% Margin
            </span>
          </div>
        </div>

        {/* Tax & Discounts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs relative overflow-hidden">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Tax & Discounts</p>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">
            {settings.currencySymbol} {safeFixed(totalTax)}
          </h3>
          <div className="flex items-center justify-between text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            <span>VAT / NHIL / GETFund</span>
            <span className="text-amber-700 font-semibold">Discounts: {settings.currencySymbol}{safeFixed(totalDiscount)}</span>
          </div>
        </div>
      </div>

      {/* Revenue Trend & Payment Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Visual (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-slate-900 flex items-center">
              <Clock className="w-4 h-4 mr-2 text-emerald-600" />
              Sales Distribution Timeline
            </h4>
            <span className="text-xs text-slate-500">
              Total period volume: <strong className="text-slate-800">{settings.currencySymbol}{safeFixed(totalGrossSales)}</strong>
            </span>
          </div>

          {trendData.length > 0 ? (
            <div className="space-y-3 pt-2">
              <div className="flex items-end space-x-3 h-44 pb-2 border-b border-slate-100 overflow-x-auto">
                {trendData.map((point, idx) => {
                  const barHeight = maxTrendRevenue > 0 ? Math.max(12, Math.min(100, (point.revenue / maxTrendRevenue) * 100)) : 12;
                  return (
                    <div key={idx} className="flex-1 min-w-[38px] flex flex-col items-center group relative">
                      {/* Tooltip on hover */}
                      <div className="absolute -top-10 bg-slate-900 text-white text-[10px] font-bold py-1 px-2 rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                        {settings.currencySymbol}{safeFixed(point.revenue)} ({point.count} txns)
                      </div>

                      <div className="w-full bg-slate-100 rounded-t-lg overflow-hidden flex flex-col justify-end h-full">
                        <div
                          className="w-full bg-emerald-500 hover:bg-emerald-600 rounded-t-lg transition-all"
                          style={{ height: `${barHeight}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-semibold text-slate-500 mt-2 truncate max-w-full text-center">
                        {point.label}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Earliest transaction</span>
                <span>Peak: {settings.currencySymbol}{safeFixed(maxTrendRevenue)}</span>
                <span>Latest transaction</span>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400 text-xs">
              No sales recorded for the selected period.
            </div>
          )}
        </div>

        {/* Payment Methods Breakdown (1 Col) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <h4 className="text-sm font-bold text-slate-900 flex items-center">
            <CreditCard className="w-4 h-4 mr-2 text-emerald-600" />
            Payment Channel Breakdown
          </h4>

          <div className="space-y-3.5 pt-1">
            {[
              { id: 'mobile_money', label: 'Mobile Money (MTN / Telecel / AT)', icon: Smartphone, color: 'bg-amber-500' },
              { id: 'cash', label: 'Physical Cash (GH₵ Notes/Coins)', icon: DollarSign, color: 'bg-emerald-500' },
              { id: 'card', label: 'Debit / Credit Card (POS)', icon: CreditCard, color: 'bg-blue-500' },
              { id: 'insurance', label: 'NHIS / Private Health Insurance', icon: ShieldCheck, color: 'bg-purple-500' },
              { id: 'bank_transfer', label: 'Bank Transfer / GhIPSS', icon: Layers, color: 'bg-slate-500' }
            ].map(item => {
              const data = paymentBreakdown[item.id] || { count: 0, total: 0 };
              const percent = totalGrossSales > 0 ? (data.total / totalGrossSales) * 100 : 0;
              const Icon = item.icon;

              return (
                <div key={item.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-700 flex items-center">
                      <Icon className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                      {item.label}
                    </span>
                    <span className="font-bold text-slate-900">
                      {settings.currencySymbol}{safeFixed(data.total)} ({safeFixed(percent, 1)}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <div className="text-[10px] text-slate-400 text-right">
                    {data.count} transaction{data.count !== 1 ? 's' : ''}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Transaction Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-5 border-b border-slate-200 bg-slate-50/70 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Sales Transaction Journal & Ledger</h4>
            <p className="text-xs text-slate-500">Itemized dispensary invoice records for the active period.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Search Input */}
            <div className="relative min-w-[220px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search Invoice, Customer, Cashier..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs focus:outline-emerald-600"
              />
            </div>

            {/* Payment Filter */}
            <select
              value={selectedPaymentFilter}
              onChange={e => setSelectedPaymentFilter(e.target.value)}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-emerald-600"
            >
              <option value="all">All Payment Channels</option>
              <option value="mobile_money">Mobile Money (MoMo)</option>
              <option value="cash">Cash</option>
              <option value="card">POS Card</option>
              <option value="insurance">Insurance / NHIS</option>
              <option value="bank_transfer">Bank Transfer</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Invoice #</th>
                <th className="py-3.5 px-4 font-semibold">Date & Time</th>
                <th className="py-3.5 px-4 font-semibold">Customer / Patient</th>
                <th className="py-3.5 px-4 font-semibold text-center">Items</th>
                <th className="py-3.5 px-4 font-semibold text-right">Subtotal</th>
                <th className="py-3.5 px-4 font-semibold text-right">Tax & Disc</th>
                <th className="py-3.5 px-4 font-semibold text-right">Grand Total</th>
                <th className="py-3.5 px-4 font-semibold text-center">Payment</th>
                <th className="py-3.5 px-4 font-semibold">Cashier / Dispenser</th>
                <th className="py-3.5 px-4 font-semibold text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {searchedSales.map(sale => {
                const totalUnits = sale.items.reduce((s, i) => s + i.quantity, 0);
                return (
                  <tr key={sale.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {sale.invoiceNumber}
                      {sale.status === 'partially_refunded' && (
                        <span className="ml-1.5 px-1.5 py-0.5 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                          Refunded
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-slate-500 whitespace-nowrap">
                      {new Date(sale.createdAt).toLocaleDateString('en-GB', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                    <td className="py-3 px-4 font-medium text-slate-900">
                      {sale.customerName || 'Walk-in Customer'}
                      {sale.customerPhone && (
                        <span className="block text-[10px] text-slate-400 font-mono">{sale.customerPhone}</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center font-bold text-slate-700">
                      {totalUnits} <span className="text-[10px] text-slate-400">({sale.items.length} sku)</span>
                    </td>
                    <td className="py-3 px-4 text-right font-medium text-slate-600">
                      {settings.currencySymbol}{safeFixed(sale.subtotal)}
                    </td>
                    <td className="py-3 px-4 text-right text-[11px] text-slate-500">
                      <div>+{settings.currencySymbol}{safeFixed(sale.taxAmount)} tax</div>
                      {sale.discountTotal > 0 && (
                        <div className="text-amber-600">-{settings.currencySymbol}{safeFixed(sale.discountTotal)}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right font-extrabold text-slate-900">
                      <div>{settings.currencySymbol}{safeFixed(sale.grandTotal)}</div>
                      {sale.refundedAmount && sale.refundedAmount > 0 ? (
                        <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                          -{settings.currencySymbol}{safeFixed(sale.refundedAmount)} refunded
                          <div className="text-emerald-700 font-bold">
                            Net: {settings.currencySymbol}{safeFixed(Math.max(0, sale.grandTotal - sale.refundedAmount))}
                          </div>
                        </div>
                      ) : null}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-800">
                        {sale.paymentMethod?.replace('_', ' ') || 'CASH'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-600">
                      <div className="font-semibold text-slate-900">{sale.cashierName || 'Cashier'}</div>
                      {sale.dispensedByName && sale.dispensedByName !== sale.cashierName && (
                        <div className="text-[10px] text-emerald-700">Disp: {sale.dispensedByName}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedSaleDetail(sale)}
                        className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="View Line Items"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {searchedSales.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-10 text-center text-slate-400 text-xs">
                    No sales invoices matched the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Sale Detail Modal */}
      {selectedSaleDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-bold">Dispensary Invoice</span>
                <h3 className="text-base font-bold font-mono">{selectedSaleDetail.invoiceNumber}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedSaleDetail(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Customer / Patient</span>
                  <strong className="text-slate-900">{selectedSaleDetail.customerName || 'Walk-in Customer'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Date & Time</span>
                  <strong className="text-slate-900">
                    {new Date(selectedSaleDetail.createdAt).toLocaleString('en-GB')}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Payment Method</span>
                  <strong className="text-slate-900 capitalize">
                    {selectedSaleDetail.paymentMethod?.replace('_', ' ') || 'Cash'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Cashier</span>
                  <strong className="text-slate-900">{selectedSaleDetail.cashierName || 'Cashier'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Dispensing Pharmacist</span>
                  <strong className="text-slate-900">{selectedSaleDetail.dispensedByName || selectedSaleDetail.cashierName || '-'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Prescription Ref</span>
                  <strong className="text-slate-900 font-mono">{selectedSaleDetail.prescriptionNumber || 'None (OTC)'}</strong>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <h5 className="text-xs font-bold text-slate-900 mb-2">Dispensed Medication Line Items</h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Medicine & Strength</th>
                        <th className="py-2.5 px-3">Batch #</th>
                        <th className="py-2.5 px-3 text-center">Qty</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {selectedSaleDetail.items.map((item, idx) => (
                        <tr key={idx}>
                          <td className="py-2.5 px-3 font-medium">
                            {item.medicineName}
                            {item.dosage && <span className="text-[10px] text-slate-400 block">{item.dosage} • {item.form}</span>}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">{item.batchNumber || '-'}</td>
                          <td className="py-2.5 px-3 text-center font-bold">{item.quantity}</td>
                          <td className="py-2.5 px-3 text-right">{settings.currencySymbol}{safeFixed(item.unitPrice)}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {settings.currencySymbol}{safeFixed(item.total)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Financial Totals */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>Subtotal</span>
                  <span className="font-semibold">{settings.currencySymbol}{safeFixed(selectedSaleDetail.subtotal)}</span>
                </div>
                {selectedSaleDetail.discountTotal > 0 && (
                  <div className="flex justify-between text-amber-600">
                    <span>Discount Total</span>
                    <span>-{settings.currencySymbol}{safeFixed(selectedSaleDetail.discountTotal)}</span>
                  </div>
                )}
                <div className="flex justify-between text-slate-600">
                  <span>VAT / Sales Tax ({selectedSaleDetail.taxRate}%)</span>
                  <span>+{settings.currencySymbol}{safeFixed(selectedSaleDetail.taxAmount)}</span>
                </div>
                <div className="flex justify-between text-sm font-black text-slate-900 pt-2 border-t border-slate-200">
                  <span>Grand Total Paid</span>
                  <span className="text-emerald-700">{settings.currencySymbol}{safeFixed(selectedSaleDetail.grandTotal)}</span>
                </div>
                {selectedSaleDetail.amountTendered > 0 && (
                  <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                    <span>Amount Tendered: {settings.currencySymbol}{safeFixed(selectedSaleDetail.amountTendered)}</span>
                    <span>Change Given: {settings.currencySymbol}{safeFixed(selectedSaleDetail.changeGiven)}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedSaleDetail(null)}
                className="px-4 py-2 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-xl transition-colors cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
