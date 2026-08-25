import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { Medicine, MedicineBatch } from '../../types';
import { safeFixed } from '../../utils/formatters';
import { printStructuredReport } from '../../utils/printReport';
import {
  Zap,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Download,
  Printer,
  FileSpreadsheet,
  Search,
  Filter,
  Package,
  Layers,
  Sparkles,
  ShieldAlert,
  CheckCircle2,
  Boxes,
  Percent,
  Calendar
} from 'lucide-react';

interface FastSlowMovingReportProps {
  dateRange: 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'all' | 'custom';
  setDateRange: (range: 'today' | 'yesterday' | '7days' | '30days' | 'month' | 'all' | 'custom') => void;
}

export type MovementClass = 'all' | 'fast' | 'steady' | 'slow' | 'dormant' | 'expiry_risk';

export const FastSlowMovingReport: React.FC<FastSlowMovingReportProps> = ({
  dateRange,
  setDateRange
}) => {
  const { medicines, batches, sales, categories, settings, currentUser } = usePharmacy();
  const [movementFilter, setMovementFilter] = useState<MovementClass>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Calculate day factor based on date range
  const daysInPeriod = useMemo(() => {
    switch (dateRange) {
      case 'today':
      case 'yesterday':
        return 1;
      case '7days':
        return 7;
      case '30days':
      case 'month':
        return 30;
      default:
        return 30; // fallback standard
    }
  }, [dateRange]);

  // Aggregate sales by medicine
  const velocityData = useMemo(() => {
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

    // 1. Filter sales by date range
    const periodSales = sales.filter(s => {
      if (s.status !== 'completed' && s.status !== 'partially_refunded') return false;
      const sTime = new Date(s.createdAt).getTime();

      if (dateRange === 'today') {
        return sTime >= todayMidnight;
      }
      if (dateRange === 'yesterday') {
        return sTime >= (todayMidnight - 86400000) && sTime < todayMidnight;
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
      return true;
    });

    // 2. Count units sold and revenue per medicine
    const soldMap: Record<string, { unitsSold: number; revenue: number; txnCount: number }> = {};
    periodSales.forEach(s => {
      s.items.forEach(item => {
        if (!soldMap[item.medicineId]) {
          soldMap[item.medicineId] = { unitsSold: 0, revenue: 0, txnCount: 0 };
        }
        soldMap[item.medicineId].unitsSold += item.quantity;
        soldMap[item.medicineId].revenue += item.total;
        soldMap[item.medicineId].txnCount += 1;
      });
    });

    // 3. Combine with medicines master list and current batches
    return medicines.map(med => {
      const soldStats = soldMap[med.id] || { unitsSold: 0, revenue: 0, txnCount: 0 };
      const medBatches = batches.filter(b => b.medicineId === med.id && b.remainingQuantity > 0);
      const totalStockOnHand = medBatches.reduce((sum, b) => sum + b.remainingQuantity, 0);
      const totalCapitalValueTiedUp = totalStockOnHand * med.purchasePrice;

      // Find nearest expiry date among active batches
      const sortedBatchesByExpiry = [...medBatches].sort(
        (a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()
      );
      const nearestExpiry = sortedBatchesByExpiry[0]?.expiryDate || null;
      let daysToNearestExpiry: number | null = null;
      if (nearestExpiry) {
        daysToNearestExpiry = Math.ceil(
          (new Date(nearestExpiry).getTime() - now.getTime()) / (1000 * 3600 * 24)
        );
      }

      // Run rate (units per day)
      const dailyRunRate = soldStats.unitsSold / daysInPeriod;
      const daysOfSupply = dailyRunRate > 0 ? Math.round(totalStockOnHand / dailyRunRate) : (totalStockOnHand > 0 ? 999 : 0);

      // Classification
      let classification: 'fast' | 'steady' | 'slow' | 'dormant' = 'dormant';
      if (soldStats.unitsSold >= 5) {
        classification = 'fast';
      } else if (soldStats.unitsSold >= 2) {
        classification = 'steady';
      } else if (soldStats.unitsSold >= 1) {
        classification = 'slow';
      } else {
        classification = 'dormant';
      }

      // Expiry risk flag (< 90 days with remaining stock)
      const isExpiryRisk = daysToNearestExpiry !== null && daysToNearestExpiry <= 90 && totalStockOnHand > 0;

      // Stockout risk flag for fast movers
      let stockoutStatus: 'critical' | 'warning' | 'healthy' | 'overstocked' = 'healthy';
      if (dailyRunRate > 0) {
        if (daysOfSupply < 7) stockoutStatus = 'critical';
        else if (daysOfSupply < 15) stockoutStatus = 'warning';
        else if (daysOfSupply > 60 && classification === 'slow') stockoutStatus = 'overstocked';
      }

      // Reorder Recommendation
      const suggestedReorderQty = dailyRunRate > 0 && daysOfSupply < 20
        ? Math.ceil(dailyRunRate * 30 - totalStockOnHand)
        : 0;

      return {
        medicine: med,
        unitsSold: soldStats.unitsSold,
        revenue: soldStats.revenue,
        txnCount: soldStats.txnCount,
        totalStockOnHand,
        totalCapitalValueTiedUp,
        dailyRunRate,
        daysOfSupply,
        classification,
        isExpiryRisk,
        stockoutStatus,
        suggestedReorderQty: Math.max(0, suggestedReorderQty),
        nearestExpiry,
        daysToNearestExpiry
      };
    });
  }, [medicines, batches, sales, dateRange, daysInPeriod]);

  // Key Summary Metrics
  const fastMovingItems = useMemo(() => velocityData.filter(v => v.classification === 'fast'), [velocityData]);
  const slowMovingItems = useMemo(() => velocityData.filter(v => v.classification === 'slow'), [velocityData]);
  const dormantItems = useMemo(() => velocityData.filter(v => v.classification === 'dormant'), [velocityData]);
  const expiryRiskItems = useMemo(() => velocityData.filter(v => v.isExpiryRisk), [velocityData]);

  const totalDormantCapital = useMemo(() => {
    return [...slowMovingItems, ...dormantItems].reduce((sum, v) => sum + v.totalCapitalValueTiedUp, 0);
  }, [slowMovingItems, dormantItems]);

  const totalRevenueVelocity = useMemo(() => {
    return velocityData.reduce((sum, v) => sum + v.revenue, 0);
  }, [velocityData]);

  // Filtered rows for table view
  const filteredList = useMemo(() => {
    return velocityData
      .filter(item => {
        // Category Filter
        if (selectedCategory !== 'all' && item.medicine.categoryId !== selectedCategory) {
          return false;
        }

        // Movement Filter
        if (movementFilter === 'fast' && item.classification !== 'fast') return false;
        if (movementFilter === 'steady' && item.classification !== 'steady') return false;
        if (movementFilter === 'slow' && item.classification !== 'slow') return false;
        if (movementFilter === 'dormant' && item.classification !== 'dormant') return false;
        if (movementFilter === 'expiry_risk' && !item.isExpiryRisk) return false;

        // Search Query
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase();
          const match =
            item.medicine.name.toLowerCase().includes(q) ||
            item.medicine.genericName.toLowerCase().includes(q) ||
            item.medicine.code.toLowerCase().includes(q) ||
            item.medicine.categoryName.toLowerCase().includes(q);
          if (!match) return false;
        }

        return true;
      })
      .sort((a, b) => {
        if (movementFilter === 'slow' || movementFilter === 'dormant') {
          return b.totalCapitalValueTiedUp - a.totalCapitalValueTiedUp;
        }
        if (movementFilter === 'expiry_risk') {
          return (a.daysToNearestExpiry || 999) - (b.daysToNearestExpiry || 999);
        }
        return b.unitsSold - a.unitsSold || b.revenue - a.revenue;
      });
  }, [velocityData, selectedCategory, movementFilter, searchQuery]);

  // CSV Export
  const handleExportCSV = () => {
    const headers = [
      'Medicine Code',
      'Medicine Name',
      'Generic Name',
      'Category',
      'Movement Classification',
      'Units Dispensed (Period)',
      'Revenue Generated (GHS)',
      'Current Stock On Hand',
      'Capital Tied Up (GHS)',
      'Estimated Days of Supply',
      'Stockout Risk Status',
      'Nearest Expiry Date',
      'Days to Expiry',
      'Suggested Reorder Qty'
    ];

    const rows = filteredList.map(item => [
      item.medicine.code,
      `"${item.medicine.name}"`,
      `"${item.medicine.genericName}"`,
      `"${item.medicine.categoryName}"`,
      item.classification.toUpperCase(),
      item.unitsSold,
      safeFixed(item.revenue),
      item.totalStockOnHand,
      safeFixed(item.totalCapitalValueTiedUp),
      item.daysOfSupply === 999 ? 'Over 1 Year (No Demand)' : `${item.daysOfSupply} Days`,
      item.stockoutStatus.toUpperCase(),
      item.nearestExpiry || 'N/A',
      item.daysToNearestExpiry !== null ? item.daysToNearestExpiry : 'N/A',
      item.suggestedReorderQty
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PharmaCare_Medicine_Velocity_Report_${movementFilter}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    const rangeLabelMap: Record<string, string> = {
      today: 'Today',
      yesterday: 'Yesterday',
      '7days': 'Last 7 Days',
      '30days': 'Last 30 Days',
      month: 'This Month',
      all: 'All Time Historical'
    };

    const tableRows = filteredList.slice(0, 150).map(item => [
      item.medicine.name,
      item.medicine.genericName || '-',
      item.medicine.categoryName,
      item.classification.toUpperCase(),
      item.unitsSold,
      item.totalStockOnHand,
      `${settings.currencySymbol || 'GH₵'} ${safeFixed(item.totalCapitalValueTiedUp)}`,
      item.daysOfSupply === 999 ? 'No Demand' : `${item.daysOfSupply}d`,
      item.stockoutStatus.toUpperCase(),
      item.suggestedReorderQty > 0 ? `${item.suggestedReorderQty} units` : '-'
    ]);

    printStructuredReport({
      title: 'Stock Velocity & Inventory Turnover Report',
      subtitle: `Formulary movement velocity, stockout forecasts, and tied-up capital analysis (${movementFilter.toUpperCase()} filter applied)`,
      pharmacySettings: settings,
      generatedBy: `${currentUser.name} (${currentUser.role.toUpperCase()})`,
      dateRangeLabel: rangeLabelMap[dateRange] || dateRange,
      kpiCards: [
        { label: 'Total Active SKUs', value: `${medicines.length}`, subtext: 'Catalogued formulations' },
        { label: 'Fast Velocity SKUs', value: `${fastMovingItems.length}`, subtext: 'High turnover rate' },
        { label: 'Slow / Dormant SKUs', value: `${slowMovingItems.length + dormantItems.length}`, subtext: 'Low demand velocity' },
        { label: 'Dormant Capital Tied-up', value: `${settings.currencySymbol || 'GH₵'} ${safeFixed(totalDormantCapital)}`, subtext: 'Illiquid inventory value' }
      ],
      tables: [
        {
          title: `Medicine Velocity & Inventory Stock (Showing ${tableRows.length} of ${filteredList.length} items)`,
          headers: ['Medicine Name', 'Generic Name', 'Category', 'Velocity', 'Units Sold', 'Stock On Hand', 'Tied-up Capital', 'Days Supply', 'Risk Status', 'Reorder Suggestion'],
          rows: tableRows,
          alignments: ['left', 'left', 'left', 'center', 'center', 'center', 'right', 'center', 'center', 'center']
        }
      ],
      showSignOff: true,
      signOffTitle: 'Warehouse Storekeeper & Inventory Auditor Sign-off',
      signOffRole: currentUser.role === 'storekeeper' ? 'Head Storekeeper' : 'Superintendent Pharmacist'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header & Quick Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-amber-50 text-amber-600 rounded-xl">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900">Fast & Slow Moving Medicine Report</h3>
            <p className="text-xs text-slate-500">
              Inventory turnover velocity, stockout forecast warnings, and dormant capital alerts.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Date Selector */}
          <div className="flex bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
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
            <FileSpreadsheet className="w-3.5 h-3.5 mr-1.5 text-amber-600" />
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
        {/* Fast Moving */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Fast-Moving Items</p>
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-emerald-600 mt-2">
            {fastMovingItems.length} SKUs
          </h3>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Driving high volume & repeat dispensary flow
          </p>
        </div>

        {/* Slow Moving */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Slow & Dormant Items</p>
            <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-amber-600 mt-2">
            {slowMovingItems.length + dormantItems.length} SKUs
          </h3>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            {dormantItems.length} zero-movement dormant drugs
          </p>
        </div>

        {/* Capital Tied Up in Ghana Cedis */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Slow-Stock Capital</p>
            <span className="p-1.5 bg-rose-50 text-rose-600 rounded-lg">
              <Boxes className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-rose-600 mt-2">
            {settings.currencySymbol} {safeFixed(totalDormantCapital)}
          </h3>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Capital tied in non-moving dispensary inventory
          </p>
        </div>

        {/* Expiry Risk Alerts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex justify-between items-start">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Near-Expiry Warning</p>
            <span className="p-1.5 bg-purple-50 text-purple-600 rounded-lg">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <h3 className="text-2xl font-black text-purple-700 mt-2">
            {expiryRiskItems.length} SKUs
          </h3>
          <p className="text-xs text-slate-500 mt-2 pt-2 border-t border-slate-100">
            Expiring within ≤ 90 days with active stock
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Controls */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Classification Filter Tabs */}
          <div className="flex flex-wrap bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            {[
              { id: 'all', label: `All Drugs (${velocityData.length})` },
              { id: 'fast', label: `⚡ Fast Movers (${fastMovingItems.length})` },
              { id: 'steady', label: 'Regular Movers' },
              { id: 'slow', label: `⚠️ Slow Movers (${slowMovingItems.length})` },
              { id: 'dormant', label: `🛑 Dormant (${dormantItems.length})` },
              { id: 'expiry_risk', label: `⏳ Expiry Risk (${expiryRiskItems.length})` }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setMovementFilter(tab.id as MovementClass)}
                className={`px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                  movementFilter === tab.id
                    ? 'bg-white text-slate-900 shadow-xs font-bold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[200px]">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search medication name, code..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-amber-600"
              />
            </div>

            <select
              value={selectedCategory}
              onChange={e => setSelectedCategory(e.target.value)}
              className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-amber-600"
            >
              <option value="all">All Therapeutic Categories</option>
              {categories.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Velocity Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4 font-semibold">Medicine Formulation</th>
                <th className="py-3.5 px-4 font-semibold">Category</th>
                <th className="py-3.5 px-4 font-semibold text-center">Velocity Classification</th>
                <th className="py-3.5 px-4 font-semibold text-center">Units Sold</th>
                <th className="py-3.5 px-4 font-semibold text-right">Revenue Contributed</th>
                <th className="py-3.5 px-4 font-semibold text-center">Stock On Hand</th>
                <th className="py-3.5 px-4 font-semibold text-right">Capital Tied Up</th>
                <th className="py-3.5 px-4 font-semibold text-center">Supply Runway</th>
                <th className="py-3.5 px-4 font-semibold text-center">Stock / Expiry Alert</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredList.map(item => {
                return (
                  <tr key={item.medicine.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* Medicine */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900">{item.medicine.name}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {item.medicine.code} • {item.medicine.genericName}
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-3.5 px-4 text-slate-600">
                      <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md text-[10px] font-medium">
                        {item.medicine.categoryName}
                      </span>
                    </td>

                    {/* Velocity Badge */}
                    <td className="py-3.5 px-4 text-center">
                      {item.classification === 'fast' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          <Zap className="w-3 h-3 mr-1 text-emerald-600" /> Fast Moving
                        </span>
                      )}
                      {item.classification === 'steady' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800">
                          <TrendingUp className="w-3 h-3 mr-1 text-blue-600" /> Steady
                        </span>
                      )}
                      {item.classification === 'slow' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                          <TrendingDown className="w-3 h-3 mr-1 text-amber-600" /> Slow Moving
                        </span>
                      )}
                      {item.classification === 'dormant' && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-800">
                          🛑 Dormant (0 sold)
                        </span>
                      )}
                    </td>

                    {/* Units Sold */}
                    <td className="py-3.5 px-4 text-center font-bold text-slate-900">
                      {item.unitsSold} units
                      {item.dailyRunRate > 0 && (
                        <span className="block text-[9px] text-slate-400 font-normal">
                          ({safeFixed(item.dailyRunRate, 1)}/day)
                        </span>
                      )}
                    </td>

                    {/* Revenue */}
                    <td className="py-3.5 px-4 text-right font-bold text-slate-900">
                      {settings.currencySymbol}{safeFixed(item.revenue)}
                    </td>

                    {/* Stock On Hand */}
                    <td className="py-3.5 px-4 text-center font-extrabold text-slate-800">
                      {item.totalStockOnHand} units
                    </td>

                    {/* Capital Value */}
                    <td className="py-3.5 px-4 text-right font-medium text-slate-700">
                      {settings.currencySymbol}{safeFixed(item.totalCapitalValueTiedUp)}
                    </td>

                    {/* Days of Supply */}
                    <td className="py-3.5 px-4 text-center">
                      {item.classification === 'dormant' ? (
                        <span className="text-[10px] text-slate-400">No recent velocity</span>
                      ) : (
                        <span className={`font-bold ${item.daysOfSupply < 15 ? 'text-rose-600 font-mono' : 'text-slate-700'}`}>
                          {item.daysOfSupply} days
                        </span>
                      )}
                    </td>

                    {/* Alerts / Reorder Action */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center space-y-1">
                        {item.stockoutStatus === 'critical' && (
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[9px] flex items-center">
                            <AlertTriangle className="w-2.5 h-2.5 mr-1" /> Reorder Now (+{item.suggestedReorderQty})
                          </span>
                        )}
                        {item.stockoutStatus === 'warning' && (
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[9px]">
                            Low Stock Warning
                          </span>
                        )}
                        {item.isExpiryRisk && (
                          <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded font-bold text-[9px]">
                            Expires in {item.daysToNearestExpiry}d
                          </span>
                        )}
                        {item.classification === 'dormant' && item.totalStockOnHand > 0 && (
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded font-medium text-[9px]">
                            Consider Clearance
                          </span>
                        )}
                        {!item.isExpiryRisk && item.stockoutStatus === 'healthy' && item.classification !== 'dormant' && (
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Optimal
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredList.length === 0 && (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No medications match the specified velocity classification and filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
