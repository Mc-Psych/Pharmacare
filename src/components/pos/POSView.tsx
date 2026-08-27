import React, { useState, useMemo, useEffect } from 'react';
import { usePharmacy } from '../../context/PharmacyContext';
import {
  Medicine,
  MedicineBatch,
  SaleItem,
  PaymentMethod,
  Sale,
  Customer
} from '../../types';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  AlertTriangle,
  FileCheck2,
  DollarSign,
  CreditCard,
  Smartphone,
  Building,
  ShieldAlert,
  User,
  Tag,
  CheckCircle,
  Pill,
  Sparkles,
  QrCode,
  X,
  Info,
  Clock,
  ArrowRight,
  Send,
  Receipt,
  PackageCheck,
  Check,
  RotateCcw,
  Printer,
  ChevronRight,
  BadgeCheck,
  Lock
} from 'lucide-react';
import { safeFixed, formatCurrency } from '../../utils/formatters';

interface POSViewProps {
  onOpenReceipt: (sale: Sale) => void;
  onNavigateTab: (tabId: string) => void;
}

export const POSView: React.FC<POSViewProps> = ({ onOpenReceipt, onNavigateTab }) => {
  const {
    medicines,
    batches,
    customers,
    prescriptions,
    settings,
    currentUser,
    sales,
    processSale,
    createDispensingOrder,
    completeCashierPayment,
    finallyDispenseSale,
    cancelDispensingOrder,
    getMedicineTotalStock,
    getMedicineBatches,
    getFefoRecommendedBatch,
    categories,
    pendingPrescriptionForPOS,
    setPendingPrescriptionForPOS,
    savedCarts,
    saveHoldCart,
    deleteSavedCart,
    hasPermission,
    addNotification,
  } = usePharmacy();

  // Mode Selection: 'cart' (Search & Prepare), 'cashier_queue' (Billing & Receipts), 'dispensary_queue' (Final Dispense Handover), 'sales_history'
  const initialMode = currentUser.role === 'cashier' ? 'cashier_queue' : 'cart';
  const [posMode, setPosMode] = useState<'cart' | 'cashier_queue' | 'dispensary_queue' | 'sales_history'>(initialMode);

  // Search and Category Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  // Active Cart State
  const [cart, setCart] = useState<SaleItem[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState<string>('');
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [amountTendered, setAmountTendered] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [infoMessage, setInfoMessage] = useState<string>('');
  const [showBatchModalForMed, setShowBatchModalForMed] = useState<Medicine | null>(null);
  const [showSavedCartsModal, setShowSavedCartsModal] = useState<boolean>(false);
  const [holdCartName, setHoldCartName] = useState<string>('');
  const [showHoldModal, setShowHoldModal] = useState<boolean>(false);

  // Cashier Payment Queue State
  const [selectedQueueSale, setSelectedQueueSale] = useState<Sale | null>(null);
  const [cashierPayMethod, setCashierPayMethod] = useState<PaymentMethod>('cash');
  const [cashierTendered, setCashierTendered] = useState<string>('');
  const [cashierNotes, setCashierNotes] = useState<string>('');
  const [queueSearchTerm, setQueueSearchTerm] = useState<string>('');

  // Queues counts
  const awaitingPaymentOrders = useMemo(() => {
    return sales.filter(s => s.dispenseStatus === 'awaiting_payment');
  }, [sales]);

  const paidAwaitingDispenseOrders = useMemo(() => {
    return sales.filter(s => s.dispenseStatus === 'paid_awaiting_dispense');
  }, [sales]);

  const completedDispensedSales = useMemo(() => {
    return sales.filter(s => s.dispenseStatus === 'finally_dispensed' || !s.dispenseStatus);
  }, [sales]);

  // Automatically load items if a prescription was sent to POS by Dispensing Assistant / Pharmacist
  useEffect(() => {
    if (!pendingPrescriptionForPOS) return;

    const rx = pendingPrescriptionForPOS;
    setSelectedPrescriptionId(rx.id);
    setPosMode('cart');

    // Match customer if exists
    if (rx.customerId && customers.some(c => c.id === rx.customerId)) {
      setSelectedCustomerId(rx.customerId);
    } else {
      const match = customers.find(c => c.name.toLowerCase() === rx.customerName.toLowerCase());
      if (match) setSelectedCustomerId(match.id);
    }

    // Convert prescription items into POS cart items
    const newItems: SaleItem[] = [];
    let itemsLoadedCount = 0;

    rx.items.forEach(rxItem => {
      const med = medicines.find(m => m.id === rxItem.medicineId || m.name.toLowerCase() === rxItem.medicineName.toLowerCase());
      if (!med) return;

      const requestedQty = rxItem.quantityPrescribed || 1;
      const batchToUse = getFefoRecommendedBatch(med.id, requestedQty) || batches.find(b => b.medicineId === med.id && b.remainingQuantity > 0);

      if (batchToUse) {
        const qtyToDispense = Math.min(requestedQty, batchToUse.remainingQuantity);
        const unitPrice = batchToUse.sellingPrice || med.sellingPrice;
        const subtotal = unitPrice * qtyToDispense;

        newItems.push({
          id: `rx-item-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          medicineId: med.id,
          medicineName: med.name,
          genericName: med.genericName,
          dosage: med.dosage,
          form: med.form,
          batchId: batchToUse.id,
          batchNumber: batchToUse.batchNumber,
          expiryDate: batchToUse.expiryDate,
          quantity: qtyToDispense,
          unitPrice,
          purchaseCost: batchToUse.purchasePrice || med.purchasePrice,
          subtotal,
          discount: 0,
          total: subtotal,
        });
        itemsLoadedCount++;
      }
    });

    if (newItems.length > 0) {
      setCart(newItems);
      addNotification({
        title: 'Prescription Added to Cart',
        message: `Loaded ${itemsLoadedCount} items from Rx ${rx.prescriptionNumber} for ${rx.customerName} into cart.`,
        type: 'info',
        module: 'pos',
        linkTab: 'pos',
      });
      setInfoMessage(`Loaded Prescription ${rx.prescriptionNumber} for ${rx.customerName} (${itemsLoadedCount} items added to cart).`);
      setTimeout(() => setInfoMessage(''), 6000);
    } else {
      setErrorMessage(`Could not load medicines from Prescription ${rx.prescriptionNumber}: Check stock levels.`);
    }

    setPendingPrescriptionForPOS(null);
  }, [pendingPrescriptionForPOS, medicines, batches, customers, getFefoRecommendedBatch, setPendingPrescriptionForPOS]);

  const selectedCustomer = useMemo(() => {
    return customers.find(c => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Filtered Medicines
  const filteredMedicines = useMemo(() => {
    return medicines.filter(med => {
      if (med.status !== 'active') return false;
      const matchCat = selectedCategory === 'all' || med.categoryId === selectedCategory;
      const term = searchTerm.toLowerCase();
      const matchSearch =
        !term ||
        med.name.toLowerCase().includes(term) ||
        med.genericName.toLowerCase().includes(term) ||
        (med.brandName && med.brandName.toLowerCase().includes(term)) ||
        med.code.toLowerCase().includes(term) ||
        (med.barcode && med.barcode.includes(term));
      return matchCat && matchSearch;
    });
  }, [medicines, selectedCategory, searchTerm]);

  // Drug Allergy Safety Warnings Check
  const allergyWarnings = useMemo(() => {
    if (!selectedCustomer || !selectedCustomer.allergies || selectedCustomer.allergies.length === 0) {
      return [];
    }
    const warnings: { item: SaleItem; allergy: string }[] = [];
    cart.forEach(cartItem => {
      const med = medicines.find(m => m.id === cartItem.medicineId);
      if (med) {
        selectedCustomer.allergies!.forEach(allergy => {
          const aLower = allergy.toLowerCase();
          const medText = `${med.name} ${med.genericName} ${med.description || ''}`.toLowerCase();
          if (
            (aLower.includes('penicillin') && medText.includes('amox')) ||
            (aLower.includes('nsaid') && (medText.includes('ibuprofen') || medText.includes('aspirin'))) ||
            (aLower.includes('sulfa') && medText.includes('sulf'))
          ) {
            warnings.push({ item: cartItem, allergy });
          }
        });
      }
    });
    return warnings;
  }, [selectedCustomer, cart, medicines]);

  // Add Medicine to Cart with FEFO rule
  const handleAddToCart = (med: Medicine, customBatch?: MedicineBatch) => {
    setErrorMessage('');
    const totalStock = getMedicineTotalStock(med.id);
    if (totalStock <= 0) {
      setErrorMessage(`Cannot add "${med.name}": Out of stock.`);
      return;
    }

    // Determine batch: either custom specified or FEFO recommended
    const batchToUse = customBatch || getFefoRecommendedBatch(med.id, 1);
    if (!batchToUse) {
      setErrorMessage(`No valid, non-expired batches available for "${med.name}".`);
      return;
    }

    // Check if item already exists in cart for this batch
    const existingIndex = cart.findIndex(
      item => item.medicineId === med.id && item.batchId === batchToUse.id
    );

    if (existingIndex > -1) {
      const currentQty = cart[existingIndex].quantity;
      if (currentQty + 1 > batchToUse.remainingQuantity) {
        setErrorMessage(`Cannot add more: Batch ${batchToUse.batchNumber} has only ${batchToUse.remainingQuantity} units.`);
        return;
      }
      const updatedCart = [...cart];
      const newQty = currentQty + 1;
      const subtotal = newQty * updatedCart[existingIndex].unitPrice;
      updatedCart[existingIndex] = {
        ...updatedCart[existingIndex],
        quantity: newQty,
        subtotal,
        total: subtotal - updatedCart[existingIndex].discount,
      };
      setCart(updatedCart);
      addNotification({
        title: 'Item Quantity Updated in Cart',
        message: `Increased "${med.name}" (${med.dosage || med.form || 'Unit'}) quantity to ${newQty}. Batch: ${batchToUse.batchNumber}.`,
        type: 'success',
        module: 'pos',
        linkTab: 'pos',
      });
    } else {
      const unitPrice = batchToUse.sellingPrice || med.sellingPrice;
      const newItem: SaleItem = {
        id: `si-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        medicineId: med.id,
        medicineName: med.name,
        genericName: med.genericName,
        dosage: med.dosage,
        form: med.form,
        batchId: batchToUse.id,
        batchNumber: batchToUse.batchNumber,
        expiryDate: batchToUse.expiryDate,
        quantity: 1,
        unitPrice,
        purchaseCost: batchToUse.purchasePrice || med.purchasePrice,
        subtotal: unitPrice,
        discount: 0,
        total: unitPrice,
      };
      setCart(prev => [...prev, newItem]);
      addNotification({
        title: 'Added to Cart',
        message: `Added "${med.name}" (${med.dosage || med.form || 'Unit'}) to POS cart. Batch: ${batchToUse.batchNumber} (${settings.currencySymbol}${safeFixed(unitPrice)}).`,
        type: 'success',
        module: 'pos',
        linkTab: 'pos',
      });
    }
  };

  const handleUpdateQty = (index: number, delta: number) => {
    setErrorMessage('');
    const target = cart[index];
    const batch = batches.find(b => b.id === target.batchId);
    const newQty = target.quantity + delta;

    if (newQty <= 0) {
      setCart(prev => prev.filter((_, i) => i !== index));
      return;
    }

    if (batch && newQty > batch.remainingQuantity) {
      setErrorMessage(`Batch ${batch.batchNumber} only has ${batch.remainingQuantity} units in stock.`);
      return;
    }

    const updatedCart = [...cart];
    const subtotal = newQty * target.unitPrice;
    updatedCart[index] = {
      ...target,
      quantity: newQty,
      subtotal,
      total: Math.max(0, subtotal - target.discount),
    };
    setCart(updatedCart);
  };

  const handleRemoveFromCart = (index: number) => {
    setCart(prev => prev.filter((_, i) => i !== index));
  };

  // Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.subtotal, 0);
  const discountTotal = (subtotal * discountPercent) / 100;
  const taxableAmount = Math.max(0, subtotal - discountTotal);
  const taxAmount = settings.enableTax ? (taxableAmount * settings.taxRatePercent) / 100 : 0;
  const grandTotal = taxableAmount + taxAmount;

  const parsedAmountTendered = parseFloat(amountTendered) || 0;
  const changeGiven = paymentMethod === 'cash' ? Math.max(0, parsedAmountTendered - grandTotal) : 0;

  // Dispensing Assistant Queues Cart for Cashier Payment
  const handleQueueForCashier = () => {
    setErrorMessage('');
    if (cart.length === 0) {
      setErrorMessage('Cart is empty. Select medicines to proceed.');
      return;
    }

    const customerName = selectedCustomer ? selectedCustomer.name : 'Walk-in Patient';
    const customerPhone = selectedCustomer ? selectedCustomer.telephone : '';
    const rx = prescriptions.find(p => p.id === selectedPrescriptionId);

    const result = createDispensingOrder({
      customerId: selectedCustomerId || undefined,
      customerName,
      customerPhone,
      prescriptionId: selectedPrescriptionId || undefined,
      prescriptionNumber: rx ? rx.prescriptionNumber : undefined,
      items: cart,
      subtotal,
      discountTotal,
      taxRate: settings.enableTax ? settings.taxRatePercent : 0,
      taxAmount,
      grandTotal,
      notes,
    });

    if (result.success && result.sale) {
      const sentSale = result.sale;
      setCart([]);
      setSelectedCustomerId('');
      setSelectedPrescriptionId('');
      setDiscountPercent(0);
      setAmountTendered('');
      setNotes('');

      // Pop up notification acknowledging the sent order
      addNotification({
        title: 'Order Sent to Cashier',
        message: `Order ${sentSale.invoiceNumber} for ${sentSale.customerName} (${sentSale.items.length} items, total ${settings.currencySymbol}${safeFixed(sentSale.grandTotal)}) has been sent to the Cashier Queue for billing.`,
        type: 'info',
        module: 'pos',
        linkTab: 'pos',
      });

      setInfoMessage(`✓ Order ${sentSale.invoiceNumber} sent to Cashier. Patient ${sentSale.customerName} should proceed to Cashier Register to pay.`);
      setTimeout(() => setInfoMessage(''), 8000);
    } else {
      setErrorMessage(result.error || 'Failed to queue order for cashier.');
    }
  };

  // Direct checkout by Pharmacist or Admin
  const handleCompleteDirectSale = () => {
    setErrorMessage('');
    if (cart.length === 0) {
      setErrorMessage('Cart is empty. Select medicines to proceed.');
      return;
    }

    if (paymentMethod === 'cash' && parsedAmountTendered < grandTotal) {
      setErrorMessage(
        `Insufficient cash tendered. Total is ${settings.currencySymbol}${safeFixed(grandTotal)}, received ${settings.currencySymbol}${safeFixed(parsedAmountTendered)}.`
      );
      return;
    }

    const customerName = selectedCustomer ? selectedCustomer.name : 'Walk-in Customer';
    const customerPhone = selectedCustomer ? selectedCustomer.telephone : '';
    const rx = prescriptions.find(p => p.id === selectedPrescriptionId);

    const result = processSale({
      customerId: selectedCustomerId || undefined,
      customerName,
      customerPhone,
      prescriptionId: selectedPrescriptionId || undefined,
      prescriptionNumber: rx ? rx.prescriptionNumber : undefined,
      items: cart,
      subtotal,
      discountTotal,
      taxRate: settings.enableTax ? settings.taxRatePercent : 0,
      taxAmount,
      grandTotal,
      paymentMethod,
      amountTendered: paymentMethod === 'cash' ? parsedAmountTendered : grandTotal,
      changeGiven,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      pharmacistId: currentUser.role === 'pharmacist' ? currentUser.id : undefined,
      pharmacistName: currentUser.role === 'pharmacist' ? currentUser.name : undefined,
      dispensedById: currentUser.id,
      dispensedByName: currentUser.name,
      dispenseStatus: 'finally_dispensed',
      status: 'completed',
      notes,
    });

    if (result.success && result.sale) {
      setCart([]);
      setSelectedCustomerId('');
      setSelectedPrescriptionId('');
      setDiscountPercent(0);
      setAmountTendered('');
      setNotes('');
      onOpenReceipt(result.sale);
    } else {
      setErrorMessage(result.error || 'Failed to process sale. Please try again.');
    }
  };

  // Cashier executes payment on queued order
  const handleExecuteCashierPayment = () => {
    if (!selectedQueueSale) return;
    setErrorMessage('');

    if (currentUser.role === 'dispensing_assistant' || !hasPermission('receive_payment')) {
      setErrorMessage('Security Policy: Dispensing Assistants are not authorized to collect payments. Cashier or Admin required.');
      return;
    }

    const tender = parseFloat(cashierTendered) || 0;
    if (cashierPayMethod === 'cash' && tender < selectedQueueSale.grandTotal) {
      setErrorMessage(`Insufficient cash tendered. Total is ${settings.currencySymbol}${safeFixed(selectedQueueSale.grandTotal)}, received ${settings.currencySymbol}${safeFixed(tender)}.`);
      return;
    }

    const change = cashierPayMethod === 'cash' ? Math.max(0, tender - selectedQueueSale.grandTotal) : 0;

    const result = completeCashierPayment(selectedQueueSale.id, {
      paymentMethod: cashierPayMethod,
      amountTendered: cashierPayMethod === 'cash' ? tender : selectedQueueSale.grandTotal,
      changeGiven: change,
      notes: cashierNotes,
    });

    if (result.success && result.sale) {
      const paidSale = result.sale;
      setSelectedQueueSale(null);
      setCashierTendered('');
      setCashierNotes('');
      setInfoMessage(`✓ Payment received for Invoice ${paidSale.invoiceNumber}. Official receipt printed. Patient direct to Dispensary Counter.`);
      setTimeout(() => setInfoMessage(''), 8000);
      // Immediately open receipt print modal for 80mm thermal receipt
      onOpenReceipt(paidSale);
    } else {
      setErrorMessage(result.error || 'Payment failed.');
    }
  };

  // Dispensing Assistant verifies paid receipt & finally dispenses medication
  const handleFinalDispense = (saleId: string) => {
    setErrorMessage('');
    const targetSale = sales.find(s => s.id === saleId);
    if (currentUser.role === 'cashier' && targetSale) {
      const wasPreparedBySelf = (targetSale.preparedById && targetSale.preparedById === currentUser.id) ||
                                (targetSale.preparedByName && targetSale.preparedByName === currentUser.name);
      if (!wasPreparedBySelf) {
        setErrorMessage(`Security Policy: Cashier ${currentUser.name} cannot finally dispense this order because it was prepared by ${targetSale.preparedByName || 'a Dispensing Assistant'}. Cashiers may only dispense orders they personally prepared in cart.`);
        return;
      }
    }

    const result = finallyDispenseSale(saleId, currentUser.name);
    if (result.success && result.sale) {
      setInfoMessage(`✓ Medications finally dispensed to ${result.sale.customerName} (Invoice: ${result.sale.invoiceNumber}).`);
      setTimeout(() => setInfoMessage(''), 6000);
      onOpenReceipt(result.sale);
    } else {
      setErrorMessage(result.error || 'Failed to confirm dispense.');
    }
  };

  return (
    <div className="space-y-5">
      {/* Workflow Navigation Bar */}
      <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-1.5 overflow-x-auto text-xs">
          <button
            type="button"
            onClick={() => setPosMode('cart')}
            className={`px-3.5 py-2 rounded-xl font-bold uppercase tracking-tight flex items-center space-x-2 transition-all cursor-pointer ${
              posMode === 'cart'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>1. Search & Prepare Cart</span>
            {cart.length > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                posMode === 'cart' ? 'bg-white text-emerald-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {cart.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setPosMode('cashier_queue')}
            className={`px-3.5 py-2 rounded-xl font-bold uppercase tracking-tight flex items-center space-x-2 transition-all cursor-pointer ${
              posMode === 'cashier_queue'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <DollarSign className="w-3.5 h-3.5" />
            <span>2. Cashier Billing Queue</span>
            {awaitingPaymentOrders.length > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                posMode === 'cashier_queue' ? 'bg-white text-indigo-800' : 'bg-amber-100 text-amber-800 animate-pulse'
              }`}>
                {awaitingPaymentOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setPosMode('dispensary_queue')}
            className={`px-3.5 py-2 rounded-xl font-bold uppercase tracking-tight flex items-center space-x-2 transition-all cursor-pointer ${
              posMode === 'dispensary_queue'
                ? 'bg-teal-600 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>3. Dispensary Handover Queue</span>
            {paidAwaitingDispenseOrders.length > 0 && (
              <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                posMode === 'dispensary_queue' ? 'bg-white text-teal-800' : 'bg-emerald-100 text-emerald-800'
              }`}>
                {paidAwaitingDispenseOrders.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setPosMode('sales_history')}
            className={`px-3.5 py-2 rounded-xl font-bold uppercase tracking-tight flex items-center space-x-2 transition-all cursor-pointer ${
              posMode === 'sales_history'
                ? 'bg-slate-800 text-white shadow-xs'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <Receipt className="w-3.5 h-3.5" />
            <span>Completed Sales</span>
          </button>
        </div>

        {/* Current User Role Badge */}
        <div className="flex items-center space-x-2 text-xs">
          <span className="text-slate-400">Terminal User:</span>
          <span className="font-bold text-slate-800 px-2.5 py-1 bg-slate-100 rounded-lg">
            {currentUser.name} ({currentUser.role.replace('_', ' ').toUpperCase()})
          </span>
        </div>
      </div>

      {/* Info & Error Banner */}
      {infoMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 text-xs flex items-center space-x-2 animate-fadeIn shadow-xs">
          <Info className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-medium">{infoMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center space-x-2 animate-fadeIn shadow-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {/* MODE 1: SEARCH FIRST & PREPARE CART */}
      {posMode === 'cart' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 7 Columns: Product Catalog, Stock Search & Filters */}
          <div className="lg:col-span-7 space-y-4">
            {/* Search Bar - Prominently emphasized */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center">
                  <Search className="w-3.5 h-3.5 mr-1.5 text-emerald-600" />
                  Search Available In-Stock Medicines
                </span>
                <span className="text-[11px] text-slate-400">FEFO Auto-Allocated</span>
              </div>
              <div className="relative">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Medicine name, Generic, Brand, Dosage, Barcode..."
                  value={searchTerm}
                  autoFocus
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-hidden transition-all"
                />
              </div>

              {/* Category Quick Tabs */}
              <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 text-xs">
                <button
                  type="button"
                  onClick={() => setSelectedCategory('all')}
                  className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-tight text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                    selectedCategory === 'all'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Categories
                </button>
                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`px-3 py-1.5 rounded-lg font-bold uppercase tracking-tight text-[11px] whitespace-nowrap transition-colors cursor-pointer ${
                      selectedCategory === cat.id
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Medicine Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1">
              {filteredMedicines.map((med) => {
                const stock = getMedicineTotalStock(med.id);
                const isLow = stock <= med.minimumStockLevel;
                const isOutOfStock = stock <= 0;
                const validBatches = getMedicineBatches(med.id, true);

                return (
                  <div
                    key={med.id}
                    className={`p-4 bg-white rounded-2xl border transition-all flex flex-col justify-between ${
                      isOutOfStock
                        ? 'border-slate-200 bg-slate-50/50 opacity-60'
                        : 'border-slate-200 hover:border-emerald-500 hover:shadow-sm'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900 leading-tight">{med.name}</h4>
                          <p className="text-[11px] text-slate-500 italic mt-0.5">{med.genericName}</p>
                        </div>
                        {med.requiresPrescription && (
                          <span className="shrink-0 px-1.5 py-0.5 text-[9px] font-bold bg-rose-50 text-rose-700 border border-rose-200 rounded">
                            Rx ONLY
                          </span>
                        )}
                      </div>

                      <div className="mt-2.5 flex items-center justify-between text-[11px]">
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-md font-medium">
                          {med.form} • {med.dosage}
                        </span>
                        <span
                          className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                            isOutOfStock
                              ? 'bg-rose-100 text-rose-700'
                              : isLow
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-emerald-100 text-emerald-800'
                          }`}
                        >
                          {isOutOfStock ? 'OUT OF STOCK' : `${stock} in stock`}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-sm font-bold text-slate-900">
                        {settings.currencySymbol}{safeFixed(med.sellingPrice)}
                      </div>

                      <div className="flex items-center space-x-1.5">
                        {validBatches.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setShowBatchModalForMed(med)}
                            className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-slate-100 rounded-lg text-xs transition-colors cursor-pointer"
                            title="Choose specific batch"
                          >
                            Batches ({validBatches.length})
                          </button>
                        )}

                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => handleAddToCart(med)}
                          className={`inline-flex items-center px-3 py-1.5 text-xs font-bold uppercase tracking-tight rounded-xl transition-all cursor-pointer ${
                            isOutOfStock
                              ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                              : 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs'
                          }`}
                        >
                          <Plus className="w-3.5 h-3.5 mr-1" />
                          + Add to Cart
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredMedicines.length === 0 && (
                <div className="col-span-2 py-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                  <Pill className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No medications found matching "{searchTerm}".</p>
                </div>
              )}
            </div>
          </div>

          {/* Right 5 Columns: Register Cart & Prepare Options */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <ShoppingCart className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Dispensing Cart</h3>
                  <p className="text-[11px] text-slate-500">{cart.length} line item(s) selected</p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {savedCarts.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowSavedCartsModal(true)}
                    className="px-2.5 py-1 text-xs bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Held ({savedCarts.length})
                  </button>
                )}

                {cart.length > 0 && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setHoldCartName(selectedCustomer ? `${selectedCustomer.name}'s Cart` : '');
                        setShowHoldModal(true);
                      }}
                      className="px-2.5 py-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 font-bold rounded-lg transition-colors cursor-pointer"
                      title="Hold / Save this prescription cart"
                    >
                      Hold
                    </button>
                    <button
                      type="button"
                      onClick={() => setCart([])}
                      className="text-xs text-rose-500 hover:text-rose-700 font-bold uppercase tracking-tight cursor-pointer"
                    >
                      Clear
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Patient Profile Selection */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-slate-700 flex items-center">
                  <User className="w-3.5 h-3.5 mr-1 text-slate-400" />
                  Patient / Customer Profile
                </label>
                <button
                  type="button"
                  onClick={() => onNavigateTab('customers')}
                  className="text-[11px] text-indigo-600 hover:underline"
                >
                  + New Patient
                </button>
              </div>

              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-medium text-slate-800"
              >
                <option value="">Walk-in Patient (Unregistered)</option>
                {customers.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.allergies?.length ? `(Allergies: ${c.allergies.join(', ')})` : ''}
                  </option>
                ))}
              </select>

              {/* Allergy Warning if triggered */}
              {allergyWarnings.length > 0 && (
                <div className="p-3 bg-rose-50 border border-rose-300 rounded-xl text-rose-900 text-xs space-y-1 animate-pulse">
                  <div className="flex items-center font-bold text-rose-950">
                    <ShieldAlert className="w-4 h-4 mr-1 text-rose-600" />
                    CLINICAL ALLERGY ALERT!
                  </div>
                  <p className="text-[11px] leading-tight">
                    Patient <strong>{selectedCustomer?.name}</strong> has documented allergy to{' '}
                    <span className="underline font-semibold">{allergyWarnings[0].allergy}</span>.
                  </p>
                </div>
              )}
            </div>

            {/* Cart Items List */}
            <div className="space-y-2 max-h-60 overflow-y-auto divide-y divide-slate-100 pr-1">
              {cart.map((item, idx) => (
                <div key={item.id} className="pt-2 first:pt-0 flex items-center justify-between text-xs">
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="font-semibold text-slate-900 truncate">{item.medicineName}</p>
                    <p className="text-[10px] text-slate-500">
                      Batch: <span className="font-mono text-indigo-600 font-medium">{item.batchNumber}</span> • Exp: {item.expiryDate}
                    </p>
                    <p className="text-[11px] font-bold text-slate-800 mt-0.5">
                      {settings.currencySymbol}{safeFixed(item.unitPrice)} each
                    </p>
                  </div>

                  <div className="flex items-center space-x-2">
                    <div className="inline-flex items-center border border-slate-200 rounded-lg bg-slate-50">
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, -1)}
                        className="p-1 text-slate-600 hover:bg-slate-200 rounded-l-lg transition-colors cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-7 text-center font-bold text-slate-900 text-xs">{item.quantity}</span>
                      <button
                        type="button"
                        onClick={() => handleUpdateQty(idx, 1)}
                        className="p-1 text-slate-600 hover:bg-slate-200 rounded-r-lg transition-colors cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <span className="font-extrabold text-slate-900 w-16 text-right">
                      {settings.currencySymbol}{safeFixed(item.total)}
                    </span>

                    <button
                      type="button"
                      onClick={() => handleRemoveFromCart(idx)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {cart.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  <ShoppingCart className="w-8 h-8 mx-auto mb-1.5 opacity-40" />
                  Cart is empty. Search above and click "+ Add to Cart".
                </div>
              )}
            </div>

            {/* Calculations Box */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span className="font-medium text-slate-900">{settings.currencySymbol}{safeFixed(subtotal)}</span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-600">Discount</span>
                <div className="flex items-center space-x-1">
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={discountPercent || ''}
                    onChange={(e) => setDiscountPercent(Math.max(0, Math.min(100, parseFloat(e.target.value) || 0)))}
                    placeholder="0"
                    className="w-14 px-2 py-0.5 text-right text-xs bg-white border border-slate-200 rounded-md font-semibold"
                  />
                  <span className="text-slate-500 font-semibold">%</span>
                  {discountTotal > 0 && (
                    <span className="text-emerald-600 font-semibold ml-1">
                      (-{settings.currencySymbol}{safeFixed(discountTotal)})
                    </span>
                  )}
                </div>
              </div>

              {settings.enableTax && (
                <div className="flex justify-between text-slate-600">
                  <span>Sales Tax ({settings.taxRatePercent}%)</span>
                  <span className="font-medium text-slate-900">{settings.currencySymbol}{safeFixed(taxAmount)}</span>
                </div>
              )}

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center">
                <span className="font-bold text-sm text-slate-900">Total Payable</span>
                <span className="text-lg font-bold text-slate-900">
                  {settings.currencySymbol}{safeFixed(grandTotal)}
                </span>
              </div>
            </div>

            {/* ACTION BUTTONS: Queue for Cashier OR Immediate Checkout */}
            <div className="space-y-2 pt-1">
              {/* Primary Action for Dispensing Assistant: Send to Cashier */}
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={handleQueueForCashier}
                className={`w-full py-3 px-4 text-xs font-bold uppercase tracking-tight rounded-xl flex items-center justify-center space-x-2 shadow-xs transition-all cursor-pointer ${
                  cart.length === 0
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-900/20'
                }`}
              >
                <Send className="w-4 h-4" />
                <span>Queue Order for Cashier (Send to Cashier)</span>
              </button>

              {/* Direct Checkout for Pharmacist / Admin if acting directly as Cashier */}
              {(currentUser.role === 'admin' || currentUser.role === 'pharmacist') && (
                <button
                  type="button"
                  disabled={cart.length === 0}
                  onClick={handleCompleteDirectSale}
                  className={`w-full py-2.5 px-4 text-xs font-semibold rounded-xl flex items-center justify-center space-x-2 border transition-all cursor-pointer ${
                    cart.length === 0
                      ? 'border-slate-200 text-slate-300 cursor-not-allowed'
                      : 'border-emerald-600 text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  <span>Direct Complete & Print Receipt (Admin/Rx Mode)</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: CASHIER BILLING QUEUE */}
      {posMode === 'cashier_queue' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Queued Orders List */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Cashier Billing Queue</h3>
                <p className="text-xs text-slate-500">Orders prepared by Dispensing Assistants awaiting payment</p>
              </div>
              <span className="px-3 py-1 bg-amber-100 text-amber-800 text-xs font-bold rounded-full">
                {awaitingPaymentOrders.length} Pending
              </span>
            </div>

            {/* Dispensing Assistant Security Warning */}
            {(currentUser.role === 'dispensing_assistant' || !hasPermission('receive_payment')) && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-900 text-xs flex items-start space-x-2.5 shadow-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
                <div>
                  <span className="font-bold block">Payment Access Restricted</span>
                  <span className="text-[11px] text-amber-800">
                    Dispensing Assistants cannot collect tender or process payments. Please transfer the customer to the Cashier Terminal with their invoice reference.
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {awaitingPaymentOrders.map((order) => {
                const isSelected = selectedQueueSale?.id === order.id;
                const canCollectPayment = hasPermission('receive_payment') && currentUser.role !== 'dispensing_assistant';

                return (
                  <div
                    key={order.id}
                    className={`p-4 bg-white rounded-2xl border transition-all space-y-3 ${
                      isSelected
                        ? 'border-indigo-500 ring-2 ring-indigo-100 shadow-xs'
                        : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <span className="font-mono font-bold text-xs bg-slate-100 text-slate-800 px-2 py-0.5 rounded">
                            {order.invoiceNumber}
                          </span>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 rounded">
                            AWAITING PAYMENT
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-slate-900 mt-1">{order.customerName}</h4>
                        <p className="text-xs text-slate-500 mt-0.5">
                          Prepared by: <span className="font-medium text-slate-700">{order.preparedByName || 'Dispensing Assistant'}</span> • {new Date(order.createdAt).toLocaleTimeString()}
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-base font-extrabold text-indigo-700 block">
                          {settings.currencySymbol}{safeFixed(order.grandTotal)}
                        </span>
                        <span className="text-[11px] text-slate-400">{order.items.length} item(s)</span>
                      </div>
                    </div>

                    {/* Order summary pill list */}
                    <div className="p-2.5 bg-slate-50 rounded-xl text-xs space-y-1">
                      {order.items.map((it, i) => (
                        <div key={i} className="flex justify-between text-slate-600 text-[11px]">
                          <span>{it.quantity}x {it.medicineName} ({it.dosage})</span>
                          <span className="font-medium">{settings.currencySymbol}{safeFixed(it.total)}</span>
                        </div>
                      ))}
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <button
                        type="button"
                        onClick={() => cancelDispensingOrder(order.id)}
                        className="text-xs text-rose-500 hover:text-rose-700 font-medium cursor-pointer"
                      >
                        Cancel Order
                      </button>

                      {canCollectPayment ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedQueueSale(order);
                            setCashierTendered(order.grandTotal.toString());
                          }}
                          className={`px-4 py-2 text-xs font-bold uppercase tracking-tight rounded-xl flex items-center space-x-1.5 transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-indigo-700 text-white'
                              : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                          }`}
                        >
                          <DollarSign className="w-3.5 h-3.5" />
                          <span>Receive Payment</span>
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 text-xs font-semibold text-slate-400 bg-slate-100 rounded-xl flex items-center space-x-1.5">
                          <Lock className="w-3 h-3 text-slate-400" />
                          <span>Cashier Required</span>
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}

              {awaitingPaymentOrders.length === 0 && (
                <div className="py-12 text-center text-slate-400 bg-white rounded-2xl border border-dashed border-slate-200">
                  <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-40 text-indigo-400" />
                  <p className="text-xs font-medium">No orders currently awaiting cashier payment.</p>
                  <p className="text-[11px] text-slate-400 mt-1">Orders created by dispensing assistants will appear here instantly.</p>
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Cashier Payment Processing Panel */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
            {selectedQueueSale ? (
              <>
                <div className="border-b border-slate-100 pb-3">
                  <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest block">Active Payment</span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">{selectedQueueSale.customerName}</h3>
                  <p className="text-xs text-slate-500 font-mono">Invoice: {selectedQueueSale.invoiceNumber}</p>
                </div>

                <div className="p-3.5 bg-indigo-50 rounded-2xl border border-indigo-100 text-xs space-y-1.5">
                  <div className="flex justify-between text-indigo-900 font-medium">
                    <span>Total Amount Payable:</span>
                    <span className="text-base font-bold text-indigo-700">
                      {settings.currencySymbol}{safeFixed(selectedQueueSale.grandTotal)}
                    </span>
                  </div>
                  <div className="text-[11px] text-indigo-700">
                    Prepared by: {selectedQueueSale.preparedByName || 'Assistant'} • {selectedQueueSale.items.length} item(s)
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-700">Select Payment Method</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: 'cash', label: 'Cash', icon: DollarSign },
                      { id: 'card', label: 'POS Card', icon: CreditCard },
                      { id: 'mobile_money', label: 'Mobile Money', icon: Smartphone },
                    ].map((method) => {
                      const Icon = method.icon;
                      const isSel = cashierPayMethod === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setCashierPayMethod(method.id as PaymentMethod)}
                          className={`py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center space-x-1.5 transition-all cursor-pointer ${
                            isSel
                              ? 'border-indigo-600 bg-indigo-50 text-indigo-800 font-bold shadow-xs'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          <Icon className="w-3.5 h-3.5" />
                          <span>{method.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Tendered & Change */}
                {cashierPayMethod === 'cash' && (
                  <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="font-semibold text-slate-700">Amount Tendered</label>
                      <div className="relative">
                        <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 font-bold">
                          {settings.currencySymbol}
                        </span>
                        <input
                          type="number"
                          step="0.1"
                          value={cashierTendered}
                          onChange={(e) => setCashierTendered(e.target.value)}
                          className="w-32 pl-7 pr-3 py-1.5 text-right font-bold text-xs bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-slate-200">
                      <span className="text-slate-600 font-medium">Change to Return</span>
                      <span className="text-base font-bold text-emerald-600">
                        {settings.currencySymbol}
                        {safeFixed(Math.max(0, (parseFloat(cashierTendered) || 0) - selectedQueueSale.grandTotal))}
                      </span>
                    </div>
                  </div>
                )}

                {/* Cashier Notes */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Receipt Note (Optional)</label>
                  <input
                    type="text"
                    value={cashierNotes}
                    onChange={(e) => setCashierNotes(e.target.value)}
                    placeholder="e.g. Paid via MoMo Ref #9921"
                    className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-hidden"
                  />
                </div>

                {/* Action button */}
                {currentUser.role === 'dispensing_assistant' || !hasPermission('receive_payment') ? (
                  <button
                    type="button"
                    disabled
                    className="w-full py-3.5 px-4 text-xs font-bold uppercase tracking-tight rounded-xl bg-slate-200 text-slate-500 flex items-center justify-center space-x-2 cursor-not-allowed"
                  >
                    <Lock className="w-4 h-4" />
                    <span>Payment Restricted (Cashier Access Required)</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleExecuteCashierPayment}
                    className="w-full py-3.5 px-4 text-xs font-bold uppercase tracking-tight rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white flex items-center justify-center space-x-2 shadow-md shadow-emerald-900/20 transition-all cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Receive Money & Print Receipt</span>
                  </button>
                )}
              </>
            ) : (
              <div className="py-16 text-center text-slate-400 space-y-2">
                <DollarSign className="w-10 h-10 mx-auto opacity-30 text-indigo-400" />
                <p className="text-xs font-semibold text-slate-600">No order selected for billing</p>
                <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                  Click <strong>"Receive Payment"</strong> on any pending order in the queue on the left to process checkout and print the official receipt.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 3: DISPENSARY HANDOVER QUEUE */}
      {posMode === 'dispensary_queue' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center">
                <PackageCheck className="w-4 h-4 mr-2 text-teal-600" />
                Dispensary Verification & Handover Queue
              </h3>
              <p className="text-xs text-slate-500">
                Patients who have paid at Cashier. Verify printed receipt, prepare drug packages, and confirm handover.
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <span className="px-3 py-1 bg-teal-50 text-teal-800 border border-teal-200 text-xs font-bold rounded-full">
                {paidAwaitingDispenseOrders.length} Paid & Ready to Dispense
              </span>
            </div>
          </div>

          {/* Cashier Policy Notice */}
          {currentUser.role === 'cashier' && (
            <div className="p-3.5 bg-teal-50 border border-teal-200 rounded-2xl text-teal-900 text-xs flex items-start space-x-2.5">
              <Info className="w-4 h-4 shrink-0 text-teal-600 mt-0.5" />
              <div>
                <span className="font-bold block">Cashier Dispensing Restriction Policy</span>
                <span className="text-[11px] text-teal-800">
                  Cashiers may only confirm and finally dispense orders they personally prepared in the cart. Orders prepared by Dispensing Assistants must be verified and handed over by a Dispensing Assistant or Pharmacist.
                </span>
              </div>
            </div>
          )}

          {/* Quick Invoice Search/Scan */}
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Scan or type Invoice Number / Patient Name from receipt..."
              value={queueSearchTerm}
              onChange={(e) => setQueueSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-teal-500 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {paidAwaitingDispenseOrders
              .filter(o => 
                !queueSearchTerm || 
                o.invoiceNumber.toLowerCase().includes(queueSearchTerm.toLowerCase()) || 
                o.customerName.toLowerCase().includes(queueSearchTerm.toLowerCase())
              )
              .map((sale) => {
                const isCashier = currentUser.role === 'cashier';
                const wasPreparedBySelf = (sale.preparedById && sale.preparedById === currentUser.id) ||
                                          (sale.preparedByName && sale.preparedByName === currentUser.name);
                const canDispense = !isCashier || wasPreparedBySelf;

                return (
                  <div key={sale.id} className="p-4 bg-teal-50/40 rounded-2xl border border-teal-200 space-y-3 flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs bg-white text-slate-900 px-2 py-0.5 rounded border border-slate-200">
                          {sale.invoiceNumber}
                        </span>
                        <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                          PAID ✓
                        </span>
                      </div>

                      <div>
                        <h4 className="text-sm font-bold text-slate-900">{sale.customerName}</h4>
                        <p className="text-[11px] text-slate-500">
                          Cashier: <span className="font-medium text-slate-700">{sale.cashierName}</span> • Paid {new Date(sale.createdAt).toLocaleTimeString()}
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Prepared by: <span className="font-medium text-slate-600">{sale.preparedByName || 'Assistant'}</span>
                        </p>
                      </div>

                      {/* Prescription Badge */}
                      {sale.prescriptionNumber && (
                        <div className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded inline-block border border-indigo-100">
                          Prescription: {sale.prescriptionNumber}
                        </div>
                      )}

                      {/* Items to Pack */}
                      <div className="p-2.5 bg-white rounded-xl border border-teal-100 text-xs space-y-1.5 max-h-36 overflow-y-auto">
                        <div className="font-bold text-slate-700 text-[10px] uppercase">Medications to Handover:</div>
                        {sale.items.map((item, idx) => (
                          <div key={idx} className="border-b border-slate-100 last:border-0 pb-1 last:pb-0">
                            <div className="flex justify-between font-semibold text-slate-800 text-[11px]">
                              <span>{item.quantity}x {item.medicineName}</span>
                              <span>{item.dosage}</span>
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              Batch: {item.batchNumber} | Exp: {item.expiryDate}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-teal-100 flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenReceipt(sale)}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-white rounded-lg text-xs transition-colors cursor-pointer"
                        title="View / Print Receipt Copy"
                      >
                        <Receipt className="w-4 h-4" />
                      </button>

                      {canDispense ? (
                        <button
                          type="button"
                          onClick={() => handleFinalDispense(sale.id)}
                          className="flex-1 py-2 px-3 text-xs font-bold uppercase tracking-tight bg-teal-600 hover:bg-teal-700 text-white rounded-xl flex items-center justify-center space-x-1.5 shadow-xs transition-all cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Confirm & Finally Dispense</span>
                        </button>
                      ) : (
                        <div
                          className="flex-1 py-2 px-3 text-[11px] font-semibold bg-slate-100 border border-slate-200 text-slate-400 rounded-xl flex items-center justify-center space-x-1.5 cursor-not-allowed"
                          title={`Locked for Cashier: Order was prepared by ${sale.preparedByName || 'Dispensing Assistant'}.`}
                        >
                          <Lock className="w-3.5 h-3.5 text-slate-400" />
                          <span>Dispense Restricted</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

            {paidAwaitingDispenseOrders.length === 0 && (
              <div className="col-span-3 py-12 text-center text-slate-400 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                <PackageCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-teal-500" />
                <p className="text-xs font-semibold text-slate-700">Dispensary queue is clear.</p>
                <p className="text-[11px] text-slate-400 mt-1">When cashiers process payments, orders will appear here for final handover.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODE 4: COMPLETED SALES HISTORY */}
      {posMode === 'sales_history' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">Completed Sales & Dispense Records</h3>
              <p className="text-xs text-slate-500">Historical archive of finalized sales with printable 80mm thermal receipts</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 uppercase font-semibold text-[10px] border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Invoice #</th>
                  <th className="py-2.5 px-3">Date/Time</th>
                  <th className="py-2.5 px-3">Patient</th>
                  <th className="py-2.5 px-3">Staff (Cashier / Dispenser)</th>
                  <th className="py-2.5 px-3">Items</th>
                  <th className="py-2.5 px-3">Total</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {completedDispensedSales.slice(0, 30).map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-900">{s.invoiceNumber}</td>
                    <td className="py-3 px-3 text-slate-500">{new Date(s.createdAt).toLocaleString()}</td>
                    <td className="py-3 px-3 font-medium text-slate-900">{s.customerName}</td>
                    <td className="py-3 px-3 text-slate-600">
                      <div>Cashier: {s.cashierName || 'Staff'}</div>
                      {s.dispensedByName && <div className="text-[10px] text-teal-700">Dispensed: {s.dispensedByName}</div>}
                    </td>
                    <td className="py-3 px-3 text-slate-500">{s.items.length} meds</td>
                    <td className="py-3 px-3 font-bold text-slate-900">{settings.currencySymbol}{safeFixed(s.grandTotal)}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                        DISPENSED
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenReceipt(s)}
                        className="inline-flex items-center px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
                      >
                        <Printer className="w-3 h-3 mr-1" />
                        80mm PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Specific Batch Selection Modal */}
      {showBatchModalForMed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4">
          <div className="w-full max-w-lg bg-white rounded-3xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Select Specific Batch (FEFO)</h3>
                <p className="text-xs text-slate-500">{showBatchModalForMed.name}</p>
              </div>
              <button
                type="button"
                onClick={() => setShowBatchModalForMed(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto">
              {getMedicineBatches(showBatchModalForMed.id, false).map((b) => {
                const isExp = new Date(b.expiryDate) <= new Date();
                return (
                  <div
                    key={b.id}
                    className={`p-3 rounded-2xl border flex items-center justify-between text-xs ${
                      isExp ? 'border-rose-200 bg-rose-50/50' : 'border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold font-mono text-slate-900">{b.batchNumber}</span>
                        {isExp ? (
                          <span className="px-1.5 py-0.2 bg-rose-200 text-rose-800 text-[10px] rounded font-bold">
                            EXPIRED
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 text-[10px] rounded font-semibold">
                            FEFO Active
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Exp: {b.expiryDate} • Remaining: <strong>{b.remainingQuantity} units</strong> • Supplier: {b.supplierName}
                      </p>
                    </div>

                    <button
                      type="button"
                      disabled={isExp || b.remainingQuantity <= 0}
                      onClick={() => {
                        handleAddToCart(showBatchModalForMed, b);
                        setShowBatchModalForMed(null);
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                        isExp || b.remainingQuantity <= 0
                          ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                          : 'bg-indigo-600 text-white hover:bg-indigo-700'
                      }`}
                    >
                      Select
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Hold Cart Modal */}
      {showHoldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Hold / Save Current Cart</h3>
              <button
                type="button"
                onClick={() => setShowHoldModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Save this cart ({cart.length} items{selectedPrescriptionId ? `, Prescription linked` : ''}) to resume checkout later.
            </p>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Cart Reference / Customer Name</label>
              <input
                type="text"
                value={holdCartName}
                onChange={(e) => setHoldCartName(e.target.value)}
                placeholder="e.g. John Doe Rx Order"
                className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="pt-3 border-t border-slate-100 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setShowHoldModal(false)}
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  const rx = prescriptions.find(p => p.id === selectedPrescriptionId);
                  saveHoldCart({
                    name: holdCartName || (selectedCustomer ? selectedCustomer.name : `Order #${Date.now().toString().slice(-4)}`),
                    customerId: selectedCustomerId || undefined,
                    customerName: selectedCustomer ? selectedCustomer.name : 'Walk-in Customer',
                    prescriptionId: selectedPrescriptionId || undefined,
                    prescriptionNumber: rx ? rx.prescriptionNumber : undefined,
                    items: cart,
                    discountPercent,
                    notes,
                  });
                  setCart([]);
                  setSelectedCustomerId('');
                  setSelectedPrescriptionId('');
                  setDiscountPercent(0);
                  setNotes('');
                  setShowHoldModal(false);
                  setInfoMessage('Cart has been safely held and saved.');
                  setTimeout(() => setInfoMessage(''), 4000);
                }}
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg cursor-pointer shadow-xs"
              >
                Save & Clear Cart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Saved / Held Carts List Modal */}
      {showSavedCartsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Held & Saved Prescriptions / Carts</h3>
                <p className="text-xs text-slate-500">{savedCarts.length} cart(s) on hold</p>
              </div>
              <button
                type="button"
                onClick={() => setShowSavedCartsModal(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1">
              {savedCarts.map((sc) => (
                <div key={sc.id} className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                  <div className="space-y-0.5">
                    <p className="font-bold text-slate-900">{sc.name}</p>
                    <p className="text-[11px] text-slate-500">
                      {sc.items.length} items • Saved by {sc.savedBy} at {new Date(sc.savedAt).toLocaleTimeString()}
                    </p>
                    {sc.prescriptionNumber && (
                      <span className="inline-block font-mono text-[10px] bg-emerald-50 text-emerald-700 px-1.5 py-0.2 rounded font-semibold border border-emerald-200">
                        Rx: {sc.prescriptionNumber}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        setCart(sc.items);
                        if (sc.customerId) setSelectedCustomerId(sc.customerId);
                        if (sc.prescriptionId) setSelectedPrescriptionId(sc.prescriptionId);
                        if (sc.discountPercent) setDiscountPercent(sc.discountPercent);
                        if (sc.notes) setNotes(sc.notes);
                        deleteSavedCart(sc.id);
                        setShowSavedCartsModal(false);
                        setInfoMessage(`Restored held cart '${sc.name}'.`);
                        setTimeout(() => setInfoMessage(''), 4000);
                      }}
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg cursor-pointer transition-colors shadow-xs"
                    >
                      Resume Cart
                    </button>
                    <button
                      type="button"
                      onClick={() => deleteSavedCart(sc.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                      title="Discard held cart"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {savedCarts.length === 0 && (
                <div className="py-8 text-center text-xs text-slate-400">
                  No held carts found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

