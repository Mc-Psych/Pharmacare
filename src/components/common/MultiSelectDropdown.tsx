import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, Plus, X, Search } from 'lucide-react';

interface MultiSelectDropdownProps {
  id?: string;
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  allowCustom?: boolean;
  variant?: 'rose' | 'blue' | 'emerald' | 'indigo' | 'amber';
  hint?: string;
}

export const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  id,
  label,
  options,
  selectedValues,
  onChange,
  placeholder = 'Select options...',
  allowCustom = true,
  variant = 'indigo',
  hint,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const handleToggleOption = (val: string) => {
    const normalized = val.trim();
    if (!normalized) return;

    if (selectedValues.includes(normalized)) {
      onChange(selectedValues.filter(item => item !== normalized));
    } else {
      onChange([...selectedValues, normalized]);
    }
  };

  const handleRemove = (val: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(selectedValues.filter(item => item !== val));
  };

  const handleAddCustom = () => {
    const trimmed = searchQuery.trim();
    if (!trimmed) return;
    if (!selectedValues.some(item => item.toLowerCase() === trimmed.toLowerCase())) {
      onChange([...selectedValues, trimmed]);
    }
    setSearchQuery('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (allowCustom && searchQuery.trim()) {
        handleAddCustom();
      }
    }
  };

  const filteredOptions = options.filter(opt =>
    opt.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const isExactMatchPresent = options.some(
    opt => opt.toLowerCase() === searchQuery.trim().toLowerCase()
  ) || selectedValues.some(
    val => val.toLowerCase() === searchQuery.trim().toLowerCase()
  );

  // Variant color mappings
  const variantStyles = {
    rose: {
      label: 'text-rose-800',
      border: 'border-rose-200 focus-within:border-rose-400 focus-within:ring-rose-400',
      bg: 'bg-rose-50/40',
      tag: 'bg-rose-100 text-rose-800 border-rose-200 hover:bg-rose-200',
      check: 'text-rose-600',
      button: 'text-rose-700 bg-rose-50 hover:bg-rose-100 border-rose-200',
    },
    blue: {
      label: 'text-sky-800',
      border: 'border-sky-200 focus-within:border-sky-400 focus-within:ring-sky-400',
      bg: 'bg-sky-50/40',
      tag: 'bg-sky-100 text-sky-800 border-sky-200 hover:bg-sky-200',
      check: 'text-sky-600',
      button: 'text-sky-700 bg-sky-50 hover:bg-sky-100 border-sky-200',
    },
    indigo: {
      label: 'text-indigo-900',
      border: 'border-slate-200 focus-within:border-indigo-400 focus-within:ring-indigo-400',
      bg: 'bg-slate-50',
      tag: 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100',
      check: 'text-indigo-600',
      button: 'text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border-indigo-200',
    },
    emerald: {
      label: 'text-emerald-900',
      border: 'border-emerald-200 focus-within:border-emerald-400 focus-within:ring-emerald-400',
      bg: 'bg-emerald-50/40',
      tag: 'bg-emerald-100 text-emerald-800 border-emerald-200 hover:bg-emerald-200',
      check: 'text-emerald-600',
      button: 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border-emerald-200',
    },
    amber: {
      label: 'text-amber-900',
      border: 'border-amber-200 focus-within:border-amber-400 focus-within:ring-amber-400',
      bg: 'bg-amber-50/40',
      tag: 'bg-amber-100 text-amber-800 border-amber-200 hover:bg-amber-200',
      check: 'text-amber-600',
      button: 'text-amber-700 bg-amber-50 hover:bg-amber-100 border-amber-200',
    },
  }[variant];

  return (
    <div className="space-y-1.5" ref={containerRef} id={id}>
      <div className="flex items-center justify-between">
        <label className={`block text-xs font-semibold ${variantStyles.label}`}>{label}</label>
        {selectedValues.length > 0 && (
          <span className="text-[10px] font-medium text-slate-500">
            {selectedValues.length} selected
          </span>
        )}
      </div>

      {/* Main trigger container */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className={`min-h-[42px] p-1.5 w-full rounded-xl border ${variantStyles.border} ${variantStyles.bg} transition-all cursor-pointer flex flex-wrap items-center gap-1.5 relative`}
      >
        {selectedValues.length === 0 ? (
          <span className="text-xs text-slate-400 px-2 py-1 select-none">{placeholder}</span>
        ) : (
          selectedValues.map(val => (
            <span
              key={val}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg border transition-all ${variantStyles.tag}`}
            >
              <span>{val}</span>
              <button
                type="button"
                onClick={e => handleRemove(val, e)}
                className="p-0.5 rounded-full hover:bg-black/10 transition-colors"
                title={`Remove ${val}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}

        <div className="ml-auto pr-1 text-slate-400">
          <ChevronDown
            className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {hint && <p className="text-[10px] text-slate-500 mt-0.5">{hint}</p>}

      {/* Dropdown panel */}
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 p-2 space-y-2 max-h-72 flex flex-col">
          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search or enter custom..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Custom addition prompt */}
          {allowCustom && searchQuery.trim() && !isExactMatchPresent && (
            <button
              type="button"
              onClick={handleAddCustom}
              className={`w-full text-left px-3 py-2 text-xs font-medium rounded-lg flex items-center justify-between border ${variantStyles.button}`}
            >
              <span className="flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />
                Add &quot;{searchQuery.trim()}&quot; (Custom)
              </span>
              <span className="text-[10px] font-bold uppercase tracking-wider">Add</span>
            </button>
          )}

          {/* Options list */}
          <div className="overflow-y-auto flex-1 space-y-0.5 divide-y divide-slate-100">
            {filteredOptions.length === 0 && !searchQuery ? (
              <p className="text-xs text-slate-400 text-center py-4">No options available</p>
            ) : filteredOptions.length === 0 ? (
              <p className="text-xs text-slate-400 text-center py-4">No matching options</p>
            ) : (
              filteredOptions.map(opt => {
                const isSelected = selectedValues.includes(opt);
                return (
                  <div
                    key={opt}
                    onClick={() => handleToggleOption(opt)}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-slate-100/80 font-semibold text-slate-900'
                        : 'hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span>{opt}</span>
                    {isSelected && <Check className={`w-4 h-4 ${variantStyles.check}`} />}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer status */}
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 px-1">
            <span>{selectedValues.length} item(s) selected</span>
            {selectedValues.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="text-rose-600 hover:text-rose-700 font-medium"
              >
                Clear all
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
