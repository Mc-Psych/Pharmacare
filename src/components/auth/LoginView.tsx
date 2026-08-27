import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { User, UserRole } from '../../types';
import {
  ShieldCheck,
  Lock,
  UserCheck,
  Sparkles,
  ArrowRight,
  Pill,
  KeyRound,
  AlertCircle,
  Database,
  Building2,
  ShoppingBag,
  Package,
  Layers,
  User as UserIcon,
  ShieldAlert
} from 'lucide-react';

interface LoginViewProps {
  onSuccess?: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onSuccess }) => {
  const { users, login, settings, updateSettings } = usePharmacy();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showAdminDemoPrompt, setShowAdminDemoPrompt] = useState(false);

  const isDemoEnabled = !!settings.enableDemoLogin;

  const toggleDemoMode = () => {
    updateSettings({
      ...settings,
      enableDemoLogin: !isDemoEnabled,
      enableQuickFillDemo: !isDemoEnabled,
    });
  };

  const roleDetails: Record<
    UserRole,
    { title: string; desc: string; icon: React.ComponentType<{ className?: string }>; color: string; badge: string }
  > = {
    admin: {
      title: 'System Administrator',
      desc: 'Full system oversight, user accounts, password resets, RBAC policies & audit logs.',
      icon: Building2,
      color: 'border-slate-800 bg-slate-900 text-white',
      badge: 'Admin / Owner',
    },
    pharmacist: {
      title: 'Clinical Pharmacist',
      desc: 'Prescription verification, clinical consultations, drug cataloging & returns.',
      icon: Pill,
      color: 'border-emerald-600 bg-emerald-700 text-white',
      badge: 'Clinical Lead',
    },
    dispensing_assistant: {
      title: 'Dispensing Assistant',
      desc: 'Medication order assembly, prescription lookup & direct loading to POS checkout cart.',
      icon: Layers,
      color: 'border-teal-600 bg-teal-700 text-white',
      badge: 'Dispensing & POS',
    },
    cashier: {
      title: 'POS Cashier',
      desc: 'Counter sales, cash & card payment collection, and receipt issuance.',
      icon: ShoppingBag,
      color: 'border-indigo-600 bg-indigo-700 text-white',
      badge: 'Counter Checkout',
    },
    storekeeper: {
      title: 'Inventory Storekeeper',
      desc: 'Stock receiving, supplier POs, FEFO expiry tracking & physical audits.',
      icon: Package,
      color: 'border-amber-600 bg-amber-700 text-white',
      badge: 'Logistics & Stock',
    },
  };

  const handle1ClickUserLogin = (user: User) => {
    setError('');
    const ok = login(user.id);
    if (ok && onSuccess) {
      onSuccess();
    }
  };

  const handleManualLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!username.trim()) {
      setError('Please enter your username, email, or select an account.');
      return;
    }

    const cleanInput = username.trim().toLowerCase();
    const matched = users.find(
      u =>
        u.id.toLowerCase() === cleanInput ||
        u.username.toLowerCase() === cleanInput ||
        u.email.toLowerCase() === cleanInput ||
        u.role.toLowerCase() === cleanInput
    );

    if (!matched) {
      setError(`No account found matching "${username}". Please verify your credentials or select an account.`);
      return;
    }

    if (!matched.isActive && matched.status === 'inactive') {
      setError(`Account for ${matched.name} is currently suspended. Please contact the System Administrator.`);
      return;
    }

    const ok = login(matched.id, password.trim());
    if (ok) {
      if (onSuccess) onSuccess();
    } else {
      setError('Authentication failed. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 text-slate-800 font-sans">
      <div className="max-w-4xl w-full mx-auto space-y-8">
        {/* Top Pharmacy Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 bg-slate-900 text-emerald-400 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide shadow-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>SECURE PHARMACY TERMINAL • ROLE & PERMISSION GOVERNANCE</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            {settings.pharmacyName || 'PHARMACARE PMS'}
          </h1>
          <p className="text-xs sm:text-sm text-slate-600 max-w-lg mx-auto">
            Professional Pharmacy Management, Point of Sale & Clinical Dispensing System
          </p>
        </div>

        {/* Main Card Area */}
        {isDemoEnabled ? (
          /* Split Layout with 1-Click Quick Staff Selector (Demo Mode) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 bg-white rounded-3xl border border-slate-200 shadow-xl overflow-hidden">
            {/* Left Column: Registered Staff Accounts (1-Click Login) */}
            <div className="lg:col-span-7 p-6 sm:p-8 bg-slate-50 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                  <div className="flex items-center space-x-2">
                    <div className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                          Quick Fill Demo • Staff Accounts
                        </h2>
                        <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-200">
                          Demo Active
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        1-Click login enabled for rapid demonstration & training
                      </p>
                    </div>
                  </div>
                  <span className="text-[11px] font-bold text-slate-600 bg-slate-200 px-2 py-0.5 rounded-md">
                    {users.length} Account{users.length !== 1 ? 's' : ''}
                  </span>
                </div>

                {/* Dynamic Users List */}
                <div className="grid grid-cols-1 gap-2.5 max-h-[380px] overflow-y-auto pr-1">
                  {users.map((user) => {
                    const config = roleDetails[user.role] || roleDetails.admin;
                    const Icon = config.icon;

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => handle1ClickUserLogin(user)}
                        className="group text-left p-3.5 bg-white hover:bg-emerald-50/60 rounded-2xl border border-slate-200 hover:border-emerald-500 hover:shadow-md transition-all duration-150 flex items-center justify-between cursor-pointer"
                      >
                        <div className="flex items-center space-x-3.5 min-w-0">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 shadow-xs ${config.color}`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <div className="min-w-0">
                            <div className="flex items-center space-x-2">
                              <h3 className="text-xs font-bold text-slate-900 truncate group-hover:text-emerald-700">
                                {user.name}
                              </h3>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                {user.role.replace('_', ' ')}
                              </span>
                              {user.mustChangePasswordOnLogin && (
                                <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800">
                                  🔑 1st Login
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                              @{user.username} • {user.email}
                            </p>
                          </div>
                        </div>

                        <div className="shrink-0 ml-3 flex items-center space-x-1 text-xs font-bold text-emerald-600 opacity-80 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                          <span>Enter</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                <button
                  type="button"
                  onClick={toggleDemoMode}
                  className="text-xs font-semibold text-rose-600 hover:text-rose-800 hover:underline cursor-pointer flex items-center"
                >
                  <Lock className="w-3.5 h-3.5 mr-1" />
                  Disable Demo Mode (Switch to Production)
                </button>
                <span>Admin: Courage Kay</span>
              </div>
            </div>

            {/* Right Column: Manual Sign-In Form */}
            <div className="lg:col-span-5 p-6 sm:p-8 flex flex-col justify-between space-y-6">
              <div>
                <div className="space-y-1 mb-6">
                  <h2 className="text-base font-bold text-slate-900">Sign In with Credentials</h2>
                  <p className="text-xs text-slate-500">Enter username & password configured by Admin</p>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                    <p className="leading-tight">{error}</p>
                  </div>
                )}

                <form onSubmit={handleManualLogin} className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Username / Email
                    </label>
                    <div className="relative">
                      <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="e.g. courage or username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Password / PIN
                    </label>
                    <div className="relative">
                      <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="password"
                        placeholder="Enter password (e.g. Pharmacy@123)"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full flex items-center justify-center py-2.5 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-colors cursor-pointer"
                  >
                    <Lock className="w-3.5 h-3.5 mr-2" />
                    Sign In to Terminal
                  </button>
                </form>
              </div>

              <div className="pt-4 border-t border-slate-100 text-center text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-center space-x-1 text-emerald-600 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Compliant with Pharmacare RBAC Standards</span>
                </div>
                <p>License: {settings.licenseNumber || 'PHA-GH-2026-98421'}</p>
              </div>
            </div>
          </div>
        ) : (
          /* Production Mode: Secure Centered Authentication Form */
          <div className="max-w-md mx-auto bg-white rounded-3xl border border-slate-200 shadow-2xl p-7 sm:p-9 space-y-6">
            {/* Pharmacy Brand Display */}
            <div className="text-center space-y-2 pb-2">
              {settings.systemLogo || settings.logoUrl ? (
                <div className="flex justify-center mb-2">
                  <img
                    src={settings.systemLogo || settings.logoUrl}
                    alt={settings.pharmacyName}
                    className="max-h-14 max-w-[160px] object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
              ) : (
                <div className="inline-flex p-3 bg-emerald-600 text-white font-bold rounded-2xl mb-1 text-lg shadow-md">
                  ✚
                </div>
              )}
              <h2 className="text-lg font-bold text-slate-900 leading-tight">
                {settings.pharmacyName || 'PharmaCare Pharmacy'}
              </h2>
              <p className="text-xs text-slate-500">
                {settings.address || 'Ring Road Central, Adabraka, Accra'}
              </p>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-start space-x-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <p className="leading-tight">{error}</p>
              </div>
            )}

            <form onSubmit={handleManualLogin} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Username / Staff Email
                </label>
                <div className="relative">
                  <UserIcon className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. courage"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Password / PIN
                </label>
                <div className="relative">
                  <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="password"
                    placeholder="Enter password (e.g. Pharmacy@123)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:bg-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center py-3 px-4 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                <Lock className="w-4 h-4 mr-2" />
                Secure Sign In
              </button>
            </form>

            {/* Admin Quick Fill Demo Control Toggle */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">Demo & Training Mode:</span>
                <button
                  type="button"
                  onClick={toggleDemoMode}
                  className="inline-flex items-center text-[11px] font-bold text-indigo-600 hover:text-indigo-800 hover:underline cursor-pointer bg-indigo-50 hover:bg-indigo-100 px-2.5 py-1 rounded-lg transition-colors"
                >
                  <Sparkles className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                  Enable Quick Fill Demo
                </button>
              </div>

              <div className="text-center text-[11px] text-slate-400 space-y-1">
                <div className="flex items-center justify-center space-x-1 text-emerald-600 font-medium">
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Production Security Active</span>
                </div>
                <p>License: {settings.licenseNumber || 'PHA-GH-2026-98421'} • Tel: {settings.phone}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
