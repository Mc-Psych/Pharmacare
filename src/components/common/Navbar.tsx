import React, { useState, useRef, useEffect } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { NotificationItem } from '../../types';
import { NotificationDetailModal } from './NotificationDetailModal';
import { AllNotificationsModal } from './AllNotificationsModal';
import { 
  Bell, 
  Lock, 
  ChevronDown, 
  AlertTriangle, 
  CheckCircle2, 
  CheckCheck, 
  LogOut, 
  ShoppingCart, 
  Info, 
  Clock,
  Eye,
  ListFilter
} from 'lucide-react';

interface NavbarProps {
  onLockScreen: () => void;
  onNavigateTab: (tabId: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  onLockScreen, 
  onNavigateTab, 
}) => {
  const { 
    currentUser, 
    notifications, 
    markNotificationRead, 
    clearAllNotifications, 
    logout, 
    settings, 
  } = usePharmacy();

  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<NotificationItem | null>(null);
  const [isAllNotifsOpen, setIsAllNotifsOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const unreadNotifications = notifications.filter(n => !n.isRead);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleOpenNotification = (n: NotificationItem) => {
    markNotificationRead(n.id);
    setSelectedNotification(n);
    setIsNotifOpen(false);
  };

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 shadow-xs z-20 shrink-0 gap-4">
        {/* Left side: System Status / Pharmacy Branding Info */}
        <div className="flex items-center space-x-3">
          {(settings.systemLogo || settings.logoUrl) && (
            <div 
              style={{
                width: `${Math.min(Math.max(settings.logoSize || 40, 28), 56)}px`,
                height: `${Math.min(Math.max(settings.logoSize || 40, 28), 56)}px`
              }}
              className="rounded-xl overflow-hidden border border-slate-200 bg-white p-0.5 shrink-0 flex items-center justify-center transition-all shadow-2xs"
            >
              <img
                src={settings.systemLogo || settings.logoUrl}
                alt={settings.systemName || settings.pharmacyName || 'System Logo'}
                className="max-h-full max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          )}
          <div className="flex flex-col min-w-0">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-bold text-slate-800 tracking-tight truncate max-w-xs sm:max-w-md">
                {settings.systemName || settings.pharmacyName || 'PharmaCare Pharmacy'}
              </span>
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1.5 animate-pulse"></span>
                Live Terminal
              </span>
            </div>
            <span className="text-[11px] text-slate-400 font-medium truncate">
              {settings.pharmacyName ? `${settings.pharmacyName} • ` : ''}Clinical Dispensing & Inventory System
            </span>
          </div>
        </div>

        {/* Right Action Cluster */}
        <div className="flex items-center space-x-4 sm:space-x-6">
          {/* User Account Notifications Bell */}
          <div className="relative" ref={notifRef}>
            <button
              id="navbar-notifications-bell-btn"
              type="button"
              onClick={() => setIsNotifOpen(!isNotifOpen)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors focus:outline-none cursor-pointer border border-transparent hover:border-slate-200"
              title="Account Notifications & System Alerts"
            >
              <Bell className="w-5 h-5 text-slate-700" />
              {unreadNotifications.length > 0 && (
                <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-600 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-white font-bold shadow-xs">
                  {unreadNotifications.length}
                </span>
              )}
            </button>

            {/* Notifications Dropdown */}
            {isNotifOpen && (
              <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="flex items-center justify-between px-4 py-3.5 bg-slate-50 border-b border-slate-100">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                      System Notifications
                    </h4>
                    {unreadNotifications.length > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-md">
                        {unreadNotifications.length} New
                      </span>
                    )}
                  </div>
                  {unreadNotifications.length > 0 && (
                    <button
                      type="button"
                      onClick={clearAllNotifications}
                      className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 uppercase flex items-center cursor-pointer"
                    >
                      <CheckCheck className="w-3 h-3 mr-1" />
                      Mark all read
                    </button>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {notifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-xs">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                      <p className="font-semibold text-slate-700">All caught up!</p>
                      <p className="text-slate-400 mt-0.5">No active alerts or notifications.</p>
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleOpenNotification(n)}
                        className={`p-3.5 hover:bg-slate-50 transition-colors cursor-pointer flex items-start space-x-3 group relative ${
                          !n.isRead ? 'bg-emerald-50/40' : ''
                        }`}
                        title="Click to open and read full notification"
                      >
                        <div className="mt-0.5 shrink-0">
                          {n.module === 'pos' ? (
                            <div className="p-1.5 bg-emerald-100 text-emerald-700 rounded-lg">
                              <ShoppingCart className="w-3.5 h-3.5" />
                            </div>
                          ) : n.type === 'danger' ? (
                            <div className="p-1.5 bg-red-100 text-red-600 rounded-lg">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                          ) : n.type === 'warning' ? (
                            <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                              <AlertTriangle className="w-3.5 h-3.5" />
                            </div>
                          ) : (
                            <div className="p-1.5 bg-indigo-100 text-indigo-700 rounded-lg">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-bold text-slate-800 truncate">{n.title}</p>
                            {!n.isRead && (
                              <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0 ml-1.5"></span>
                            )}
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-2 mt-0.5 leading-relaxed">
                            {n.message}
                          </p>
                          <div className="flex items-center justify-between mt-1 text-[9px] text-slate-400">
                            <div className="flex items-center space-x-1">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <span className="text-emerald-600 font-bold opacity-0 group-hover:opacity-100 transition-opacity flex items-center">
                              <Eye className="w-2.5 h-2.5 mr-0.5" />
                              Read Full
                            </span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Footer with Open All Notifications link */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotifOpen(false);
                      setIsAllNotifsOpen(true);
                    }}
                    className="text-xs font-bold text-emerald-700 hover:text-emerald-800 py-1 px-3 rounded-lg hover:bg-emerald-50 transition-colors flex items-center cursor-pointer"
                  >
                    <ListFilter className="w-3.5 h-3.5 mr-1.5" />
                    View & Search All Notifications ({notifications.length})
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Lock Screen Button */}
          <button
            type="button"
            onClick={onLockScreen}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer border border-transparent hover:border-slate-200"
            title="Lock Screen"
          >
            <Lock className="w-4 h-4" />
          </button>

          {/* Vertical Divider */}
          <div className="h-8 w-px bg-slate-200 hidden sm:block"></div>

          {/* Offline Status */}
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">
              Offline Mode
            </span>
            <span className="text-[10px] text-emerald-600 flex items-center font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mr-1 animate-pulse"></span>
              Local Storage Active
            </span>
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={profileMenuRef}>
            <button
              type="button"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="flex items-center space-x-2 p-1.5 pl-2 pr-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-lg bg-slate-800 text-white flex items-center justify-center font-bold text-xs">
                {currentUser.name.slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-semibold text-slate-800 block leading-tight">{currentUser.name}</span>
                <span className="text-[10px] text-slate-400 uppercase font-medium tracking-wide">
                  {currentUser.role.replace('_', ' ')}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isProfileMenuOpen && (
              <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-200 p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150 space-y-3">
                <div className="pb-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-slate-900">{currentUser.name}</p>
                  <p className="text-[11px] text-slate-500">{currentUser.email}</p>
                  <div className="mt-1.5">
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-md uppercase tracking-wider">
                      {currentUser.role.replace('_', ' ')}
                    </span>
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      onLockScreen();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-slate-700 hover:bg-slate-100 rounded-xl font-medium cursor-pointer transition-colors"
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Lock Terminal</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center space-x-2.5 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-xl font-bold cursor-pointer transition-colors"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Sign Out / Log Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Full Notification Detail Modal */}
      <NotificationDetailModal
        notification={selectedNotification}
        isOpen={!!selectedNotification}
        onClose={() => setSelectedNotification(null)}
        onNavigateTab={onNavigateTab}
      />

      {/* All Notifications Archive Modal */}
      <AllNotificationsModal
        isOpen={isAllNotifsOpen}
        onClose={() => setIsAllNotifsOpen(false)}
        onSelectNotification={(n) => {
          setSelectedNotification(n);
        }}
        onNavigateTab={onNavigateTab}
      />
    </>
  );
};
