import React, { useState, useMemo, useEffect } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import {
  PurchaseOrder,
  PurchaseOrderItem,
  Supplier,
  PaymentStatus,
  OrderStatus
} from '../../types';
import {
  Truck,
  Plus,
  Search,
  CheckCircle,
  Clock,
  Trash2,
  X,
  Building,
  DollarSign,
  Package,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  Edit2,
  Info,
  HelpCircle,
  Check,
  FileText,
  AlertCircle,
  CheckCircle2,
  Lock,
  AlertTriangle,
  Sparkles,
  CheckSquare
} from 'lucide-react';
import { safeFixed } from '../../utils/formatters';
import { MedicineMultiSelectModal } from './MedicineMultiSelectModal';

interface PurchasesViewProps {
  initialPrefillLowStock?: boolean;
  onClearPrefill?: () => void;
}

export const PurchasesView: React.FC<PurchasesViewProps> = ({
  initialPrefillLowStock = false,
  onClearPrefill,
}) => {
  const {
    purchaseOrders,
    suppliers,
    medicines,
    lowStockMedicines,
    getMedicineTotalStock,
    createPurchaseOrder,
    updatePurchaseOrder,
    approvePurchaseOrder,
    receivePurchaseOrder,
    addSupplier,
    updateSupplier,
    settings,
    currentUser
  } = usePharmacy();

  const [activeTab, setActiveTab] = useState<'orders' | 'suppliers'>('orders');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // New/Edit PO Modal State
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);
  const [editingPO, setEditingPO] = useState<PurchaseOrder | null>(null);
  const [supplierId, setSupplierId] = useState(suppliers[0]?.id || '');
  const [expectedDate, setExpectedDate] = useState(
    new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  );
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('pending');
  const [notes, setNotes] = useState('');
  const [poItems, setPoItems] = useState<PurchaseOrderItem[]>([
    {
      id: 'poi-1',
      medicineId: medicines[0]?.id || '',
      medicineName: medicines[0]?.name || '',
      quantityOrdered: 50,
      quantityReceived: 0,
      unitCost: medicines[0]?.purchasePrice || 5.0,
      totalCost: (medicines[0]?.purchasePrice || 5.0) * 50,
    }
  ]);

  // Multi-Medicine Selection Modal State
  const [isMultiSelectModalOpen, setIsMultiSelectModalOpen] = useState(false);

  // Sorted Medicines list: Low Stock items presented FIRST, followed by in-stock items
  const sortedMedicines = useMemo(() => {
    const lowMap = new Map<string, number>();
    lowStockMedicines.forEach(item => {
      lowMap.set(item.medicine.id, item.currentStock);
    });

    return [...medicines].map(med => {
      const isRecordedLow = lowMap.has(med.id);
      const stock = isRecordedLow ? (lowMap.get(med.id) ?? 0) : getMedicineTotalStock(med.id);
      const isOutOfStock = stock <= 0;
      const minLevel = med.minimumStockLevel || 30;
      const isLowStock = isRecordedLow || stock <= minLevel;
      return {
        ...med,
        currentStock: stock,
        isOutOfStock,
        isLowStock,
        minLevel,
      };
    }).sort((a, b) => {
      // Priority 1: Out of stock
      if (a.isOutOfStock && !b.isOutOfStock) return -1;
      if (!a.isOutOfStock && b.isOutOfStock) return 1;

      // Priority 2: Low stock
      if (a.isLowStock && !b.isLowStock) return -1;
      if (!a.isLowStock && b.isLowStock) return 1;

      // Priority 3: Lowest stock count first among low stock
      if (a.isLowStock && b.isLowStock && a.currentStock !== b.currentStock) {
        return a.currentStock - b.currentStock;
      }

      // Priority 4: Alphabetical
      return a.name.localeCompare(b.name);
    });
  }, [medicines, lowStockMedicines, getMedicineTotalStock]);

  const lowStockSortedList = useMemo(() => {
    return sortedMedicines.filter(m => m.isLowStock);
  }, [sortedMedicines]);

  const inStockSortedList = useMemo(() => {
    return sortedMedicines.filter(m => !m.isLowStock);
  }, [sortedMedicines]);

  // Receiving Goods Modal State
  const [receivingPO, setReceivingPO] = useState<PurchaseOrder | null>(null);
  const [receivingBatchDetails, setReceivingBatchDetails] = useState<{
    [itemId: string]: {
      batchNumber: string;
      manufacturingDate: string;
      expiryDate: string;
      quantityReceived: number;
    };
  }>({});

  // Supplier Modal State (Add & Edit)
  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [supplierName, setSupplierName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [supplierPhone, setSupplierPhone] = useState('');
  const [supplierEmail, setSupplierEmail] = useState('');
  const [supplierAddress, setSupplierAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30');
  const [supplierStatus, setSupplierStatus] = useState<'active' | 'inactive'>('active');

  const canManagePurchases =
    currentUser.role === 'admin' ||
    currentUser.role === 'storekeeper' ||
    currentUser.role === 'pharmacist';

  const canApprovePO = currentUser.role === 'admin' || currentUser.role === 'pharmacist';
  const isSystemAdmin = currentUser.role === 'admin';

  // Open Create PO with All Low Stock Medicines pre-populated
  const handleOpenCreatePOWithLowStock = () => {
    setEditingPO(null);
    setSupplierId(suppliers[0]?.id || '');
    setExpectedDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setPaymentStatus('pending');
    setNotes(`Replenishment purchase order for ${lowStockMedicines.length} low stock & out of stock medicines.`);

    const items: PurchaseOrderItem[] = lowStockMedicines.map((item, idx) => {
      const minLevel = Number(item.medicine.minimumStockLevel) || 30;
      const currentStock = Number(item.currentStock) || 0;
      const suggestedQty = currentStock <= 0 ? Math.max(50, minLevel * 2) : Math.max(30, minLevel * 2 - currentStock);
      const cost = Number(item.medicine.purchasePrice) || 10;
      return {
        id: `poi-low-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        medicineId: item.medicine.id,
        medicineName: item.medicine.name,
        genericName: item.medicine.genericName || '',
        quantityOrdered: suggestedQty,
        quantityReceived: 0,
        unitCost: cost,
        totalCost: suggestedQty * cost,
      };
    });

    setPoItems(items.length > 0 ? items : [
      {
        id: `poi-${Date.now()}`,
        medicineId: sortedMedicines[0]?.id || '',
        medicineName: sortedMedicines[0]?.name || '',
        quantityOrdered: 50,
        quantityReceived: 0,
        unitCost: sortedMedicines[0]?.purchasePrice || 5.0,
        totalCost: (sortedMedicines[0]?.purchasePrice || 5.0) * 50,
      }
    ]);
    setIsPOModalOpen(true);
  };

  // Trigger low stock PO auto-open if navigated from Alert Banner
  useEffect(() => {
    if (initialPrefillLowStock) {
      if (lowStockMedicines.length > 0) {
        handleOpenCreatePOWithLowStock();
      } else {
        handleOpenCreatePO();
      }
      onClearPrefill?.();
    }
  }, [initialPrefillLowStock]);

  // Open Standard Create PO Modal
  const handleOpenCreatePO = () => {
    setEditingPO(null);
    setSupplierId(suppliers[0]?.id || '');
    setExpectedDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
    setPaymentStatus('pending');
    setNotes('');
    const firstMed = sortedMedicines[0] || medicines[0];
    const unitCost = Number(firstMed?.purchasePrice || 5.0);
    setPoItems([
      {
        id: `poi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        medicineId: firstMed?.id || '',
        medicineName: firstMed?.name || '',
        quantityOrdered: 50,
        quantityReceived: 0,
        unitCost,
        totalCost: unitCost * 50,
      }
    ]);
    setIsPOModalOpen(true);
  };

  // Open Edit PO Modal
  const handleOpenEditPO = (po: PurchaseOrder) => {
    if (po.isApproved || po.status === 'approved' || po.status === 'received') {
      alert('This Purchase Order has already been approved by the System Admin or received, and cannot be modified.');
      return;
    }
    setEditingPO(po);
    setSupplierId(po.supplierId);
    setExpectedDate(po.expectedDeliveryDate || new Date().toISOString().split('T')[0]);
    setPaymentStatus(po.paymentStatus || 'pending');
    setNotes(po.notes || '');
    setPoItems(
      po.items.map((item, idx) => {
        const qty = Number(item.quantityOrdered || item.quantity || 1);
        const cost = Number(item.unitCost || 0);
        return {
          ...item,
          id: item.id || `poi-edit-${Date.now()}-${idx}`,
          quantityOrdered: qty,
          unitCost: cost,
          totalCost: Number(item.totalCost) || (qty * cost),
        };
      })
    );
    setIsPOModalOpen(true);
  };

  const handleAddPOLine = () => {
    const med = sortedMedicines[0] || medicines[0];
    const unitCost = Number(med ? med.purchasePrice : 10);
    setPoItems(prev => [
      ...prev,
      {
        id: `poi-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        medicineId: med ? med.id : '',
        medicineName: med ? med.name : '',
        genericName: med ? med.genericName : '',
        quantityOrdered: 20,
        quantityReceived: 0,
        unitCost,
        totalCost: unitCost * 20,
      }
    ]);
  };

  // Add multiple items selected via checkboxes
  const handleConfirmAddMultipleMedicines = (selectedItems: PurchaseOrderItem[]) => {
    setPoItems(prev => {
      // If the PO currently only has 1 default/empty unedited item, replace it
      const isSingleDefault =
        prev.length === 1 &&
        (prev[0].medicineId === (medicines[0]?.id || '') || prev[0].medicineId === (sortedMedicines[0]?.id || '')) &&
        prev[0].quantityOrdered === 50 &&
        prev[0].quantityReceived === 0;

      if (isSingleDefault) {
        return selectedItems;
      }

      // Merge avoiding duplicate medicine entries
      const existingMedIds = new Set(prev.map(p => p.medicineId));
      const newItemsToAppend = selectedItems.filter(item => !existingMedIds.has(item.medicineId));
      return [...prev, ...newItemsToAppend];
    });
  };

  // Auto-fill all low stock inside open modal
  const handleAutoFillAllLowStockInsideModal = () => {
    if (lowStockMedicines.length === 0) return;
    const items: PurchaseOrderItem[] = lowStockMedicines.map((item, idx) => {
      const minLevel = item.medicine.minimumStockLevel || 30;
      const suggestedQty = item.currentStock <= 0 ? Math.max(50, minLevel * 2) : Math.max(30, minLevel * 2 - item.currentStock);
      const cost = Number(item.medicine.purchasePrice || 10);
      return {
        id: `poi-low-${Date.now()}-${idx}-${Math.random().toString(36).substring(2, 7)}`,
        medicineId: item.medicine.id,
        medicineName: item.medicine.name,
        genericName: item.medicine.genericName || '',
        quantityOrdered: suggestedQty,
        quantityReceived: 0,
        unitCost: cost,
        totalCost: suggestedQty * cost,
      };
    });
    setPoItems(items);
  };

  const handlePOLineChange = (index: number, field: string, val: any) => {
    const updated = [...poItems];
    if (!updated[index]) return;

    if (field === 'medicineId') {
      const selectedMed = medicines.find(m => m.id === val);
      if (selectedMed) {
        const qty = Number(updated[index].quantityOrdered || updated[index].quantity || 1);
        const cost = Number(selectedMed.purchasePrice || 0);
        updated[index] = {
          ...updated[index],
          medicineId: val,
          medicineName: selectedMed.name,
          genericName: selectedMed.genericName,
          unitCost: cost,
          totalCost: cost * qty,
        };
      }
    } else if (field === 'quantityOrdered') {
      const parsed = parseInt(val);
      const qty = isNaN(parsed) ? 1 : Math.max(1, parsed);
      const cost = Number(updated[index].unitCost || 0);
      updated[index] = {
        ...updated[index],
        quantityOrdered: isNaN(parsed) ? (val === '' ? '' as any : 1) : qty,
        quantity: qty,
        totalCost: qty * cost,
      };
    } else if (field === 'unitCost') {
      const parsed = parseFloat(val);
      const cost = isNaN(parsed) ? 0 : Math.max(0, parsed);
      const qty = Number(updated[index].quantityOrdered || updated[index].quantity || 1);
      updated[index] = {
        ...updated[index],
        unitCost: isNaN(parsed) ? (val === '' ? '' as any : 0) : cost,
        totalCost: qty * cost,
      };
    } else {
      updated[index] = { ...updated[index], [field]: val };
    }
    setPoItems(updated);
  };

  const handleRemovePOLine = (index: number) => {
    if (poItems.length <= 1) {
      alert('A purchase order must have at least one line item.');
      return;
    }
    setPoItems(prev => prev.filter((_, i) => i !== index));
  };

  const handleSavePOSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find(s => s.id === supplierId);
    const total = poItems.reduce((sum, item) => sum + item.totalCost, 0);

    if (editingPO) {
      updatePurchaseOrder(editingPO.id, {
        supplierId,
        supplierName: sup ? sup.name : editingPO.supplierName,
        expectedDeliveryDate: expectedDate,
        items: poItems,
        totalAmount: total,
        paymentStatus,
        notes,
      });
    } else {
      createPurchaseOrder({
        supplierId,
        supplierName: sup ? sup.name : 'Direct Supplier',
        orderDate: new Date().toISOString().split('T')[0],
        expectedDeliveryDate: expectedDate,
        items: poItems,
        totalAmount: total,
        paymentStatus,
        status: 'pending',
        notes,
        isApproved: false,
      });
    }

    setIsPOModalOpen(false);
    setEditingPO(null);
  };

  // Open Receive Modal
  const handleOpenReceiveModal = (po: PurchaseOrder) => {
    if (!po.isApproved && po.status !== 'approved') {
      alert(`Cannot receive stock: Purchase Order ${po.poNumber} is awaiting approval from the System Administrator or Head Pharmacist. Stocks cannot be received if approval is pending.`);
      return;
    }

    setReceivingPO(po);
    const initDetails: any = {};
    po.items.forEach(item => {
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      initDetails[item.id] = {
        batchNumber: `BATCH-INB-${randomSuffix}`,
        manufacturingDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        expiryDate: new Date(Date.now() + 540 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        quantityReceived: item.quantityOrdered || item.quantity || 1,
      };
    });
    setReceivingBatchDetails(initDetails);
  };

  // Confirm Inbound Delivery into Store Inventory
  const handleConfirmReceiveGoods = (e: React.FormEvent) => {
    e.preventDefault();
    if (!receivingPO) return;

    const result = receivePurchaseOrder(
      receivingPO.id,
      'Inbound stock received, physical batches verified, and inventory updated',
      receivingBatchDetails
    );

    if (result && !result.success) {
      alert(result.error || 'Failed to receive stock.');
      return;
    }

    setReceivingPO(null);
  };

  // Supplier Add / Edit Modal Controls
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setSupplierName('');
    setContactPerson('');
    setSupplierPhone('');
    setSupplierEmail('');
    setSupplierAddress('');
    setPaymentTerms('Net 30');
    setSupplierStatus('active');
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setSupplierName(sup.name);
    setContactPerson(sup.contactPerson || '');
    setSupplierPhone(sup.phone || sup.telephone || '');
    setSupplierEmail(sup.email || '');
    setSupplierAddress(sup.address || '');
    setPaymentTerms(sup.paymentTerms || 'Net 30');
    setSupplierStatus(sup.status || 'active');
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplierSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierName.trim()) return;

    if (editingSupplier) {
      updateSupplier(editingSupplier.id, {
        name: supplierName.trim(),
        contactPerson: contactPerson.trim(),
        telephone: supplierPhone.trim(),
        phone: supplierPhone.trim(),
        email: supplierEmail.trim(),
        address: supplierAddress.trim(),
        paymentTerms: paymentTerms.trim(),
        status: supplierStatus,
      });
    } else {
      addSupplier({
        name: supplierName.trim(),
        contactPerson: contactPerson.trim(),
        telephone: supplierPhone.trim(),
        phone: supplierPhone.trim(),
        email: supplierEmail.trim(),
        address: supplierAddress.trim(),
        paymentTerms: paymentTerms.trim(),
        status: 'active',
      });
    }

    setIsSupplierModalOpen(false);
    setEditingSupplier(null);
  };

  const filteredOrders = useMemo(() => {
    return purchaseOrders.filter(po => {
      const matchStatus =
        statusFilter === 'all' ||
        po.status === statusFilter ||
        (statusFilter === 'approved' && po.isApproved);
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        po.poNumber.toLowerCase().includes(term) ||
        po.supplierName.toLowerCase().includes(term);
      return matchStatus && matchSearch;
    });
  }, [purchaseOrders, statusFilter, searchTerm]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200 shadow-xs">
        <div>
          <h2 className="text-xl font-bold text-slate-900">Procurement & Supplier Inbound</h2>
          <p className="text-xs text-slate-500 mt-1">
            Manage purchase orders, vendor supplier directory, and goods receipt verification.
          </p>
        </div>

        {canManagePurchases && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleOpenAddSupplier}
              className="inline-flex items-center px-3 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
            >
              <Building className="w-4 h-4 mr-1.5 text-indigo-600" />
              + Vendor
            </button>

            {lowStockMedicines.length > 0 && (
              <button
                type="button"
                onClick={handleOpenCreatePOWithLowStock}
                className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 rounded-xl transition-colors cursor-pointer shadow-2xs"
                title="Create purchase order pre-filled with all low stock medications"
              >
                <Sparkles className="w-4 h-4 mr-1.5 text-amber-800" />
                Reorder Low Stock ({lowStockMedicines.length})
              </button>
            )}

            <button
              type="button"
              onClick={() => {
                handleOpenCreatePO();
                setIsMultiSelectModalOpen(true);
              }}
              className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-xl border border-indigo-200 transition-colors cursor-pointer"
            >
              <CheckSquare className="w-4 h-4 mr-1.5 text-indigo-600" />
              Batch Select (Checkboxes)
            </button>

            <button
              type="button"
              onClick={handleOpenCreatePO}
              className="inline-flex items-center px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Create Purchase Order
            </button>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveTab('orders')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'orders'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Purchase Orders ({purchaseOrders.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('suppliers')}
          className={`px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
            activeTab === 'suppliers'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          Supplier / Vendor Directory ({suppliers.length})
        </button>
      </div>

      {/* TAB 1: PURCHASE ORDERS */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          {/* Low Stock Replenishment Quick Action Card */}
          {lowStockMedicines.length > 0 && (
            <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs text-amber-950 shadow-2xs">
              <div className="flex items-start space-x-3">
                <div className="p-2 bg-amber-100 text-amber-700 rounded-xl shrink-0 mt-0.5">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-amber-900 text-sm">
                    {lowStockMedicines.length} Medication(s) Below Reorder Threshold
                  </h4>
                  <p className="text-amber-800 text-xs mt-0.5">
                    {lowStockMedicines.map(item => `${item.medicine.name} (${item.currentStock} left)`).slice(0, 3).join(', ')}
                    {lowStockMedicines.length > 3 && ` +${lowStockMedicines.length - 3} more`}
                  </p>
                </div>
              </div>
              <div className="flex items-center flex-wrap gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleOpenCreatePOWithLowStock}
                  className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-amber-950 bg-amber-200 hover:bg-amber-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  <Sparkles className="w-4 h-4 mr-1.5 text-amber-800" />
                  Reorder All {lowStockMedicines.length} Low Stock Items
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleOpenCreatePO();
                    setIsMultiSelectModalOpen(true);
                  }}
                  className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-indigo-900 bg-indigo-100 hover:bg-indigo-200 rounded-xl transition-all cursor-pointer border border-indigo-200"
                >
                  <CheckSquare className="w-4 h-4 mr-1.5 text-indigo-700" />
                  Select with Checkboxes
                </button>
              </div>
            </div>
          )}

          {/* Purchase Order Approval Authority Banner */}
          <div className="bg-indigo-50/70 border border-indigo-200/80 rounded-2xl p-3.5 flex items-start space-x-3 text-xs text-indigo-950">
            <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5 flex-1">
              <p className="font-bold text-indigo-900">Purchase Order Approval Authority:</p>
              <p className="text-indigo-800 text-[11px] leading-relaxed">
                Purchase orders are reviewed and approved by the <strong>System Administrator</strong> or <strong>Head Pharmacist</strong>. Stock batches <strong>cannot be received into inventory while approval is pending</strong>. Once approved, authorized personnel can receive goods and synchronize batches.
              </p>
            </div>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Search PO #, Supplier..."
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
              <option value="all">All Statuses</option>
              <option value="pending">Pending Inbound / Pending Approval</option>
              <option value="approved">Approved by Admin</option>
              <option value="received">Fully Received into Inventory</option>
            </select>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="bg-white p-12 text-center rounded-3xl border border-slate-200 text-slate-500 text-xs">
              No purchase orders found matching your search criteria.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredOrders.map((po) => {
                const isReceived = po.status === 'received';
                const isApproved = po.isApproved || po.status === 'approved';
                const canEditThisPO = canManagePurchases && !isApproved && !isReceived;

                return (
                  <div
                    key={po.id}
                    className={`p-5 bg-white rounded-3xl border transition-all space-y-3.5 ${
                      isReceived
                        ? 'border-emerald-200 bg-emerald-50/20'
                        : isApproved
                        ? 'border-indigo-200 bg-indigo-50/10 shadow-xs'
                        : 'border-amber-200 shadow-sm shadow-amber-50/50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {po.poNumber}
                          </span>
                          {isApproved ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-800">
                              <Check className="w-3 h-3 mr-1" />
                              Approved by Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3 mr-1" />
                              Pending Approval
                            </span>
                          )}
                        </div>
                        <h3 className="text-sm font-bold text-slate-900 mt-1.5">{po.supplierName}</h3>
                        <p className="text-[11px] text-slate-500 flex items-center mt-0.5">
                          <Calendar className="w-3.5 h-3.5 mr-1 text-slate-400" />
                          Ordered: {po.orderDate} • Expected: {po.expectedDeliveryDate || 'N/A'}
                        </p>
                        {po.approvedBy && (
                          <p className="text-[10px] text-indigo-600 font-medium mt-0.5">
                            Approved by {po.approvedBy} on {po.approvedAt ? po.approvedAt.split('T')[0] : 'N/A'}
                          </p>
                        )}
                      </div>

                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          isReceived
                            ? 'bg-emerald-100 text-emerald-800'
                            : isApproved
                            ? 'bg-indigo-100 text-indigo-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {po.status}
                      </span>
                    </div>

                    {/* Items Summary */}
                    <div className="p-3 bg-slate-50 rounded-2xl space-y-1.5 text-xs">
                      {po.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-center text-slate-700">
                          <span className="font-medium truncate max-w-[200px]">{item.medicineName}</span>
                          <div className="space-x-2 text-right">
                            <span className="text-slate-500">
                              {item.quantityOrdered || item.quantity} units @ {settings.currencySymbol}
                              {safeFixed(item.unitCost)}
                            </span>
                            <span className="font-bold text-slate-900">
                              {settings.currencySymbol}
                              {safeFixed(item.totalCost)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    {po.notes && (
                      <p className="text-[11px] text-slate-500 italic bg-white p-2 rounded-lg border border-slate-100">
                        "{po.notes}"
                      </p>
                    )}

                    {/* Footer & Actions */}
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Purchase Value</p>
                        <p className="text-base font-extrabold text-slate-900">
                          {settings.currencySymbol}
                          {safeFixed(po.totalAmount)}
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2">
                        {/* Edit Button: ONLY if not approved and not received */}
                        {canEditThisPO ? (
                          <button
                            type="button"
                            onClick={() => handleOpenEditPO(po)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                            title="Edit unapproved purchase order"
                          >
                            <Edit2 className="w-3.5 h-3.5 mr-1" />
                            Edit PO
                          </button>
                        ) : isApproved && !isReceived ? (
                          <span className="inline-flex items-center px-2 py-1 text-[11px] text-slate-400 font-medium bg-slate-100 rounded-lg">
                            <Lock className="w-3 h-3 mr-1" />
                            Locked (Approved)
                          </span>
                        ) : null}

                        {/* Approve PO Button (Admin & Pharmacist) */}
                        {canApprovePO && !isApproved && !isReceived && (
                          <button
                            type="button"
                            onClick={() => approvePurchaseOrder(po.id, currentUser.name)}
                            className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-xl transition-colors cursor-pointer shadow-2xs"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                            Approve PO
                          </button>
                        )}

                        {/* Receive into Inventory: STRICTLY requires isApproved */}
                        {!isReceived && canManagePurchases && (
                          isApproved ? (
                            <button
                              type="button"
                              onClick={() => handleOpenReceiveModal(po)}
                              className="inline-flex items-center px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                            >
                              <CheckCircle className="w-3.5 h-3.5 mr-1" />
                              Receive Stock
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              title="Stocks cannot be received if approval is pending. System Administrator or Head Pharmacist must approve first."
                              className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-slate-400 bg-slate-100 border border-slate-200 rounded-xl cursor-not-allowed opacity-80"
                            >
                              <Lock className="w-3.5 h-3.5 mr-1 text-amber-500" />
                              Pending Approval (Locked)
                            </button>
                          )
                        )}

                        {isReceived && (
                          <span className="text-xs text-emerald-700 font-semibold flex items-center">
                            <ShieldCheck className="w-4 h-4 mr-1" />
                            Stock Synchronized
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: SUPPLIER / VENDOR DIRECTORY */}
      {activeTab === 'suppliers' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Authorized Pharmaceutical Vendors</h3>
              <p className="text-xs text-slate-500">
                Maintain vendor representative contacts, billing terms, warehouse logistics, and fulfillment history.
              </p>
            </div>
            {canManagePurchases && (
              <button
                type="button"
                onClick={handleOpenAddSupplier}
                className="inline-flex items-center px-3.5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Vendor
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {suppliers.map((sup) => (
              <div key={sup.id} className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex justify-between items-start">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
                      <Building className="w-5 h-5" />
                    </div>
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-semibold rounded-md">
                      {sup.paymentTerms || 'Net 30'}
                    </span>
                  </div>

                  <div className="mt-2">
                    <h4 className="text-sm font-bold text-slate-900">{sup.name}</h4>
                    <p className="text-xs text-slate-500">Rep: {sup.contactPerson || 'General Inquiries'}</p>
                  </div>

                  <div className="text-xs space-y-1 text-slate-600 border-t border-slate-100 pt-2.5 mt-2">
                    <p><strong>Phone:</strong> {sup.phone || sup.telephone || 'N/A'}</p>
                    <p><strong>Email:</strong> {sup.email || 'N/A'}</p>
                    <p><strong>Address:</strong> {sup.address || 'N/A'}</p>
                    {sup.status && (
                      <p>
                        <strong>Status:</strong>{' '}
                        <span className={sup.status === 'active' ? 'text-emerald-600 font-semibold' : 'text-slate-400 font-semibold'}>
                          {sup.status.toUpperCase()}
                        </span>
                      </p>
                    )}
                  </div>
                </div>

                {canManagePurchases && (
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                    <button
                      type="button"
                      onClick={() => handleOpenEditSupplier(sup)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-indigo-600 bg-slate-50 hover:bg-indigo-50 rounded-xl transition-colors cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 mr-1" />
                      Edit Vendor Details
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Create / Edit Purchase Order Modal with Text Guides */}
      {isPOModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-3xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div className="flex items-center space-x-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-bold text-slate-900">
                  {editingPO ? `Edit Purchase Order: ${editingPO.poNumber}` : 'Create Inbound Purchase Order'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPOModalOpen(false);
                  setEditingPO(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePOSubmit} className="p-6 space-y-5 max-h-[78vh] overflow-y-auto">
              {/* Text Guide Banner */}
              <div className="bg-indigo-50/80 border border-indigo-200 rounded-2xl p-3.5 flex items-start space-x-3 text-xs text-indigo-950">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="space-y-1 leading-relaxed">
                  <p className="font-bold text-indigo-900">Purchase Order Workflow & Policy Guide:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-indigo-900/90">
                    <li>
                      <strong>Approval Requirement:</strong> Purchase orders remain fully editable until approved by a <strong>System Admin</strong>.
                    </li>
                    <li>
                      <strong>Automatic Cost Calculation:</strong> Unit purchasing cost multiplied by order quantity calculates the total commitment amount automatically.
                    </li>
                    <li>
                      <strong>Inventory Inbound:</strong> Once delivered, receiving the order allows batch expiration tracking and registers goods into active FEFO inventory.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Vendor & Delivery Date Section with helper text */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Vendor Supplier *
                  </label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.paymentTerms || 'Net 30'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[10px] text-slate-500">
                    Select the licensed distributor or manufacturer fulfilling this shipment.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Expected Inbound Delivery Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={expectedDate}
                    onChange={(e) => setExpectedDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-500">
                    Anticipated arrival date at the pharmacy loading dock or central storeroom.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Payment Terms / Status
                  </label>
                  <select
                    value={paymentStatus}
                    onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                  >
                    <option value="pending">Pending (Invoice On Delivery / Net Terms)</option>
                    <option value="paid">Prepaid / Paid in Full</option>
                    <option value="partial">Partially Paid</option>
                    <option value="due">Payment Due Upon Receipt</option>
                  </select>
                  <p className="text-[10px] text-slate-500">
                    Accounts payable status for this procurement cycle.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-slate-700">
                    Logistics / Order Notes (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Urgent reorder for high-demand antibiotics"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                  <p className="text-[10px] text-slate-500">
                    Special freight instructions, storage requirements (e.g. Cold Chain), or supplier memo.
                  </p>
                </div>
              </div>

              {/* Line Items Section with helper text */}
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">Ordered Pharmaceutical Items</h4>
                    <p className="text-[10px] text-slate-500">
                      Specify the target medicine formulation, order quantities, and agreed wholesale unit cost.
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    {lowStockMedicines.length > 0 && (
                      <button
                        type="button"
                        onClick={handleAutoFillAllLowStockInsideModal}
                        className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition-colors cursor-pointer border border-amber-300"
                        title="Replace items with all low-stock medicines"
                      >
                        <Sparkles className="w-3.5 h-3.5 mr-1 text-amber-700" />
                        Auto-Fill Low Stock ({lowStockMedicines.length})
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIsMultiSelectModalOpen(true)}
                      className="inline-flex items-center px-2.5 py-1.5 text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-xl transition-colors cursor-pointer border border-indigo-200"
                    >
                      <CheckSquare className="w-3.5 h-3.5 mr-1 text-indigo-600" />
                      Batch Select (Checkboxes)
                    </button>
                    <button
                      type="button"
                      onClick={handleAddPOLine}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors cursor-pointer shadow-xs"
                    >
                      <Plus className="w-3.5 h-3.5 mr-1" />
                      Add Item
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5">
                  {poItems.map((item, idx) => (
                    <div key={item.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[11px] font-bold text-slate-700">Line Item #{idx + 1}</span>
                        {poItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemovePOLine(idx)}
                            className="text-rose-500 hover:text-rose-700 p-1 rounded-md cursor-pointer"
                            title="Remove item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5 items-end">
                        <div className="sm:col-span-2">
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                            Medicine Formulation (Low Stock Prioritized)
                          </label>
                          <select
                            value={item.medicineId}
                            onChange={(e) => handlePOLineChange(idx, 'medicineId', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-medium"
                          >
                            {lowStockSortedList.length > 0 && (
                              <optgroup label="⚠️ LOW STOCK & DEPLETED (PRIORITIZED)">
                                {lowStockSortedList.map(m => (
                                  <option key={m.id} value={m.id}>
                                    ⚠️ {m.name} ({m.dosage || 'Std'}) — {m.currentStock <= 0 ? 'OUT OF STOCK (0)' : `LOW (${m.currentStock} left)`}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            <optgroup label="IN STOCK MEDICATIONS">
                              {inStockSortedList.map(m => (
                                <option key={m.id} value={m.id}>
                                  {m.name} ({m.dosage || 'Std'}) — {m.currentStock} in stock
                                </option>
                              ))}
                            </optgroup>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                            Order Quantity (Units)
                          </label>
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty (e.g. 50)"
                            value={item.quantityOrdered}
                            onChange={(e) => handlePOLineChange(idx, 'quantityOrdered', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-bold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-600 mb-1">
                            Unit Cost ({settings.currencySymbol})
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            placeholder="Cost"
                            value={item.unitCost}
                            onChange={(e) => handlePOLineChange(idx, 'unitCost', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-lg font-semibold text-slate-900"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-semibold text-slate-400 mb-1">
                            Line Total ({settings.currencySymbol})
                          </label>
                          <div className="px-2.5 py-1.5 text-xs bg-slate-100 border border-slate-200 rounded-lg font-extrabold text-slate-900 text-right">
                            {safeFixed(item.totalCost)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Total & Submit */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-slate-400">Total Purchase Order Commitment</p>
                  <p className="text-lg font-extrabold text-indigo-700">
                    {settings.currencySymbol}
                    {safeFixed(poItems.reduce((sum, item) => sum + (item.totalCost || 0), 0))}
                  </p>
                </div>

                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsPOModalOpen(false);
                      setEditingPO(null);
                    }}
                    className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {editingPO ? 'Save Changes' : 'Generate Purchase Order'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Receive Goods & Batch Allocation Modal */}
      {receivingPO && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
              <div>
                <h3 className="text-base font-bold text-slate-900">Receive Inbound Goods into Stock</h3>
                <p className="text-xs text-slate-500">
                  PO: {receivingPO.poNumber} • Supplier: {receivingPO.supplierName}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setReceivingPO(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmReceiveGoods} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <p className="text-xs text-slate-600">
                Confirm received quantities, manufacturer batch numbers, and expiry dates to register these items directly into active FEFO inventory.
              </p>

              <div className="space-y-4">
                {receivingPO.items.map((item) => {
                  const details = receivingBatchDetails[item.id] || {
                    batchNumber: '',
                    manufacturingDate: '',
                    expiryDate: '',
                    quantityReceived: item.quantityOrdered,
                  };

                  return (
                    <div key={item.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-slate-900 text-xs">{item.medicineName}</span>
                        <span className="text-xs text-slate-500">Ordered: {item.quantityOrdered} units</span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Physical Batch # (from box) *
                          </label>
                          <input
                            type="text"
                            required
                            value={details.batchNumber}
                            onChange={(e) => {
                              setReceivingBatchDetails(prev => ({
                                ...prev,
                                [item.id]: { ...details, batchNumber: e.target.value },
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-mono"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Quantity Received *
                          </label>
                          <input
                            type="number"
                            min="1"
                            required
                            value={details.quantityReceived}
                            onChange={(e) => {
                              setReceivingBatchDetails(prev => ({
                                ...prev,
                                [item.id]: { ...details, quantityReceived: parseInt(e.target.value) || 0 },
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Manufacturing Date *
                          </label>
                          <input
                            type="date"
                            required
                            value={details.manufacturingDate}
                            onChange={(e) => {
                              setReceivingBatchDetails(prev => ({
                                ...prev,
                                [item.id]: { ...details, manufacturingDate: e.target.value },
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                            Expiration Date (FEFO) *
                          </label>
                          <input
                            type="date"
                            required
                            value={details.expiryDate}
                            onChange={(e) => {
                              setReceivingBatchDetails(prev => ({
                                ...prev,
                                [item.id]: { ...details, expiryDate: e.target.value },
                              }));
                            }}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-300 rounded-lg font-semibold text-indigo-700"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setReceivingPO(null)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs cursor-pointer"
                >
                  Commit to Store Inventory
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Supplier / Vendor Modal (Add & Edit) */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingSupplier ? `Edit Vendor: ${editingSupplier.name}` : 'Add Pharmaceutical Vendor'}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsSupplierModalOpen(false);
                  setEditingSupplier(null);
                }}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplierSubmit} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Novartis Pharma Distributors"
                  value={supplierName}
                  onChange={(e) => setSupplierName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Contact Representative</label>
                <input
                  type="text"
                  placeholder="e.g. Sarah Jenkins"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone *</label>
                  <input
                    type="text"
                    required
                    placeholder="+1 555-0199"
                    value={supplierPhone}
                    onChange={(e) => setSupplierPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Terms</label>
                  <input
                    type="text"
                    placeholder="e.g. Net 30, COD"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                <input
                  type="email"
                  placeholder="orders@pharma.com"
                  value={supplierEmail}
                  onChange={(e) => setSupplierEmail(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Warehouse Address</label>
                <input
                  type="text"
                  placeholder="Logistics Hub 4, West City"
                  value={supplierAddress}
                  onChange={(e) => setSupplierAddress(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Status</label>
                <select
                  value={supplierStatus}
                  onChange={(e) => setSupplierStatus(e.target.value as 'active' | 'inactive')}
                  className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden font-medium"
                >
                  <option value="active">Active Vendor</option>
                  <option value="inactive">Inactive / Suspended Vendor</option>
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsSupplierModalOpen(false);
                    setEditingSupplier(null);
                  }}
                  className="px-3.5 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl cursor-pointer"
                >
                  {editingSupplier ? 'Update Vendor' : 'Save Vendor'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Multi-Medicine Selection Modal with Checkboxes */}
      <MedicineMultiSelectModal
        isOpen={isMultiSelectModalOpen}
        onClose={() => setIsMultiSelectModalOpen(false)}
        onConfirmAdd={handleConfirmAddMultipleMedicines}
        medicines={medicines}
        lowStockMedicines={lowStockMedicines}
        getMedicineTotalStock={getMedicineTotalStock}
        currencySymbol={settings.currencySymbol}
      />
    </div>
  );
};
