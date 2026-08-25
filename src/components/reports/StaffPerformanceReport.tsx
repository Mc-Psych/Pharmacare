import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { User, Sale } from '../../types';
import { safeFixed } from '../../utils/formatters';
import { PrintReportOptions, printStructuredReport } from '../../utils/printReport';
import { ReportPrintModal } from '../common/ReportPrintModal';
import {
  Users,
  Award,
  TrendingUp,
  FileSpreadsheet,
  Printer,
  Search,
  Filter,
  DollarSign,
  Package,
  Calendar,
  CheckCircle2,
  FileText,
  UserCheck,
  Zap,
  Clock,
  Eye,
  X,
  Sparkles
} from 'lucide-react';

interface StaffPerformanceReportProps {
  dateRange: 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'all' | 'custom';
  setDateRange: (range: 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'all' | 'custom') => void;
  customStartDate: string;
  setCustomStartDate: (d: string) => void;
  customEndDate: string;
  setCustomEndDate: (d: string) => void;
}

export const StaffPerformanceReport: React.FC<StaffPerformanceReportProps> = ({
  dateRange,
  setDateRange,
  customStartDate,
  setCustomStartDate,
  customEndDate,
  setCustomEndDate
}) => {
  const { users, sales, returns, prescriptions, settings, currentUser } = usePharmacy();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedStaffDetail, setSelectedStaffDetail] = useState<any | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalOptions, setPrintModalOptions] = useState<PrintReportOptions | null>(null);

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

  const totalPharmacyRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + s.grandTotal, 0);
  }, [filteredSales]);

  // Aggregate stats per staff member
  const staffStats = useMemo(() => {
    return users.map(user => {
      // Direct matches by ID or by name
      const userSales = filteredSales.filter(s =>
        s.cashierId === user.id ||
        (s.cashierName && s.cashierName.toLowerCase() === user.name.toLowerCase()) ||
        s.dispensedById === user.id ||
        (s.dispensedByName && s.dispensedByName.toLowerCase() === user.name.toLowerCase())
      );

      const totalRevenue = userSales.reduce((sum, s) => sum + s.grandTotal, 0);
      const totalTxns = userSales.length;
      const totalUnits = userSales.reduce((sum, s) => sum + s.items.reduce((iSum, i) => iSum + i.quantity, 0), 0);
      const avgOrderValue = totalTxns > 0 ? totalRevenue / totalTxns : 0;
      const revenueContributionPct = totalPharmacyRevenue > 0 ? (totalRevenue / totalPharmacyRevenue) * 100 : 0;

      // Returns handled
      const userReturns = returns.filter(r =>
        r.processedBy === user.id ||
        (r.processedByName && r.processedByName.toLowerCase() === user.name.toLowerCase())
      );
      const totalRefundsProcessed = userReturns.reduce((sum, r) => sum + (r.totalRefundAmount || r.totalRefund || 0), 0);

      // Prescriptions handled
      const userPrescriptions = prescriptions.filter(p =>
        p.dispensedBy === user.id ||
        (p.dispensedBy && p.dispensedBy.toLowerCase() === user.name.toLowerCase())
      );

      // Performance badge
      let tier: 'Top Performer' | 'High Volume' | 'Consistent' | 'Standard' = 'Standard';
      if (totalRevenue > 2500 || totalTxns >= 15) {
        tier = 'Top Performer';
      } else if (totalRevenue > 1200 || totalTxns >= 8) {
        tier = 'High Volume';
      } else if (totalTxns >= 3) {
        tier = 'Consistent';
      }

      return {
        user,
        totalRevenue,
        totalTxns,
        totalUnits,
        avgOrderValue,
        revenueContributionPct,
        userReturnsCount: userReturns.length,
        totalRefundsProcessed,
        prescriptionsHandled: userPrescriptions.length,
        tier,
        userSales
      };
    });
  }, [users, filteredSales, totalPharmacyRevenue, returns, prescriptions]);

  // Filter and sort staff
  const filteredStaff = useMemo(() => {
    return staffStats
      .filter(item => {
        if (selectedRoleFilter !== 'all' && item.user.role !== selectedRoleFilter) {
          return false;
        }
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            item.user.name.toLowerCase().includes(q) ||
            item.user.email.toLowerCase().includes(q) ||
            item.user.role.toLowerCase().includes(q);
          if (!match) return false;
        }
        return true;
      })
      .sort((a, b) => b.totalRevenue - a.totalRevenue || b.totalTxns - a.totalTxns);
  }, [staffStats, selectedRoleFilter, searchQuery]);

  const topPerformer = filteredStaff[0];

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Staff Name',
      'Designated Role',
      'Email / User ID',
      'Sales Invoices Processed',
      'Total Revenue Generated (GHS)',
      'Average Transaction Value (GHS)',
      'Total Units Dispensed',
      'Prescriptions Dispensed',
      'Returns Handled Count',
      'Refunds Processed (GHS)',
      'Revenue Share (%)',
      'Performance Tier'
    ];

    const rows = filteredStaff.map(s => [
      `"${s.user.name}"`,
      s.user.role.toUpperCase(),
      `"${s.user.email}"`,
      s.totalTxns,
      safeFixed(s.totalRevenue),
      safeFixed(s.avgOrderValue),
      s.totalUnits,
      s.prescriptionsHandled,
      s.userReturnsCount,
      safeFixed(s.totalRefundsProcessed),
      safeFixed(s.revenueContributionPct, 1),
      s.tier
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PharmaCare_Staff_Performance_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const rangeLabelMap: Record<string, string> = {
      today: "Today's Productivity",
      yesterday: "Yesterday's Productivity",
      '7days': 'Last 7 Days',
      '30days': 'Last 30 Days',
      month: 'This Month',
      all: 'All Time Historical Records',
      custom: `Custom Period (${customStartDate || 'Start'} to ${customEndDate || 'End'})`
    };

    const staffRows = filteredStaff.map(s => [
      s.user.name,
      s.user.role.toUpperCase(),
      s.totalTxns,
      `${settings.currencySymbol || 'GH₵'} ${safeFixed(s.totalRevenue)}`,
      `${settings.currencySymbol || 'GH₵'} ${safeFixed(s.avgOrderValue)}`,
      s.totalUnits,
      s.prescriptionsHandled,
      `${safeFixed(s.revenueContributionPct, 1)}%`,
      s.tier.toUpperCase()
    ]);

    const totalStaffTxns = staffStats.reduce((sum, s) => sum + s.totalTxns, 0);

    const reportConfig: PrintReportOptions = {
      title: 'Staff Sales & Dispensing Productivity Audit',
      subtitle: 'Individual employee throughput, revenue share contribution, and prescription fulfillment efficiency',
      pharmacySettings: settings,
      generatedBy: `${currentUser.name} (${currentUser.role.toUpperCase()})`,
      dateRangeLabel: rangeLabelMap[dateRange] || dateRange,
      kpiCards: [
        { label: 'Active Staff Audited', value: `${filteredStaff.length}`, subtext: 'Registered dispensary accounts' },
        { label: 'Total Invoices Handled', value: `${totalStaffTxns}`, subtext: 'Dispensary transactions' },
        { label: 'Total Gross Revenue', value: `${settings.currencySymbol || 'GH₵'} ${safeFixed(totalPharmacyRevenue)}`, subtext: 'Staff generated turnover' },
        { label: 'Top Performer', value: topPerformer ? topPerformer.user.name : 'N/A', subtext: topPerformer ? `${settings.currencySymbol || 'GH₵'} ${safeFixed(topPerformer.totalRevenue)} (${safeFixed(topPerformer.revenueContributionPct, 1)}%)` : '-' }
      ],
      tables: [
        {
          title: 'Employee Performance & Dispensing Throughput Ledger',
          headers: ['Staff Name', 'Designated Role', 'Invoices', 'Revenue Generated', 'Avg Ticket Value', 'Units Dispensed', 'Prescriptions', 'Revenue Share', 'Performance Tier'],
          rows: staffRows,
          alignments: ['left', 'center', 'center', 'right', 'right', 'center', 'center', 'right', 'center'],
          summaryRow: ['TOTAL PHARMACY CONTRIBUTION', `${filteredStaff.length} Staff`, totalStaffTxns, `${settings.currencySymbol || 'GH₵'} ${safeFixed(totalPharmacyRevenue)}`, '-', '-', '-', '100.0%', '-']
        }
      ],
      showSignOff: true,
      signOffTitle: 'Superintendent Pharmacist / HR Supervisor Sign-off',
      signOffRole: 'Superintendent Pharmacist'
    };

    setPrintModalOptions(reportConfig);
    setIsPrintModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Staff Performance & Dispensary Audit</h3>
            <p className="text-xs text-slate-500">
              Staff revenue contribution, transaction throughput, and prescription fulfillment efficiency.
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
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-blue-600" />
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Active Staff */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Staff Evaluated</p>
            <span className="p-1.5 bg-blue-50 text-blue-600 rounded-lg">
              <UserCheck className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-slate-900 mt-2">
            {users.length} Team Members
          </h3>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Pharmacists, Cashiers & Dispensers
          </p>
        </div>

        {/* Top Performer Spotlight */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Top Revenue Leader</p>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-xl font-black text-amber-600 mt-2 truncate">
            {topPerformer ? topPerformer.user.name : 'N/A'}
          </h3>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100 flex items-center justify-between">
            <span>{topPerformer ? `${settings.currencySymbol}${safeFixed(topPerformer.totalRevenue)}` : '-'}</span>
            <span className="font-semibold text-amber-700">{topPerformer ? `${topPerformer.totalTxns} txns` : ''}</span>
          </p>
        </div>

        {/* Total Dispensary Transactions */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Period Transactions</p>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 mt-2">
            {filteredSales.length} Invoices
          </h3>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Across physical POS and dispensary counters
          </p>
        </div>

        {/* Total Revenue Processed in Ghana Cedis */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Gross Staff Revenue</p>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-purple-700 mt-2">
            {settings.currencySymbol} {safeFixed(totalPharmacyRevenue)}
          </h3>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Total gross volume in Ghana Cedi
          </p>
        </div>
      </div>

      {/* Leaderboard Bars Visual Grid */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <h4 className="text-sm font-bold text-slate-900 flex items-center">
          <Award className="w-4 h-4 mr-2 text-amber-500" />
          Staff Revenue Contribution Leaderboard
        </h4>

        <div className="space-y-4 pt-1">
          {filteredStaff.map((staff, idx) => {
            return (
              <div key={staff.user.id} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                      #{idx + 1}
                    </span>
                    <span className="font-bold text-slate-900">{staff.user.name}</span>
                    <span className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-semibold uppercase">
                      {staff.user.role.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-slate-900">
                      {settings.currencySymbol}{safeFixed(staff.totalRevenue)}
                    </span>
                    <span className="text-slate-400 ml-1.5 text-[11px]">
                      ({safeFixed(staff.revenueContributionPct, 1)}% share • {staff.totalTxns} txns)
                    </span>
                  </div>
                </div>

                <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${
                      idx === 0
                        ? 'bg-amber-500'
                        : idx === 1
                        ? 'bg-emerald-500'
                        : idx === 2
                        ? 'bg-blue-500'
                        : 'bg-slate-400'
                    } rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(4, staff.revenueContributionPct)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Role Filters */}
        <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl text-xs font-semibold">
          {[
            { id: 'all', label: 'All Staff Roles' },
            { id: 'pharmacist', label: 'Pharmacists' },
            { id: 'cashier', label: 'Cashiers' },
            { id: 'dispensing_assistant', label: 'Dispensing Assistants' },
            { id: 'storekeeper', label: 'Storekeepers' },
            { id: 'admin', label: 'Administrators' }
          ].map(tab => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedRoleFilter(tab.id)}
              className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                selectedRoleFilter === tab.id
                  ? 'bg-white text-slate-900 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search staff name or role..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-blue-600"
          />
        </div>
      </div>

      {/* Performance Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Staff Member</th>
                <th className="py-3.5 px-4 font-semibold">Role</th>
                <th className="py-3.5 px-4 font-semibold text-center">Transactions</th>
                <th className="py-3.5 px-4 font-semibold text-right">Gross Sales (GH₵)</th>
                <th className="py-3.5 px-4 font-semibold text-right">Avg Order Value</th>
                <th className="py-3.5 px-4 font-semibold text-center">Units Dispensed</th>
                <th className="py-3.5 px-4 font-semibold text-center">Returns Handled</th>
                <th className="py-3.5 px-4 font-semibold text-center">Efficiency Tier</th>
                <th className="py-3.5 px-4 font-semibold text-center">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredStaff.map(staff => {
                return (
                  <tr key={staff.user.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Name */}
                    <td className="py-3 px-4 font-medium text-slate-900">
                      <div className="font-bold">{staff.user.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">{staff.user.email}</div>
                    </td>

                    {/* Role */}
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[10px] font-semibold uppercase">
                        {staff.user.role.replace('_', ' ')}
                      </span>
                    </td>

                    {/* Transactions */}
                    <td className="py-3 px-4 text-center font-bold text-slate-900">
                      {staff.totalTxns} txns
                    </td>

                    {/* Gross Sales */}
                    <td className="py-3 px-4 text-right font-black text-slate-900">
                      {settings.currencySymbol}{safeFixed(staff.totalRevenue)}
                    </td>

                    {/* AOV */}
                    <td className="py-3 px-4 text-right text-slate-600 font-medium">
                      {settings.currencySymbol}{safeFixed(staff.avgOrderValue)}
                    </td>

                    {/* Units Dispensed */}
                    <td className="py-3 px-4 text-center font-bold text-slate-800">
                      {staff.totalUnits} units
                    </td>

                    {/* Returns */}
                    <td className="py-3 px-4 text-center text-slate-600">
                      {staff.userReturnsCount > 0 ? (
                        <span className="text-rose-600 font-semibold">
                          {staff.userReturnsCount} ({settings.currencySymbol}{safeFixed(staff.totalRefundsProcessed)})
                        </span>
                      ) : (
                        <span className="text-slate-400">0</span>
                      )}
                    </td>

                    {/* Efficiency Tier */}
                    <td className="py-3 px-4 text-center">
                      {staff.tier === 'Top Performer' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <Award className="w-3 h-3 mr-1 text-amber-600" /> Top Performer
                        </span>
                      )}
                      {staff.tier === 'High Volume' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Zap className="w-3 h-3 mr-1 text-emerald-600" /> High Volume
                        </span>
                      )}
                      {staff.tier === 'Consistent' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          <CheckCircle2 className="w-3 h-3 mr-1 text-blue-600" /> Consistent
                        </span>
                      )}
                      {staff.tier === 'Standard' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                          Standard
                        </span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="py-3 px-4 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedStaffDetail(staff)}
                        className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                        title="View Staff Activity"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {filteredStaff.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-10 text-center text-slate-400 text-xs">
                    No staff members match the selected filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Staff Activity Modal */}
      {selectedStaffDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-5 bg-blue-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase tracking-widest text-blue-300 font-bold">Staff Activity Evaluation</span>
                <h3 className="text-base font-bold">{selectedStaffDetail.user.name}</h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStaffDetail(null)}
                className="p-1 text-blue-200 hover:text-white rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div>
                  <span className="text-slate-400 block text-[10px]">Role</span>
                  <strong className="text-slate-900 uppercase">{selectedStaffDetail.user.role.replace('_', ' ')}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Total Revenue</span>
                  <strong className="text-slate-900 font-mono">
                    {settings.currencySymbol}{safeFixed(selectedStaffDetail.totalRevenue)}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Invoices Handled</span>
                  <strong className="text-slate-900">{selectedStaffDetail.totalTxns}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Revenue Share</span>
                  <strong className="text-emerald-700 font-bold">
                    {safeFixed(selectedStaffDetail.revenueContributionPct, 1)}%
                  </strong>
                </div>
              </div>

              {/* Transactions List */}
              <div>
                <h5 className="text-xs font-bold text-slate-900 mb-2">Recent Invoices Processed by Staff</h5>
                <div className="border border-slate-200 rounded-xl overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-slate-100 text-slate-600 text-[10px] uppercase font-semibold">
                      <tr>
                        <th className="py-2.5 px-3">Invoice #</th>
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Customer</th>
                        <th className="py-2.5 px-3 text-center">Items</th>
                        <th className="py-2.5 px-3 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-800">
                      {selectedStaffDetail.userSales.slice(0, 10).map((sale: Sale) => (
                        <tr key={sale.id}>
                          <td className="py-2.5 px-3 font-mono font-bold">{sale.invoiceNumber}</td>
                          <td className="py-2.5 px-3 text-slate-500">
                            {new Date(sale.createdAt).toLocaleDateString('en-GB')}
                          </td>
                          <td className="py-2.5 px-3">{sale.customerName || 'Walk-in'}</td>
                          <td className="py-2.5 px-3 text-center">
                            {sale.items ? sale.items.reduce((s, i) => s + (Number(i.quantity) || 0), 0) : 0}
                          </td>
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            {settings.currencySymbol}{safeFixed(sale.grandTotal)}
                          </td>
                        </tr>
                      ))}

                      {selectedStaffDetail.userSales.length === 0 && (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-slate-400">
                            No sales transactions recorded for this staff member in the selected period.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-100 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedStaffDetail(null)}
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
