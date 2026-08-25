import React from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { AlertTriangle, ArrowRight, ShieldAlert } from 'lucide-react';

interface AlertBannerProps {
  onNavigateTab: (tab: string, options?: { prefillLowStock?: boolean }) => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({ onNavigateTab }) => {
  const { expiredBatches, lowStockMedicines } = usePharmacy();

  if (expiredBatches.length === 0 && lowStockMedicines.length === 0) {
    return null;
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Expired Drugs Critical Warning */}
      {expiredBatches.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-red-50/40 border border-red-200 rounded-xl text-xs text-red-900 shadow-xs">
          <div className="flex items-center space-x-3 mb-2 sm:mb-0">
            <div className="p-2 bg-red-100 text-red-600 rounded-lg shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-red-800 text-xs uppercase tracking-tight">
                Critical Alert: {expiredBatches.length} Expired Medicine Batch(es) Detected
              </p>
              <p className="text-red-700 mt-0.5 text-xs">
                Expired batches are locked out of POS terminal. Quarantine and execute disposal adjustments.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('inventory')}
            className="inline-flex items-center px-3 py-1.5 text-xs font-bold uppercase tracking-tight text-white bg-red-600 hover:bg-red-700 rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            Quarantine Batches
            <ArrowRight className="w-3 h-3 ml-1" />
          </button>
        </div>
      )}

      {/* Low Stock Warning */}
      {lowStockMedicines.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3.5 bg-orange-50/40 border border-orange-200 rounded-xl text-xs text-orange-900 shadow-xs">
          <div className="flex items-center space-x-3 mb-2 sm:mb-0">
            <div className="p-1.5 bg-orange-100 text-orange-700 rounded-lg shrink-0">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-orange-800 text-xs uppercase tracking-tight">
                {lowStockMedicines.length} Medication(s) Below Reorder Threshold:
              </span>{' '}
              <span className="text-orange-900 font-medium">
                {lowStockMedicines.map(item => `${item.medicine.name} (${item.currentStock} left)`).slice(0, 3).join(', ')}
                {lowStockMedicines.length > 3 && ` +${lowStockMedicines.length - 3} more`}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('purchases', { prefillLowStock: true })}
            className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold uppercase tracking-tight text-orange-950 bg-orange-200 hover:bg-orange-300 rounded-lg transition-colors shrink-0 cursor-pointer shadow-2xs"
          >
            Create Order
            <ArrowRight className="w-3 h-3 ml-1" />
          </button>
        </div>
      )}
    </div>
  );
};
