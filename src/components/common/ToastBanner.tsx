import React from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { CheckCircle2, AlertTriangle, Info, X, ShoppingCart } from 'lucide-react';

export const ToastBanner: React.FC = () => {
  const { activeToast, dismissToast } = usePharmacy();

  if (!activeToast) return null;

  const isSuccess = activeToast.type === 'success' || !activeToast.type;
  const isWarning = activeToast.type === 'warning';
  const isDanger = activeToast.type === 'danger';

  return (
    <div className="fixed top-5 right-5 z-50 max-w-md w-full sm:w-96 animate-in slide-in-from-top-4 fade-in duration-200 pointer-events-auto">
      <div className="bg-slate-900 text-white rounded-2xl shadow-2xl border border-slate-800 p-4 relative overflow-hidden backdrop-blur-md">
        {/* Top Accent Line */}
        <div 
          className={`absolute top-0 left-0 right-0 h-1 ${
            isSuccess 
              ? 'bg-emerald-500' 
              : isWarning 
                ? 'bg-amber-500' 
                : isDanger 
                  ? 'bg-rose-500' 
                  : 'bg-indigo-500'
          }`}
        />

        <div className="flex items-start space-x-3">
          {/* Icon Badge */}
          <div 
            className={`p-2 rounded-xl shrink-0 mt-0.5 ${
              isSuccess 
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                : isWarning 
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' 
                  : isDanger 
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                    : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
            }`}
          >
            {isSuccess ? (
              <ShoppingCart className="w-5 h-5" />
            ) : isWarning ? (
              <AlertTriangle className="w-5 h-5" />
            ) : isDanger ? (
              <AlertTriangle className="w-5 h-5 text-rose-400" />
            ) : (
              <Info className="w-5 h-5" />
            )}
          </div>

          {/* Text Content */}
          <div className="flex-1 min-w-0 pr-2">
            <div className="flex items-center space-x-2">
              <h4 className="text-xs font-bold text-white tracking-wide uppercase">
                {activeToast.title}
              </h4>
              <span className="px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 text-[10px] font-semibold rounded-md border border-emerald-500/30">
                Acknowledged
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed font-medium">
              {activeToast.message}
            </p>
          </div>

          {/* Dismiss Button */}
          <button
            type="button"
            onClick={dismissToast}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer shrink-0"
            title="Dismiss Notification"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Dynamic Progress / Expiry Animation */}
        <div className="mt-3 w-full bg-slate-800 h-1 rounded-full overflow-hidden">
          <div 
            className={`h-full animate-[progress_3.5s_linear_forwards] ${
              isSuccess ? 'bg-emerald-500' : 'bg-indigo-500'
            }`}
            style={{
              animationDuration: `${activeToast.durationMs || 3500}ms`
            }}
          />
        </div>
      </div>
    </div>
  );
};
