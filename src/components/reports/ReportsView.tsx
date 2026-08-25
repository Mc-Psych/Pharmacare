import React, { useState, useEffect } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { SalesReport } from './SalesReport';
import { FastSlowMovingReport } from './FastSlowMovingReport';
import { ReturnsRefundsReport } from './ReturnsRefundsReport';
import { StaffPerformanceReport } from './StaffPerformanceReport';
import { ExecutiveSummaryReport } from './ExecutiveSummaryReport';
import {
  BarChart3,
  TrendingUp,
  Zap,
  RotateCcw,
  Users,
  FileText,
  Lock
} from 'lucide-react';

export type ReportTab = 'sales' | 'velocity' | 'returns' | 'staff' | 'executive';

export const ReportsView: React.FC = () => {
  const { settings, currentUser, hasPermission } = usePharmacy();
  const canViewSalesReports = currentUser.role !== 'storekeeper' && hasPermission('view_sales_reports');

  // Available tabs filtered strictly by permissions & role
  const allTabs = [
    {
      id: 'sales' as ReportTab,
      label: 'Sales & Revenue',
      icon: TrendingUp,
      desc: 'Gross/Net revenue, profit margin, payment channels, invoice ledger',
      allowed: canViewSalesReports,
    },
    {
      id: 'velocity' as ReportTab,
      label: 'Fast & Slow Moving Drugs',
      icon: Zap,
      desc: 'Formulary turnover rates, stockout warnings & dormant capital',
      allowed: true,
    },
    {
      id: 'returns' as ReportTab,
      label: 'Returns & Restock Audit',
      icon: RotateCcw,
      desc: 'Disposed items, restock vs quarantine disposition logs',
      allowed: true,
    },
    {
      id: 'staff' as ReportTab,
      label: 'Staff Performance',
      icon: Users,
      desc: 'Pharmacist, cashier & dispenser throughput and contribution',
      allowed: canViewSalesReports,
    },
    {
      id: 'executive' as ReportTab,
      label: 'Executive Summary Brief',
      icon: FileText,
      desc: 'Combined audit summary with Ghana Pharmacy Council sign-offs',
      allowed: canViewSalesReports,
    }
  ];

  const visibleTabs = allTabs.filter(t => t.allowed);

  const [activeTab, setActiveTab] = useState<ReportTab>(() => {
    return canViewSalesReports ? 'sales' : 'velocity';
  });

  useEffect(() => {
    // If current tab is not allowed for user (e.g. storekeeper), switch to first available tab
    if (!visibleTabs.some(t => t.id === activeTab)) {
      setActiveTab(visibleTabs[0]?.id || 'velocity');
    }
  }, [canViewSalesReports, visibleTabs, activeTab]);

  const [dateRange, setDateRange] = useState<'today' | 'yesterday' | '7days' | '30days' | 'month' | 'all' | 'custom'>('30days');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');

  const gridColsClass = visibleTabs.length <= 2 
    ? 'grid-cols-1 sm:grid-cols-2 max-w-2xl' 
    : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5';

  return (
    <div className="space-y-6">
      {/* Top Banner & Title */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2.5">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <BarChart3 className="w-5 h-5" />
            </span>
            <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
              {currentUser.role === 'storekeeper' ? 'Inventory & Stock Velocity Reports' : 'Pharmacy Analytics & Reports'}
            </h2>
            <span className="px-2.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-[11px] font-black uppercase">
              {settings.currencyCode || 'GHS'} ({settings.currencySymbol || 'GH₵'})
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {currentUser.role === 'storekeeper'
              ? `Tracking ${settings.pharmacyName} inventory movement velocities, stockout alerts, and batch returns.`
              : `Auditing ${settings.pharmacyName} dispensary sales, inventory movement velocities, returns, and staff productivity.`}
          </p>
        </div>

        <div className="text-right text-xs text-slate-500 hidden sm:block">
          <div className="font-bold text-slate-800">{settings.pharmacyName}</div>
          <div className="text-[11px] text-slate-400">License: {settings.licenseNumber}</div>
        </div>
      </div>

      {/* Primary Report Tabs Bar */}
      <div className={`grid ${gridColsClass} gap-2.5`}>
        {visibleTabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isActive
                  ? 'bg-slate-900 border-slate-900 text-white shadow-md'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`p-1.5 rounded-lg ${isActive ? 'bg-white/10 text-emerald-400' : 'bg-slate-100 text-slate-600'}`}>
                  <Icon className="w-4 h-4" />
                </span>
                {isActive && (
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                )}
              </div>
              <div>
                <div className={`text-xs font-bold ${isActive ? 'text-white' : 'text-slate-900'}`}>
                  {tab.label}
                </div>
                <div className={`text-[10px] line-clamp-1 mt-0.5 ${isActive ? 'text-slate-300' : 'text-slate-400'}`}>
                  {tab.desc}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Active Tab View Rendering */}
      <div>
        {activeTab === 'sales' && canViewSalesReports && (
          <SalesReport
            dateRange={dateRange}
            setDateRange={setDateRange}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
          />
        )}

        {activeTab === 'velocity' && (
          <FastSlowMovingReport
            dateRange={dateRange}
            setDateRange={setDateRange}
          />
        )}

        {activeTab === 'returns' && (
          <ReturnsRefundsReport
            dateRange={dateRange}
            setDateRange={setDateRange}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
          />
        )}

        {activeTab === 'staff' && canViewSalesReports && (
          <StaffPerformanceReport
            dateRange={dateRange}
            setDateRange={setDateRange}
            customStartDate={customStartDate}
            setCustomStartDate={setCustomStartDate}
            customEndDate={customEndDate}
            setCustomEndDate={setCustomEndDate}
          />
        )}

        {activeTab === 'executive' && canViewSalesReports && (
          <ExecutiveSummaryReport
            dateRange={dateRange}
            customStartDate={customStartDate}
            customEndDate={customEndDate}
          />
        )}

        {activeTab === 'sales' && !canViewSalesReports && (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center max-w-md mx-auto my-8">
            <div className="w-12 h-12 bg-amber-100 text-amber-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">Access Restricted</h3>
            <p className="text-xs text-slate-500 mt-2">
              Storekeeper accounts do not have permission to view sales ledgers or revenue financial analytics.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

