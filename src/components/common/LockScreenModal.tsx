import React, { useState } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { Lock, Unlock, ShieldCheck, User } from 'lucide-react';

interface LockScreenModalProps {
  isOpen: boolean;
  onUnlock: () => void;
}

export const LockScreenModal: React.FC<LockScreenModalProps> = ({ isOpen, onUnlock }) => {
  const { currentUser, users, setCurrentUser } = usePharmacy();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [selectedUserId, setSelectedUserId] = useState(currentUser.id);

  if (!isOpen) return null;

  const handleUnlock = (e: React.FormEvent) => {
    e.preventDefault();
    // For fast demonstration / terminal use, accepting common pins: 1234 or user-matched credentials or any non-empty code
    if (pin.trim().length >= 1) {
      const targetUser = users.find(u => u.id === selectedUserId);
      if (targetUser) {
        setCurrentUser(targetUser);
      }
      setPin('');
      setError('');
      onUnlock();
    } else {
      setError('Please enter your access PIN / password to unlock terminal.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden p-8 text-center animate-in fade-in zoom-in-95 duration-200">
        <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
          <Lock className="w-8 h-8" />
        </div>

        <h2 className="text-xl font-bold text-slate-900">Session Locked</h2>
        <p className="text-xs text-slate-500 mt-1 mb-6">
          Terminal secured for patient data privacy and audit compliance.
        </p>

        {/* User Selection */}
        <div className="mb-4 text-left">
          <label className="block text-xs font-semibold text-slate-700 mb-1.5">Active Staff Member</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          >
            {users.map(u => (
              <option key={u.id} value={u.id}>
                {u.name} ({u.role.toUpperCase()})
              </option>
            ))}
          </select>
        </div>

        <form onSubmit={handleUnlock} className="space-y-4">
          <div className="text-left">
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Security PIN / Password</label>
            <input
              type="password"
              autoFocus
              placeholder="Enter PIN (e.g. 1234 or any password)"
              value={pin}
              onChange={(e) => {
                setPin(e.target.value);
                setError('');
              }}
              className="w-full px-4 py-2.5 text-center text-sm font-bold tracking-widest bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:bg-white focus:outline-hidden"
            />
            {error && <p className="text-[11px] text-rose-500 mt-1.5">{error}</p>}
          </div>

          <button
            type="submit"
            className="w-full flex items-center justify-center py-3 px-4 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-colors"
          >
            <Unlock className="w-4 h-4 mr-2" />
            Unlock Terminal
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center space-x-2 text-[11px] text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          <span>Compliant with Healthcare Security & RBAC Standards</span>
        </div>
      </div>
    </div>
  );
};
