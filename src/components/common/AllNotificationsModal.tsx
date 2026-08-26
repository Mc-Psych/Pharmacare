import React, { useState, useMemo } from 'react';
import { NotificationItem } from '../../types';
import { usePharmacy } from '../../context/PharmacyContext';
import {
  X,
  Search,
  Bell,
  CheckCheck,
  Trash2,
  AlertTriangle,
  ShoppingCart,
  Boxes,
  FileCheck2,
  Truck,
  ShieldAlert,
  Info,
  Clock,
  ExternalLink,
  Filter
} from 'lucide-react';

interface AllNotificationsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectNotification: (notification: NotificationItem) => void;
  onNavigateTab: (tabId: string) => void;
}

export const AllNotificationsModal: React.FC<AllNotificationsModalProps> = ({
  isOpen,
  onClose,
  onSelectNotification,
  onNavigateTab,
}) => {
  const {
    notifications,
    markNotificationRead,
    clearAllNotifications,
    deleteNotification,
  } = usePharmacy();

  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'all' | 'unread' | 'danger' | 'warning' | 'info'>('all');

  const filteredNotifications = useMemo(() => {
    return notifications.filter((n) => {
      // Filter by type / status
      if (activeFilter === 'unread' && n.isRead) return false;
      if (activeFilter === 'danger' && n.type !== 'danger') return false;
      if (activeFilter === 'warning' && n.type !== 'warning') return false;
      if (activeFilter === 'info' && n.type !== 'info' && n.type !== 'success') return false;

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = n.title.toLowerCase().includes(q);
        const matchesMsg = n.message.toLowerCase().includes(q);
        const matchesModule = (n.module || '').toLowerCase().includes(q);
        return matchesTitle || matchesMsg || matchesModule;
      }

      return true;
    });
  }, [notifications, activeFilter, searchQuery]);

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const getModuleIcon = (module?: string) => {
    switch (module) {
      case 'pos':
        return <ShoppingCart className="w-3.5 h-3.5" />;
      case 'inventory':
        return <Boxes className="w-3.5 h-3.5" />;
      case 'expiry':
        return <AlertTriangle className="w-3.5 h-3.5" />;
      case 'prescription':
        return <FileCheck2 className="w-3.5 h-3.5" />;
      case 'purchase':
        return <Truck className="w-3.5 h-3.5" />;
      default:
        return <ShieldAlert className="w-3.5 h-3.5" />;
    }
  };

  return (
    <div
      id="all-notifications-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="all-notifications-card"
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-100 text-emerald-700 rounded-2xl border border-emerald-200">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-base font-bold text-slate-900">System & Activity Notifications</h3>
                {unreadCount > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md">
                    {unreadCount} Unread
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Click any notification to read the full details, take direct action, or manage alerts.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Filters */}
        <div className="p-4 border-b border-slate-100 bg-white space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search alerts by drug name, batch, description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={clearAllNotifications}
                className="inline-flex items-center px-3 py-2 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-xl transition-colors shrink-0 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5 mr-1.5" />
                Mark All Read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ${
                activeFilter === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All ({notifications.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('unread')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ${
                activeFilter === 'unread'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Unread ({unreadCount})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('danger')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ${
                activeFilter === 'danger'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Critical / Expired ({notifications.filter(n => n.type === 'danger').length})
            </button>

            <button
              type="button"
              onClick={() => setActiveFilter('warning')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer shrink-0 ${
                activeFilter === 'warning'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Warnings & Low Stock ({notifications.filter(n => n.type === 'warning').length})
            </button>
          </div>
        </div>

        {/* List of Notifications */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100 p-2">
          {filteredNotifications.length === 0 ? (
            <div className="p-12 text-center text-slate-500">
              <Bell className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-sm font-semibold text-slate-700">No notifications found</p>
              <p className="text-xs text-slate-400 mt-1">
                {searchQuery ? 'Try adjusting your search criteria.' : 'There are no active notifications in this view.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  onSelectNotification(n);
                  markNotificationRead(n.id);
                }}
                className={`p-4 rounded-2xl hover:bg-slate-50 transition-colors cursor-pointer flex items-start justify-between gap-3 group ${
                  !n.isRead ? 'bg-emerald-50/40 border border-emerald-100/60 my-1' : ''
                }`}
              >
                <div className="flex items-start space-x-3.5 flex-1 min-w-0">
                  <div className="mt-0.5 shrink-0">
                    {n.type === 'danger' ? (
                      <div className="p-2 bg-red-100 text-red-600 rounded-xl">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : n.type === 'warning' ? (
                      <div className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                        <AlertTriangle className="w-4 h-4" />
                      </div>
                    ) : n.module === 'pos' ? (
                      <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                        <ShoppingCart className="w-4 h-4" />
                      </div>
                    ) : (
                      <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                        <Info className="w-4 h-4" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h4 className="text-xs font-bold text-slate-800 truncate">{n.title}</h4>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0"></span>
                      )}
                    </div>
                    <p className="text-xs text-slate-600 mt-1 line-clamp-2 leading-relaxed">
                      {n.message}
                    </p>

                    <div className="flex items-center space-x-3 text-[10px] text-slate-400 mt-2">
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {new Date(n.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric' })} at{' '}
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {n.module && (
                        <span className="font-semibold uppercase tracking-wider text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">
                          {n.module}
                        </span>
                      )}
                      <span className="text-emerald-600 font-semibold group-hover:underline flex items-center">
                        Open & Read Fully &rarr;
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1 shrink-0 opacity-80 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(n.id);
                    }}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Dismiss / Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Showing {filteredNotifications.length} notification(s)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-bold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
