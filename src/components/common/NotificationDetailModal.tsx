import React from 'react';
import { NotificationItem } from '../../types';
import { usePharmacy } from '../../context/PharmacyContext';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  ShoppingCart,
  Clock,
  ExternalLink,
  Trash2,
  Mail,
  MailOpen,
  Boxes,
  FileCheck2,
  Truck,
  ShieldAlert,
  Info
} from 'lucide-react';

interface NotificationDetailModalProps {
  notification: NotificationItem | null;
  isOpen: boolean;
  onClose: () => void;
  onNavigateTab?: (tabId: string) => void;
}

export const NotificationDetailModal: React.FC<NotificationDetailModalProps> = ({
  notification,
  isOpen,
  onClose,
  onNavigateTab,
}) => {
  const { markNotificationRead, toggleNotificationRead, deleteNotification } = usePharmacy();

  if (!isOpen || !notification) return null;

  const getModuleBadge = (module?: string) => {
    switch (module) {
      case 'inventory':
        return { label: 'Batches & Inventory', icon: Boxes, color: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'expiry':
        return { label: 'Expiry & Quarantine', icon: AlertTriangle, color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'prescription':
        return { label: 'Prescription Queue', icon: FileCheck2, color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'pos':
        return { label: 'POS Terminal', icon: ShoppingCart, color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      case 'purchase':
        return { label: 'Purchases & Suppliers', icon: Truck, color: 'bg-purple-50 text-purple-700 border-purple-200' };
      case 'system':
      default:
        return { label: 'System Alert', icon: ShieldAlert, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const getSeverityConfig = (type?: string) => {
    switch (type) {
      case 'danger':
        return {
          title: 'Critical Alert',
          icon: AlertTriangle,
          badgeBg: 'bg-red-100 text-red-700 border-red-200',
          iconColor: 'text-red-600',
          containerBg: 'bg-red-50/50 border-red-100',
        };
      case 'warning':
        return {
          title: 'Warning Notice',
          icon: AlertTriangle,
          badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
          iconColor: 'text-amber-600',
          containerBg: 'bg-amber-50/50 border-amber-100',
        };
      case 'info':
        return {
          title: 'Information',
          icon: Info,
          badgeBg: 'bg-blue-100 text-blue-800 border-blue-200',
          iconColor: 'text-blue-600',
          containerBg: 'bg-blue-50/50 border-blue-100',
        };
      case 'success':
      default:
        return {
          title: 'System Notice',
          icon: CheckCircle2,
          badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          iconColor: 'text-emerald-600',
          containerBg: 'bg-emerald-50/50 border-emerald-100',
        };
    }
  };

  const moduleInfo = getModuleBadge(notification.module);
  const severityInfo = getSeverityConfig(notification.type);
  const ModuleIcon = moduleInfo.icon;
  const SeverityIcon = severityInfo.icon;

  const formattedDate = new Date(notification.createdAt).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });

  const formattedTime = new Date(notification.createdAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const handleActionClick = () => {
    markNotificationRead(notification.id);
    if (notification.linkTab && onNavigateTab) {
      onNavigateTab(notification.linkTab);
    }
    onClose();
  };

  const handleDelete = () => {
    deleteNotification(notification.id);
    onClose();
  };

  const getActionLabel = (tab?: string) => {
    switch (tab) {
      case 'inventory':
        return 'Go to Batches & Inventory';
      case 'prescriptions':
        return 'Open Prescriptions Queue';
      case 'purchases':
        return 'Open Purchases & Orders';
      case 'pos':
        return 'Open POS Terminal';
      case 'medicines':
        return 'Open Medicine Catalog';
      case 'reports':
        return 'View Financial & Audit Reports';
      default:
        return 'Go to Module';
    }
  };

  return (
    <div
      id="notification-detail-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        id="notification-detail-card"
        className="bg-white w-full max-w-lg rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-150"
      >
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
          <div className="flex items-center space-x-3">
            <div className={`p-2.5 rounded-2xl border ${severityInfo.badgeBg} flex items-center justify-center`}>
              <SeverityIcon className={`w-5 h-5 ${severityInfo.iconColor}`} />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`px-2.5 py-0.5 rounded-md text-[11px] font-bold border ${moduleInfo.color} inline-flex items-center gap-1`}>
                  <ModuleIcon className="w-3 h-3" />
                  {moduleInfo.label}
                </span>
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold border ${severityInfo.badgeBg}`}>
                  {severityInfo.title}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-[11px] text-slate-400 mt-1">
                <Clock className="w-3.5 h-3.5" />
                <span>{formattedDate} • {formattedTime}</span>
              </div>
            </div>
          </div>

          <button
            id="close-notification-modal-btn"
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body: Full Content */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="space-y-1.5">
            <h3 className="text-base font-bold text-slate-900 leading-snug">
              {notification.title}
            </h3>
            <div className="flex items-center space-x-2 pt-1">
              <span className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-md ${
                notification.isRead 
                  ? 'bg-slate-100 text-slate-600 border border-slate-200' 
                  : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }`}>
                {notification.isRead ? 'Status: Read' : 'Status: New / Unread'}
              </span>
            </div>
          </div>

          {/* Full Notification Message Body */}
          <div className={`p-4 rounded-2xl border ${severityInfo.containerBg} text-slate-700 text-sm leading-relaxed whitespace-pre-wrap`}>
            {notification.message}
          </div>

          {/* Context Advisory Box */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 text-xs text-slate-600 flex items-start space-x-2.5">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-slate-800">Pharmacy Clinical Notice</p>
              <p className="text-slate-500 mt-0.5">
                This notice was logged automatically based on active dispensary inventory thresholds, batch lot tracking, or user session activity.
              </p>
            </div>
          </div>
        </div>

        {/* Modal Footer / Actions */}
        <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              id="toggle-read-notification-btn"
              type="button"
              onClick={() => toggleNotificationRead(notification.id)}
              className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer w-full sm:w-auto"
            >
              {notification.isRead ? (
                <>
                  <Mail className="w-3.5 h-3.5 mr-1.5 text-slate-500" />
                  Mark as Unread
                </>
              ) : (
                <>
                  <MailOpen className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Mark as Read
                </>
              )}
            </button>

            <button
              id="delete-notification-btn"
              type="button"
              onClick={handleDelete}
              className="inline-flex items-center justify-center px-3 py-2 text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors cursor-pointer w-full sm:w-auto"
              title="Delete Notification"
            >
              <Trash2 className="w-3.5 h-3.5 mr-1.5" />
              Delete
            </button>
          </div>

          <div className="flex items-center space-x-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              Close
            </button>

            {notification.linkTab && (
              <button
                id="navigate-module-notification-btn"
                type="button"
                onClick={handleActionClick}
                className="inline-flex items-center justify-center px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm rounded-xl transition-colors cursor-pointer"
              >
                <span>{getActionLabel(notification.linkTab)}</span>
                <ExternalLink className="w-3.5 h-3.5 ml-1.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
