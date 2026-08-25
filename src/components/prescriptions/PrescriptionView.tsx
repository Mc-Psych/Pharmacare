import React, { useState, useMemo, useRef, useEffect } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import { Prescription, PrescriptionItem } from '../../types';
import { WHO_DIAGNOSES, WHODiagnosis } from '../../data/whoDiagnosisData';
import { PrintReportOptions, printStructuredReport } from '../../utils/printReport';
import { ReportPrintModal } from '../common/ReportPrintModal';
import {
  FileCheck2,
  Plus,
  Search,
  User,
  Building,
  CheckCircle,
  Clock,
  Pill,
  Trash2,
  X,
  Printer,
  ChevronRight,
  ShieldCheck,
  ShoppingCart,
  Activity,
  Check,
  Tag,
  Stethoscope,
  Info,
  Lock,
  CreditCard,
  AlertCircle
} from 'lucide-react';

interface PrescriptionViewProps {
  onNavigateTab: (tabId: string) => void;
}

export const PrescriptionView: React.FC<PrescriptionViewProps> = ({ onNavigateTab }) => {
  const {
    prescriptions,
    customers,
    medicines,
    sales,
    settings,
    createPrescription,
    dispensePrescription,
    loadPrescriptionToPOSCart,
    currentUser,
    hasPermission,
    getMedicineTotalStock,
    addNotification
  } = usePharmacy();

  const canAddPrescription = currentUser.role === 'pharmacist' || (currentUser.role === 'admin' && hasPermission('register_prescriptions'));

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [viewingRx, setViewingRx] = useState<Prescription | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalOptions, setPrintModalOptions] = useState<PrintReportOptions | null>(null);

  // Form State
  const [customerId, setCustomerId] = useState('');
  const [doctorName, setDoctorName] = useState('Dr. Gregory House, MD');
  const [doctorLicense, setDoctorLicense] = useState('MED-LIC-99211');
  const [clinicHospital, setClinicHospital] = useState('Metro City Medical Center');
  const [prescriptionDate, setPrescriptionDate] = useState(new Date().toISOString().split('T')[0]);
  
  // WHO Clinical Diagnoses state (Multi-selection of standard WHO ICD-10 items)
  const [selectedDiagnoses, setSelectedDiagnoses] = useState<string[]>([]);
  const [diagnosisSearch, setDiagnosisSearch] = useState('');
  const [isDiagnosisDropdownOpen, setIsDiagnosisDropdownOpen] = useState(false);
  const diagnosisDropdownRef = useRef<HTMLDivElement>(null);

  const [notes, setNotes] = useState('');
  const [prescriptionItems, setPrescriptionItems] = useState<PrescriptionItem[]>([
    {
      id: 'rxi-temp-1',
      medicineId: medicines[0]?.id || '',
      medicineName: medicines[0]?.name || '',
      dosage: medicines[0]?.dosage || '500mg',
      frequency: 'Three times daily after meals (TDS)',
      duration: '5 days',
      quantityPrescribed: 1,
      quantityDispensed: 0,
      instructions: 'Complete full course even if feeling better.',
    }
  ]);

  // Close diagnosis dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (diagnosisDropdownRef.current && !diagnosisDropdownRef.current.contains(event.target as Node)) {
        setIsDiagnosisDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter WHO Diagnoses
  const filteredWHODiagnoses = useMemo(() => {
    const term = diagnosisSearch.trim().toLowerCase();
    if (!term) return WHO_DIAGNOSES.slice(0, 15);
    return WHO_DIAGNOSES.filter(d => 
      d.name.toLowerCase().includes(term) ||
      d.code.toLowerCase().includes(term) ||
      d.category.toLowerCase().includes(term) ||
      d.keywords.some(k => k.toLowerCase().includes(term))
    );
  }, [diagnosisSearch]);

  const handleToggleDiagnosis = (diagnosisFormatted: string) => {
    if (selectedDiagnoses.includes(diagnosisFormatted)) {
      setSelectedDiagnoses(prev => prev.filter(d => d !== diagnosisFormatted));
    } else {
      setSelectedDiagnoses(prev => [...prev, diagnosisFormatted]);
    }
  };

  const handleRemoveDiagnosisTag = (tag: string) => {
    setSelectedDiagnoses(prev => prev.filter(d => d !== tag));
  };

  const handleAddItemRow = () => {
    const med = medicines[0];
    setPrescriptionItems(prev => [
      ...prev,
      {
        id: `rxi-${Date.now()}`,
        medicineId: med ? med.id : '',
        medicineName: med ? med.name : '',
        dosage: med ? med.dosage : '',
        frequency: 'Twice daily with meals (BD)',
        duration: '7 days',
        quantityPrescribed: 1,
        quantityDispensed: 0,
        instructions: 'Take with plenty of water.',
      }
    ]);
  };

  const handleItemChange = (index: number, field: keyof PrescriptionItem, val: any) => {
    const updated = [...prescriptionItems];
    if (field === 'medicineId') {
      const selectedMed = medicines.find(m => m.id === val);
      if (selectedMed) {
        updated[index] = {
          ...updated[index],
          medicineId: val,
          medicineName: selectedMed.name,
          dosage: selectedMed.dosage,
        };
      }
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setPrescriptionItems(updated);
  };

  const handleRemoveItemRow = (index: number) => {
    if (prescriptionItems.length <= 1) {
      alert('Prescription must have at least one medication line.');
      return;
    }
    setPrescriptionItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleOpenAddModal = () => {
    setCustomerId(customers[0]?.id || '');
    setDoctorName('Dr. Gregory House, MD');
    setDoctorLicense('MED-LIC-99211');
    setClinicHospital('Metro City Medical Center');
    setPrescriptionDate(new Date().toISOString().split('T')[0]);
    setSelectedDiagnoses([]);
    setDiagnosisSearch('');
    setNotes('');
    const firstMed = medicines[0];
    setPrescriptionItems([
      {
        id: `rxi-${Date.now()}`,
        medicineId: firstMed?.id || '',
        medicineName: firstMed?.name || '',
        dosage: firstMed?.dosage || '500mg',
        frequency: 'Three times daily after meals (TDS)',
        duration: '5 days',
        quantityPrescribed: 1,
        quantityDispensed: 0,
        instructions: 'Complete full course even if feeling better.',
      }
    ]);
    setIsAddModalOpen(true);
  };

  const handleCreatePrescriptionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cust = customers.find(c => c.id === customerId);
    const customerName = cust ? cust.name : 'Walk-in / External Patient';
    const finalDiagnosis = selectedDiagnoses.join('; ');

    createPrescription({
      customerId: customerId || 'cust-walkin',
      customerName,
      doctorName,
      doctorLicense,
      clinicHospital,
      prescriptionDate,
      diagnosis: finalDiagnosis,
      items: prescriptionItems,
      status: 'pending',
      notes,
    });

    setIsAddModalOpen(false);
  };

  const filteredPrescriptions = useMemo(() => {
    return prescriptions.filter(p => {
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        p.prescriptionNumber.toLowerCase().includes(term) ||
        p.customerName.toLowerCase().includes(term) ||
        p.doctorName.toLowerCase().includes(term) ||
        p.clinicHospital.toLowerCase().includes(term) ||
        (p.diagnosis && p.diagnosis.toLowerCase().includes(term));
      return matchStatus && matchSearch;
    });
  }, [prescriptions, statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Prescription Orders & Dispensation</h2>
          <p className="text-xs text-slate-500 mt-1">
            Doctor prescriptions with WHO ICD-10 standardized clinical diagnoses, validation, and POS cart integration.
          </p>
        </div>

        {canAddPrescription && (
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center px-4 py-2.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Register Doctor Prescription
          </button>
        )}
      </div>

      {/* Dispensation Payment Policy Banner */}
      <div className="bg-amber-50/70 border border-amber-200/80 rounded-2xl p-3.5 flex items-start space-x-3 text-xs text-amber-900">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5 flex-1">
          <p className="font-bold text-amber-950">Dispensation Security Policy:</p>
          <p className="text-amber-800 text-[11px] leading-relaxed">
            Prescriptions not paid for <strong>must not be dispensed</strong>. Unbilled prescriptions must first be added to the POS Cart (<ShoppingCart className="w-3 h-3 inline text-emerald-700" />) and billed through the Cashier before medication is handed over to the patient.
          </p>
        </div>
      </div>

      {/* Alert / Notification Feedback */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button type="button" onClick={() => setErrorMessage('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {infoMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{infoMessage}</span>
          </div>
          <button type="button" onClick={() => setInfoMessage('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Prescription #, Patient, Doctor, or WHO Diagnosis..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-700"
        >
          <option value="all">All Prescriptions</option>
          <option value="pending">Pending Dispensation</option>
          <option value="dispensed">Fully Dispensed</option>
        </select>
      </div>

      {/* Prescriptions List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredPrescriptions.map((rx) => {
          const isPending = rx.status === 'pending';
          // Check if this prescription is paid in sales
          const isPaid = sales.some(
            s => s.prescriptionId === rx.id && (s.status === 'completed' || s.dispenseStatus === 'paid_awaiting_dispense' || s.dispenseStatus === 'finally_dispensed')
          );

          const handleDispenseClick = () => {
            setErrorMessage('');
            if (!isPaid && rx.status !== 'dispensed') {
              const msg = `Prescription ${rx.prescriptionNumber} cannot be dispensed: Payment is pending. Click "Add to POS Cart" to process payment at Cashier first.`;
              setErrorMessage(msg);
              addNotification({
                title: 'Dispensing Blocked (Unpaid)',
                message: msg,
                type: 'warning',
                module: 'prescription',
              });
              return;
            }

            dispensePrescription(rx.id, currentUser.name);
            setInfoMessage(`✓ Prescription ${rx.prescriptionNumber} for ${rx.customerName} marked as dispensed.`);
            setTimeout(() => setInfoMessage(''), 6000);
          };

          return (
            <div
              key={rx.id}
              className={`p-5 bg-white rounded-3xl border transition-all space-y-3.5 flex flex-col justify-between ${
                isPending
                  ? isPaid
                    ? 'border-emerald-300 bg-emerald-50/10 shadow-xs'
                    : 'border-amber-200 shadow-sm shadow-amber-50/50'
                  : 'border-slate-200 bg-slate-50/40'
              }`}
            >
              <div className="space-y-3">
                {/* Card Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="font-mono font-bold text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {rx.prescriptionNumber}
                      </span>
                      {isPending && (
                        isPaid ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CreditCard className="w-3 h-3 mr-1 text-emerald-600" />
                            Paid
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 mr-1 text-amber-600" />
                            Unpaid
                          </span>
                        )
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5 flex items-center">
                      <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {rx.customerName}
                    </h3>
                  </div>

                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                      rx.status === 'dispensed'
                        ? 'bg-emerald-100 text-emerald-800'
                        : isPaid
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    {rx.status === 'dispensed' ? 'Dispensed' : isPaid ? 'Ready to Dispense' : 'Awaiting Payment'}
                  </span>
                </div>

                {/* Doctor & Clinic Info */}
                <div className="text-[11px] text-slate-500 space-y-0.5 border-t border-slate-100 pt-2">
                  <p className="font-semibold text-slate-700">Prescriber: {rx.doctorName}</p>
                  <p className="truncate">Clinic: {rx.clinicHospital}</p>
                </div>

                {/* WHO Standardized Clinical Diagnosis Badge */}
                {rx.diagnosis && (
                  <div className="p-2.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1">
                    <div className="flex items-center text-[10px] font-bold text-blue-700 uppercase tracking-wide">
                      <Activity className="w-3 h-3 mr-1" />
                      WHO Clinical Diagnosis:
                    </div>
                    <p className="text-xs font-semibold text-blue-950 leading-snug">
                      {rx.diagnosis}
                    </p>
                  </div>
                )}

                {/* Items Summary */}
                <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block mb-1">
                    Prescribed Medications ({rx.items.length})
                  </span>
                  {rx.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-slate-700">
                      <span className="font-medium truncate max-w-[170px]">
                        • {item.medicineName} ({item.dosage})
                      </span>
                      <span className="font-bold text-slate-900">{item.quantityPrescribed} units</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <div className="text-[11px] text-slate-400">
                  Date: {rx.prescriptionDate}
                </div>

                <div className="flex flex-wrap gap-1.5 items-center">
                  <button
                    type="button"
                    onClick={() => setViewingRx(rx)}
                    className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Details
                  </button>

                  {/* Add to POS Cart: Enabled for pending prescriptions to collect payment */}
                  {isPending && !isPaid && (currentUser.role === 'admin' || currentUser.role === 'pharmacist' || currentUser.role === 'dispensing_assistant') && (
                    <button
                      type="button"
                      onClick={() => {
                        loadPrescriptionToPOSCart(rx);
                        onNavigateTab('pos');
                      }}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-emerald-800 bg-emerald-100 hover:bg-emerald-200 border border-emerald-200 rounded-lg shadow-xs transition-colors cursor-pointer"
                      title="Load this prescription directly into the POS cart to process payment"
                    >
                      <ShoppingCart className="w-3.5 h-3.5 mr-1 text-emerald-700" />
                      Add to POS Cart
                    </button>
                  )}

                  {/* Mark Dispensed Button: Strictly checked for payment */}
                  {isPending && (currentUser.role === 'admin' || currentUser.role === 'pharmacist') && (
                    isPaid ? (
                      <button
                        type="button"
                        onClick={handleDispenseClick}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                      >
                        <CheckCircle className="w-3.5 h-3.5 mr-1" />
                        Mark Dispensed
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleDispenseClick}
                        title="Prescription not paid for. Click to see instructions."
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl transition-colors cursor-pointer"
                      >
                        <Lock className="w-3.5 h-3.5 mr-1 text-amber-600" />
                        Unpaid (Cannot Dispense)
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Prescription Modal with WHO Diagnosis Selector */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2">
                <Stethoscope className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">Register Doctor Prescription</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePrescriptionSubmit} className="p-6 space-y-4 max-h-[78vh] overflow-y-auto">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Patient Name *</label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium"
                  >
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.telephone})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prescription Date *</label>
                  <input
                    type="date"
                    required
                    value={prescriptionDate}
                    onChange={(e) => setPrescriptionDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prescribing Doctor *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. Arthur Conan, MD"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor License #</label>
                  <input
                    type="text"
                    placeholder="e.g. MED-LIC-4491"
                    value={doctorLicense}
                    onChange={(e) => setDoctorLicense(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Clinic / Hospital</label>
                  <input
                    type="text"
                    placeholder="e.g. Metro City Memorial Hospital - Pulmonology"
                    value={clinicHospital}
                    onChange={(e) => setClinicHospital(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl"
                  />
                </div>

                {/* WHO Standardized Clinical Diagnosis Multi-Select Picker */}
                <div className="sm:col-span-2 space-y-1.5" ref={diagnosisDropdownRef}>
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-semibold text-slate-700">
                      Clinical Diagnosis (WHO ICD-10 Standard)
                    </label>
                    <span className="text-[10px] text-indigo-600 font-medium flex items-center">
                      <ShieldCheck className="w-3 h-3 mr-1" />
                      WHO Standardized Database
                    </span>
                  </div>

                  {/* Selected Tags */}
                  {selectedDiagnoses.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 rounded-xl border border-slate-200 mb-1">
                      {selectedDiagnoses.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-100 text-indigo-900 border border-indigo-200"
                        >
                          <Activity className="w-3 h-3 mr-1 text-indigo-600" />
                          {tag}
                          <button
                            type="button"
                            onClick={() => handleRemoveDiagnosisTag(tag)}
                            className="ml-1.5 text-indigo-500 hover:text-indigo-800 p-0.5 rounded cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Diagnosis Search & Dropdown Input */}
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="Search WHO ICD-10 diagnoses by disease, code (e.g. I10, J00, B54), or keyword..."
                      value={diagnosisSearch}
                      onFocus={() => setIsDiagnosisDropdownOpen(true)}
                      onChange={(e) => {
                        setDiagnosisSearch(e.target.value);
                        setIsDiagnosisDropdownOpen(true);
                      }}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                    />

                    {isDiagnosisDropdownOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-xl p-1.5 space-y-1">
                        {filteredWHODiagnoses.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-500">
                            No WHO standardized diagnoses found for "{diagnosisSearch}".
                          </div>
                        ) : (
                          filteredWHODiagnoses.map((item) => {
                            const formatted = `[${item.code}] ${item.name}`;
                            const isSelected = selectedDiagnoses.includes(formatted);

                            return (
                              <button
                                key={item.code}
                                type="button"
                                onClick={() => handleToggleDiagnosis(formatted)}
                                className={`w-full text-left px-3 py-2 rounded-xl text-xs flex items-center justify-between transition-colors cursor-pointer ${
                                  isSelected
                                    ? 'bg-indigo-50 text-indigo-900 font-semibold'
                                    : 'hover:bg-slate-50 text-slate-700'
                                }`}
                              >
                                <div className="space-y-0.5 pr-2">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                                      {item.code}
                                    </span>
                                    <span className="font-medium text-slate-900">{item.name}</span>
                                  </div>
                                  <span className="text-[10px] text-slate-400 block">{item.category}</span>
                                </div>

                                {isSelected && (
                                  <Check className="w-4 h-4 text-indigo-600 shrink-0" />
                                )}
                              </button>
                            );
                          })
                        )}
                      </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-500">
                    Matches clinical diagnoses against WHO International Classification of Diseases (ICD-10). Select multiple if patient has comorbid conditions.
                  </p>
                </div>
              </div>

              {/* Line Items */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900">Prescribed Line Items</h4>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    + Add Medication
                  </button>
                </div>

                {prescriptionItems.map((item, idx) => (
                  <div key={item.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700">Medicine #{idx + 1}</span>
                      {prescriptionItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-rose-500 hover:text-rose-700 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className="sm:col-span-2">
                        <select
                          value={item.medicineId}
                          onChange={(e) => handleItemChange(idx, 'medicineId', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium"
                        >
                          {medicines.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} ({m.dosage}) - {m.routeOfAdministration || 'Oral'}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <input
                          type="number"
                          min="1"
                          placeholder="Qty (e.g. 2)"
                          value={item.quantityPrescribed}
                          onChange={(e) => handleItemChange(idx, 'quantityPrescribed', parseInt(e.target.value) || 1)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold"
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Frequency (e.g. BD, TDS)"
                          value={item.frequency}
                          onChange={(e) => handleItemChange(idx, 'frequency', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Duration (e.g. 5 days)"
                          value={item.duration}
                          onChange={(e) => handleItemChange(idx, 'duration', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                      </div>

                      <div>
                        <input
                          type="text"
                          placeholder="Instructions (e.g. take after meals)"
                          value={item.instructions}
                          onChange={(e) => handleItemChange(idx, 'instructions', e.target.value)}
                          className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                >
                  Save Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Details View Modal */}
      {viewingRx && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="font-mono text-xs font-bold text-indigo-600">{viewingRx.prescriptionNumber}</span>
                <h3 className="text-base font-bold text-slate-900">{viewingRx.customerName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setViewingRx(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="text-xs space-y-2 text-slate-700">
              <p><strong>Doctor:</strong> {viewingRx.doctorName} ({viewingRx.doctorLicense || 'N/A'})</p>
              <p><strong>Clinic:</strong> {viewingRx.clinicHospital}</p>
              <p><strong>Date:</strong> {viewingRx.prescriptionDate}</p>
              {viewingRx.diagnosis && (
                <div className="p-2.5 bg-blue-50 border border-blue-100 rounded-xl space-y-1 mt-1">
                  <p className="text-[10px] font-bold uppercase text-blue-700">WHO Clinical Diagnosis:</p>
                  <p className="text-xs font-semibold text-blue-950">{viewingRx.diagnosis}</p>
                </div>
              )}
              {viewingRx.dispensedBy && (
                <p className="text-emerald-700 font-semibold pt-1">
                  <strong>Dispensed By:</strong> {viewingRx.dispensedBy} ({new Date(viewingRx.dispensedAt || '').toLocaleString()})
                </p>
              )}
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2">
              <h4 className="text-xs font-bold text-slate-900">Prescribed Medications:</h4>
              {viewingRx.items.map((i, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl text-xs space-y-1">
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>{i.medicineName}</span>
                    <span>{i.quantityPrescribed} units</span>
                  </div>
                  <p className="text-slate-600">{i.frequency} • {i.duration}</p>
                  {i.instructions && <p className="text-[11px] text-slate-500 italic">{i.instructions}</p>}
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end gap-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  const reportConfig: PrintReportOptions = {
                    title: 'Prescription Dispensation & Clinical Order',
                    subtitle: `Official prescription order record for ${viewingRx.customerName}`,
                    pharmacySettings: settings,
                    generatedBy: `${currentUser.name} (${currentUser.role.toUpperCase()})`,
                    dateRangeLabel: viewingRx.prescriptionDate,
                    kpiCards: [
                      { label: 'Prescription #', value: viewingRx.prescriptionNumber },
                      { label: 'Patient Name', value: viewingRx.customerName },
                      { label: 'Prescriber', value: viewingRx.doctorName, subtext: viewingRx.clinicHospital },
                      { label: 'Dispense Status', value: viewingRx.status.toUpperCase(), subtext: viewingRx.dispensedBy ? `By ${viewingRx.dispensedBy}` : 'Pending' }
                    ],
                    tables: [
                      {
                        title: 'Prescribed Regimen & Dosage Protocol',
                        headers: ['Medication', 'Qty', 'Frequency', 'Duration', 'Instructions'],
                        rows: viewingRx.items.map(i => [
                          i.medicineName,
                          i.quantityPrescribed,
                          i.frequency,
                          i.duration,
                          i.instructions || '-'
                        ]),
                        alignments: ['left', 'center', 'left', 'left', 'left']
                      }
                    ],
                    customHtml: viewingRx.diagnosis ? `
                      <div style="margin-bottom: 14px; padding: 8px 10px; background-color: #f0f9ff; border: 1px solid #bae6fd; border-radius: 6px;">
                        <span style="font-size: 9px; font-weight: 700; color: #0369a1; text-transform: uppercase;">WHO Clinical Diagnosis</span>
                        <div style="font-size: 11px; font-weight: 600; color: #0c4a6e; margin-top: 2px;">${viewingRx.diagnosis}</div>
                      </div>
                    ` : '',
                    showSignOff: true,
                    signOffTitle: 'Dispensing Pharmacist Verification',
                    signOffRole: 'Licensed Pharmacist'
                  };

                  setPrintModalOptions(reportConfig);
                  setIsPrintModalOpen(true);
                }}
                className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5 mr-1.5" />
                Print Prescription Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Print & PDF Modal */}
      <ReportPrintModal
        isOpen={isPrintModalOpen}
        onClose={() => setIsPrintModalOpen(false)}
        options={printModalOptions}
      />
    </div>
  );
};
