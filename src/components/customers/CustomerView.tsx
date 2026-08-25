import React, { useState, useMemo } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { Customer, Gender, Sale, Prescription } from '../../types';
import {
  Users2,
  Plus,
  Search,
  User,
  Phone,
  Calendar,
  ShieldAlert,
  FileCheck2,
  ShoppingCart,
  Edit2,
  Trash2,
  X,
  HeartPulse,
  DollarSign
} from 'lucide-react';
import { safeFixed } from '../../utils/formatters';
import { MultiSelectDropdown } from '../common/MultiSelectDropdown';
import { STANDARD_DRUG_ALLERGIES, STANDARD_CHRONIC_CONDITIONS } from '../../data/allergyAndConditionsData';

interface CustomerViewProps {
  onOpenReceipt: (sale: Sale) => void;
}

export const CustomerView: React.FC<CustomerViewProps> = ({ onOpenReceipt }) => {
  const {
    customers,
    sales,
    prescriptions,
    addCustomer,
    updateCustomer,
    deleteCustomer,
    settings,
    currentUser
  } = usePharmacy();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCustomerForHistory, setSelectedCustomerForHistory] = useState<Customer | null>(null);

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [telephone, setTelephone] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState<Gender>('female');
  const [dateOfBirth, setDateOfBirth] = useState('1990-01-01');
  const [address, setAddress] = useState('');
  const [selectedAllergies, setSelectedAllergies] = useState<string[]>([]);
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setTelephone('');
    setEmail('');
    setGender('female');
    setDateOfBirth('1990-01-01');
    setAddress('');
    setSelectedAllergies([]);
    setSelectedConditions([]);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setTelephone(c.telephone);
    setEmail(c.email || '');
    setGender(c.gender);
    setDateOfBirth(c.dateOfBirth || '1990-01-01');
    setAddress(c.address || '');
    setSelectedAllergies(c.allergies ? Array.from(new Set(c.allergies)) : []);
    setSelectedConditions(c.chronicConditions ? Array.from(new Set(c.chronicConditions)) : []);
    setIsAddModalOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Enforce no duplicates
    const allergies = Array.from(new Set(selectedAllergies.filter(Boolean)));
    const chronicConditions = Array.from(new Set(selectedConditions.filter(Boolean)));

    if (editingCustomer) {
      updateCustomer(editingCustomer.id, {
        name,
        telephone,
        email,
        gender,
        dateOfBirth,
        address,
        allergies,
        chronicConditions,
      });
    } else {
      addCustomer({
        name,
        telephone,
        email,
        gender,
        dateOfBirth,
        address,
        allergies,
        chronicConditions,
      });
    }

    setIsAddModalOpen(false);
  };

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => {
      const term = searchTerm.toLowerCase();
      return (
        !term ||
        c.name.toLowerCase().includes(term) ||
        c.telephone.includes(term) ||
        (c.allergies && c.allergies.some(a => a.toLowerCase().includes(term))) ||
        (c.chronicConditions && c.chronicConditions.some(cond => cond.toLowerCase().includes(term)))
      );
    });
  }, [customers, searchTerm]);

  // Customer specific records
  const customerSales = useMemo(() => {
    if (!selectedCustomerForHistory) return [];
    return sales.filter(s => s.customerId === selectedCustomerForHistory.id);
  }, [sales, selectedCustomerForHistory]);

  const customerPrescriptions = useMemo(() => {
    if (!selectedCustomerForHistory) return [];
    return prescriptions.filter(p => p.customerId === selectedCustomerForHistory.id);
  }, [prescriptions, selectedCustomerForHistory]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Patient & Customer Registry</h2>
          <p className="text-xs text-slate-500 mt-1">
            Maintain clinical profiles, known drug allergy records, and patient medication histories.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Register Patient
        </button>
      </div>

      {/* Search Filter */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Patient Name, Phone, Allergies (e.g. Penicillin), Conditions..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>
      </div>

      {/* Patients Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.map((cust) => {
          const totalSpent = sales
            .filter(s => s.customerId === cust.id && s.status === 'completed')
            .reduce((sum, s) => sum + s.grandTotal, 0);
          const rxCount = prescriptions.filter(p => p.customerId === cust.id).length;

          return (
            <div
              key={cust.id}
              className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-sm">
                      {cust.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{cust.name}</h4>
                      <p className="text-[11px] text-slate-500 capitalize">
                        {cust.gender} • DOB: {cust.dateOfBirth || 'N/A'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(cust)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    {currentUser.role === 'admin' && (
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`Delete record for ${cust.name}?`)) {
                            deleteCustomer(cust.id);
                          }
                        }}
                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="text-xs space-y-1.5 text-slate-600 mt-3 pt-2.5 border-t border-slate-100">
                  <p className="flex items-center">
                    <Phone className="w-3.5 h-3.5 mr-1 text-slate-400" />
                    {cust.telephone}
                  </p>
                  {cust.address && <p className="text-[11px] text-slate-500 truncate">{cust.address}</p>}

                  {/* Documented Allergies Warning Tags */}
                  {cust.allergies && cust.allergies.length > 0 && (
                    <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl space-y-1 mt-2">
                      <span className="text-[10px] font-bold text-rose-900 uppercase flex items-center">
                        <ShieldAlert className="w-3.5 h-3.5 mr-1 text-rose-600" />
                        Drug Allergies
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {cust.allergies.map((allergy, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-rose-200/80 text-rose-900 rounded-md text-[10px] font-bold"
                          >
                            {allergy}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Chronic Conditions */}
                  {cust.chronicConditions && cust.chronicConditions.length > 0 && (
                    <div className="p-2 bg-blue-50 border border-blue-200 rounded-xl space-y-1 mt-1">
                      <span className="text-[10px] font-bold text-blue-900 uppercase flex items-center">
                        <HeartPulse className="w-3.5 h-3.5 mr-1 text-blue-600" />
                        Chronic Conditions
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {cust.chronicConditions.map((c, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-blue-200/80 text-blue-900 rounded-md text-[10px] font-semibold"
                          >
                            {c}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Stats & History Trigger */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-500">
                  <span>{rxCount} Prescriptions</span> •{' '}
                  <span className="font-semibold text-slate-900">
                    {settings.currencySymbol}{safeFixed(totalSpent)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedCustomerForHistory(cust)}
                  className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl transition-colors"
                >
                  History
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Patient Medical & Purchase History Modal */}
      {selectedCustomerForHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Clinical & Dispensing History: {selectedCustomerForHistory.name}
                </h3>
                <p className="text-xs text-slate-500">
                  Tel: {selectedCustomerForHistory.telephone} • {selectedCustomerForHistory.gender} • DOB: {selectedCustomerForHistory.dateOfBirth}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomerForHistory(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Prescriptions on record */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Prescriptions On Record ({customerPrescriptions.length})
              </h4>
              {customerPrescriptions.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No prescriptions registered for this patient.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {customerPrescriptions.map((rx) => (
                    <div key={rx.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
                      <div className="flex justify-between font-bold text-slate-900">
                        <span>{rx.prescriptionNumber} • Dr. {rx.doctorName}</span>
                        <span className="capitalize px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[10px]">
                          {rx.status}
                        </span>
                      </div>
                      <p className="text-slate-600">
                        {rx.items.map(i => `${i.medicineName} (${i.quantityPrescribed})`).join(', ')}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Purchase transactions */}
            <div className="space-y-2 border-t border-slate-100 pt-3">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Pharmacy Purchases & Receipts ({customerSales.length})
              </h4>
              {customerSales.length === 0 ? (
                <p className="text-xs text-slate-400 py-2">No sales history found.</p>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {customerSales.map((s) => (
                    <div key={s.id} className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex justify-between items-center text-xs">
                      <div>
                        <span className="font-mono font-bold text-indigo-700">{s.invoiceNumber}</span>
                        <p className="text-slate-500 text-[11px] mt-0.5">
                          {new Date(s.createdAt).toLocaleString()} • {s.items.length} items
                        </p>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-extrabold text-slate-900">
                          {settings.currencySymbol}{safeFixed(s.grandTotal)}
                        </span>
                        <button
                          type="button"
                          onClick={() => onOpenReceipt(s)}
                          className="px-2.5 py-1 bg-white border border-slate-200 text-indigo-600 font-bold rounded-lg hover:bg-indigo-50 text-[11px]"
                        >
                          Invoice
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Patient Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                {editingCustomer ? 'Edit Patient Profile' : 'Register New Patient Profile'}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Sarah Connor"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Telephone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+1 555-0199"
                    value={telephone}
                    onChange={(e) => setTelephone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="patient@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Gender *</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="other">Other / Not Specified</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={dateOfBirth}
                    onChange={(e) => setDateOfBirth(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Residential Address</label>
                <input
                  type="text"
                  placeholder="e.g. 742 Evergreen Terrace, Springfield"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                />
              </div>

              <MultiSelectDropdown
                id="patient-allergies-select"
                label="Documented Drug Allergies"
                options={STANDARD_DRUG_ALLERGIES}
                selectedValues={selectedAllergies}
                onChange={setSelectedAllergies}
                placeholder="Select drug allergies or type custom..."
                variant="rose"
                hint="Triggers automatic real-time contraindication and safety alerts during POS checkout."
              />

              <MultiSelectDropdown
                id="patient-conditions-select"
                label="Chronic Health Conditions"
                options={STANDARD_CHRONIC_CONDITIONS}
                selectedValues={selectedConditions}
                onChange={setSelectedConditions}
                placeholder="Select chronic conditions or type custom..."
                variant="blue"
                hint="Helps pharmacists perform comprehensive drug-disease interaction checks."
              />

              <div className="pt-3 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
                >
                  {editingCustomer ? 'Update Patient' : 'Save Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
