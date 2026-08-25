import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { UserRole } from '../../types';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  FileCheck2,
  Boxes,
  Truck,
  Users2,
  RotateCcw,
  BarChart3,
  UserCog,
  ShieldAlert,
  Settings,
  BookOpen,
  ChevronRight,
  ChevronLeft,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from 'lucide-react';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tabId: string) => void;
}

interface NavItem {
  id: string;
  label: string;
  icon: React.ElementType;
  allowedRoles: UserRole[];
  badge?: number;
  badgeType?: 'danger' | 'warning' | 'info';
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  const {
    currentUser,
    lowStockMedicines,
    expiredBatches,
    prescriptions,
    purchaseOrders,
    logout,
    hasPermission,
  } = usePharmacy();

  const pendingRxCount = prescriptions.filter(p => p.status === 'pending').length;
  const criticalStockCount = lowStockMedicines.length + expiredBatches.length;
  const pendingPOCount = purchaseOrders.filter(p => p.status === 'pending').length;

  const navItems: NavItem[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      allowedRoles: ['admin', 'pharmacist', 'cashier', 'storekeeper', 'dispensing_assistant'],
    },
    {
      id: 'pos',
      label: 'POS Terminal',
      icon: ShoppingCart,
      allowedRoles: ['admin', 'pharmacist', 'cashier', 'dispensing_assistant'],
    },
    {
      id: 'medicines',
      label: 'Medicine Catalog',
      icon: Pill,
      allowedRoles: ['admin', 'pharmacist', 'storekeeper'],
    },
    {
      id: 'prescriptions',
      label: 'Prescriptions',
      icon: FileCheck2,
      badge: pendingRxCount,
      badgeType: 'info',
      allowedRoles: ['admin', 'pharmacist', 'dispensing_assistant'],
    },
    {
      id: 'inventory',
      label: 'Batches & Inventory',
      icon: Boxes,
      badge: criticalStockCount,
      badgeType: 'danger',
      allowedRoles: ['admin', 'pharmacist', 'storekeeper'],
    },
    {
      id: 'purchases',
      label: 'Purchases & Suppliers',
      icon: Truck,
      badge: pendingPOCount,
      badgeType: 'warning',
      allowedRoles: ['admin', 'pharmacist', 'storekeeper'],
    },
    {
      id: 'customers',
      label: 'Patient Records',
      icon: Users2,
      allowedRoles: ['admin', 'pharmacist', 'cashier', 'dispensing_assistant'],
    },
    {
      id: 'returns',
      label: 'Returns & Refunds',
      icon: RotateCcw,
      allowedRoles: ['admin', 'pharmacist'],
    },
    {
      id: 'reports',
      label: 'Reports & Analytics',
      icon: BarChart3,
      allowedRoles: ['admin', 'pharmacist', 'storekeeper'],
    },
    {
      id: 'users',
      label: 'User Management',
      icon: UserCog,
      allowedRoles: ['admin'],
    },
    {
      id: 'audit',
      label: 'Audit Trail',
      icon: ShieldAlert,
      allowedRoles: ['admin'],
    },
    {
      id: 'settings',
      label: 'Pharmacy Settings',
      icon: Settings,
      allowedRoles: ['admin'],
    },
    {
      id: 'docs',
      label: 'System Documentation',
      icon: BookOpen,
      allowedRoles: ['admin'],
    },
  ];

  // Filter items according to permissions & active role
  const visibleNavItems = navItems.filter((item) => {
    if (currentUser.role === 'admin') return true;

    // Direct permission overrides
    if (item.id === 'pos' && hasPermission('access_pos')) return true;
    if (item.id === 'medicines' && hasPermission('view_medicines')) return true;
    if (item.id === 'purchases' && hasPermission('manage_purchases')) return true;
    if (item.id === 'reports' && hasPermission('view_reports')) return true;

    return item.allowedRoles.includes(currentUser.role);
  });

  const roleInitials = currentUser?.name
    ? currentUser.name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'U';

  return (
    <aside
      className={`${
        isCollapsed ? 'w-20' : 'w-64'
      } bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800 shadow-xl select-none min-h-screen relative z-30 transition-all duration-200`}
    >
      {/* Brand Header with In-Sidebar Collapse Toggle */}
      <div className={`p-4 border-b border-slate-800/80 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
        {!isCollapsed ? (
          <>
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shadow-emerald-500/20 shrink-0 text-base">
                P
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-lg font-bold tracking-tight text-white truncate">PharmaCare</span>
                <span className="text-[10px] text-slate-400 font-medium tracking-wide truncate">PMS • Enterprise</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsCollapsed(true)}
              title="Collapse Sidebar"
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <PanelLeftClose className="w-4 h-4" />
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div className="w-9 h-9 bg-emerald-500 rounded-xl flex items-center justify-center font-bold text-white shadow-sm shadow-emerald-500/20 text-base">
              P
            </div>
            <button
              type="button"
              onClick={() => setIsCollapsed(false)}
              title="Expand Sidebar"
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <PanelLeftOpen className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Current User Role Banner (when expanded) */}
      {!isCollapsed && (
        <div className="px-4 pt-3 pb-1">
          <div className="flex items-center justify-between px-3 py-2 bg-slate-800/50 rounded-xl border border-slate-800">
            <div className="flex items-center space-x-2 min-w-0">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
              <span className="text-[11px] text-slate-300 font-medium truncate">
                Role: <strong className="text-white capitalize">{currentUser.role.replace('_', ' ')}</strong>
              </span>
            </div>
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-700 text-emerald-300 uppercase shrink-0">
              Active
            </span>
          </div>
        </div>
      )}

      {/* Navigation Links Scroll Container */}
      <nav className={`flex-1 overflow-y-auto ${isCollapsed ? 'px-2 py-3' : 'px-3 py-3'} space-y-1`}>
        {visibleNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              title={isCollapsed ? `${item.label} ${item.badge ? `(${item.badge})` : ''}` : undefined}
              className={`w-full flex items-center ${
                isCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between px-3 py-2.5'
              } rounded-xl font-medium text-xs transition-all duration-150 cursor-pointer relative group ${
                isActive
                  ? 'bg-emerald-600 text-white font-semibold shadow-md shadow-emerald-900/40 border border-emerald-500/30'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
              }`}
            >
              <div className="flex items-center space-x-3 min-w-0">
                <Icon
                  className={`w-4 h-4 shrink-0 transition-colors ${
                    isActive ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'
                  }`}
                />
                {!isCollapsed && <span className="truncate">{item.label}</span>}
              </div>

              {!isCollapsed && (
                <div className="flex items-center space-x-1.5 shrink-0">
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`px-1.5 py-0.5 text-[10px] font-bold rounded-full border ${
                        isActive
                          ? 'bg-white/20 text-white border-white/30'
                          : item.badgeType === 'danger'
                          ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          : item.badgeType === 'warning'
                          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                  {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400/80" />}
                </div>
              )}

              {/* Collapsed notification indicator badge */}
              {isCollapsed && item.badge !== undefined && item.badge > 0 && (
                <span
                  className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                    item.badgeType === 'danger'
                      ? 'bg-rose-500'
                      : item.badgeType === 'warning'
                      ? 'bg-amber-500'
                      : 'bg-emerald-400'
                  }`}
                />
              )}
            </button>
          );
        })}
      </nav>

      {/* User Profile & Footer with Logout (FEFO and currency details removed) */}
      <div className="p-3 border-t border-slate-800">
        {!isCollapsed ? (
          <div className="flex items-center justify-between p-2 bg-slate-800/50 rounded-xl border border-slate-800/60">
            <div className="flex items-center space-x-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-700/50 border border-emerald-600/30 flex items-center justify-center text-xs font-bold text-white shrink-0">
                {roleInitials || 'CK'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 capitalize truncate">{currentUser.role.replace('_', ' ')}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={logout}
              title="Log Out of Session"
              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-2">
            <div
              title={`${currentUser.name} (${currentUser.role})`}
              className="w-8 h-8 rounded-lg bg-emerald-700/50 border border-emerald-600/30 flex items-center justify-center text-xs font-bold text-white cursor-pointer"
            >
              {roleInitials || 'CK'}
            </div>
            <button
              type="button"
              onClick={logout}
              title="Log Out of Session"
              className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 rounded-lg transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </aside>
  );
};
