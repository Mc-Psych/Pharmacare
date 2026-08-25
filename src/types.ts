export type UserRole = 'admin' | 'pharmacist' | 'cashier' | 'storekeeper' | 'dispensing_assistant';

export interface User {
  id: string;
  username: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  isActive?: boolean;
  status?: 'active' | 'inactive';
  lastLogin?: string;
  createdAt: string;
  mustChangePasswordOnLogin?: boolean;
  customPermissions?: Partial<Record<PermissionKey, boolean>>;
  photoURL?: string;
  department?: string;
  employeeId?: string;
}

export type StockMovementType =
  | 'PURCHASE'
  | 'SALE'
  | 'RETURN'
  | 'ADJUSTMENT_IN'
  | 'ADJUSTMENT_OUT'
  | 'DAMAGE_DISPOSAL'
  | 'EXPIRED_DISPOSAL'
  | 'VOID_REVERSAL';

export interface StockMovement {
  id: string;
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  movementType: StockMovementType;
  quantity: number;
  previousStock: number;
  newStock: number;
  referenceId?: string;
  reason?: string;
  notes?: string;
  performedById: string;
  performedByName: string;
  createdAt: string;
}

export type DosageForm = 
  | 'Tablet' 
  | 'Capsule' 
  | 'Syrup' 
  | 'Suspension' 
  | 'Injection' 
  | 'Inhaler' 
  | 'Eye/Ear Drops' 
  | 'Ointment/Cream' 
  | 'Suppository' 
  | 'Powder/Sachet'
  | 'Gel'
  | 'Solution';

export interface MedicineBatch {
  id: string;
  medicineId: string;
  batchNumber: string;
  supplierId: string;
  supplierName: string;
  manufacturingDate: string;
  expiryDate: string;
  quantityReceived: number;
  remainingQuantity: number;
  purchasePrice: number;
  sellingPrice: number;
  createdAt: string;
}

export type RouteOfAdministration =
  | 'Oral'
  | 'Intravenous (IV)'
  | 'Intramuscular (IM)'
  | 'Subcutaneous (SC)'
  | 'Topical'
  | 'Inhalation'
  | 'Ophthalmic (Eye)'
  | 'Otic (Ear)'
  | 'Nasal'
  | 'Sublingual / Buccal'
  | 'Rectal'
  | 'Transdermal'
  | 'Vaginal'
  | 'Intradermal'
  | 'Other';

export interface Medicine {
  id: string;
  code: string;
  name: string;
  genericName: string;
  brandName?: string;
  categoryId: string;
  categoryName: string;
  dosage: string;
  form: DosageForm;
  routeOfAdministration?: RouteOfAdministration | string;
  strength: string;
  unit: string;
  purchasePrice: number;
  sellingPrice: number;
  markupPercentage?: number;
  nhisCovered?: boolean;
  nhisCode?: string;
  nhisLevel?: 'M' | 'B' | 'C' | 'D';
  nhisTariffPrice?: number;
  minimumStockLevel: number;
  requiresPrescription: boolean;
  description?: string;
  sideEffects?: string;
  barcode?: string;
  status: 'active' | 'inactive' | 'discontinued';
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  medicineCount?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  telephone: string;
  phone?: string;
  email: string;
  address: string;
  paymentTerms?: string;
  taxNumber?: string;
  status: 'active' | 'inactive';
  rating?: number;
  createdAt: string;
}

export type OrderStatus = 'draft' | 'pending' | 'approved' | 'received' | 'cancelled';
export type PaymentStatus = 'paid' | 'partial' | 'due' | 'pending';

export interface PurchaseOrderItem {
  id: string;
  medicineId: string;
  medicineName: string;
  genericName?: string;
  batchNumber?: string;
  manufacturingDate?: string;
  expiryDate?: string;
  quantity?: number;
  quantityOrdered?: number;
  quantityReceived?: number;
  unitCost: number;
  totalCost: number;
}

export interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierId: string;
  supplierName: string;
  orderDate: string;
  deliveryDate?: string;
  expectedDeliveryDate?: string;
  status: OrderStatus;
  items: PurchaseOrderItem[];
  subtotal?: number;
  tax?: number;
  shipping?: number;
  totalAmount: number;
  paymentStatus: PaymentStatus;
  paidAmount?: number;
  notes?: string;
  isApproved?: boolean;
  approvedBy?: string;
  approvedAt?: string;
  receivedBy?: string;
  receivedAt?: string;
  createdAt: string;
}

export type Gender = 'male' | 'female' | 'other';

export interface Customer {
  id: string;
  name: string;
  telephone: string;
  email?: string;
  address?: string;
  dateOfBirth?: string;
  gender: Gender;
  allergies?: string[];
  chronicConditions?: string[];
  bloodGroup?: string;
  emergencyContact?: string;
  totalPurchases?: number;
  createdAt: string;
}

export interface PrescriptionItem {
  id: string;
  medicineId: string;
  medicineName: string;
  dosage: string;
  frequency: string;
  duration: string;
  quantityPrescribed: number;
  quantityDispensed: number;
  instructions: string;
}

export interface Prescription {
  id: string;
  prescriptionNumber: string;
  customerId: string;
  customerName: string;
  doctorName: string;
  doctorLicense?: string;
  clinicHospital: string;
  prescriptionDate: string;
  diagnosis?: string;
  items: PrescriptionItem[];
  status: 'pending' | 'partial' | 'dispensed' | 'cancelled';
  dispensedBy?: string;
  dispensedAt?: string;
  notes?: string;
  createdAt: string;
}

export interface SaleItem {
  id: string;
  medicineId: string;
  medicineName: string;
  genericName: string;
  dosage: string;
  form: DosageForm;
  batchId: string;
  batchNumber: string;
  expiryDate: string;
  quantity: number;
  unitPrice: number;
  purchaseCost: number;
  subtotal: number;
  discount: number;
  total: number;
}

export type PaymentMethod = 'cash' | 'card' | 'mobile_money' | 'bank_transfer' | 'insurance';

export interface Sale {
  id: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerPhone?: string;
  prescriptionId?: string;
  prescriptionNumber?: string;
  items: SaleItem[];
  subtotal: number;
  discountTotal: number;
  taxRate: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: PaymentMethod;
  amountTendered: number;
  changeGiven: number;
  cashierId: string;
  cashierName: string;
  preparedById?: string;
  preparedByName?: string;
  dispensedById?: string;
  dispensedByName?: string;
  dispensedAt?: string;
  dispenseStatus?: 'awaiting_payment' | 'paid_awaiting_dispense' | 'finally_dispensed' | 'cancelled';
  pharmacistId?: string;
  pharmacistName?: string;
  status: 'completed' | 'refunded' | 'partially_refunded' | 'voided';
  refundedAmount?: number;
  notes?: string;
  createdAt: string;
}

export type ReturnReason =
  | 'patient_adverse_reaction'
  | 'dispensing_error'
  | 'defective_damaged'
  | 'customer_requested'
  | 'expired_sold_in_error';

export interface ReturnItem {
  id: string;
  saleItemId: string;
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  quantity: number;
  quantityReturned?: number;
  unitPrice: number;
  refundAmount: number;
  condition?: 'restockable' | 'damaged_expired' | 'write_off';
  reason?: ReturnReason;
  restockedToInventory?: boolean;
}

export interface ReturnOrder {
  id: string;
  returnNumber: string;
  saleId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  returnDate: string;
  reason: string;
  items: ReturnItem[];
  totalRefundAmount?: number;
  totalRefund?: number;
  processedBy: string;
  processedByName: string;
  notes?: string;
  createdAt: string;
  status?: string;
  restockedToInventory?: boolean;
}

export type SaleReturn = ReturnOrder;

export type AdjustmentReason = 
  | 'damaged' 
  | 'expired_disposal' 
  | 'lost_theft' 
  | 'inventory_count_discrepancy' 
  | 'received_correction' 
  | 'customer_return_unusable'
  | 'other';

export interface StockAdjustment {
  id: string;
  medicineId: string;
  medicineName: string;
  batchId: string;
  batchNumber: string;
  previousQuantity: number;
  adjustmentQuantity: number; // can be negative (decrease) or positive (increase)
  newQuantity: number;
  reason: AdjustmentReason;
  notes?: string;
  authorizedBy: string;
  authorizedByName: string;
  date: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  module: 
    | 'auth' 
    | 'medicines' 
    | 'batches' 
    | 'pos_sales' 
    | 'prescriptions' 
    | 'purchases' 
    | 'suppliers' 
    | 'customers' 
    | 'returns' 
    | 'inventory_adjustments' 
    | 'users' 
    | 'settings' 
    | 'backup_restore';
  action: string;
  recordId?: string;
  entityType?: string;
  entityId?: string;
  details: string;
  previousValue?: string;
  newValue?: string;
  ipAddress?: string;
  timestamp: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: 'danger' | 'warning' | 'info' | 'success';
  module: 'inventory' | 'expiry' | 'prescription' | 'purchase' | 'system' | 'pos';
  isRead: boolean;
  linkTab?: string;
  createdAt: string;
}

export interface ToastNotification {
  id: string;
  title: string;
  message: string;
  type?: 'success' | 'info' | 'warning' | 'danger';
  durationMs?: number;
}

export interface PharmacySettings {
  pharmacyName: string;
  licenseNumber: string;
  address: string;
  phone: string;
  telephone?: string;
  email: string;
  taxRatePercent: number;
  currencySymbol: string;
  currencyCode: string;
  enableTax: boolean;
  invoicePrefix?: string;
  receiptHeader: string;
  receiptFooter: string;
  receiptFooterNote?: string;
  lowStockThresholdDefault: number;
  nearExpiryThresholdDays: number;
  sessionTimeoutMinutes: number;
  defaultMarkupPercent?: number;
  allowNegativeStock: boolean;
  enforcePrescriptionVerification: boolean;
  autoPrintReceipt: boolean;
}

export type PermissionKey =
  | 'view_dashboard'
  | 'access_pos'
  | 'save_hold_cart'
  | 'add_prescription_to_cart'
  | 'receive_payment'
  | 'dispense_prescriptions'
  | 'register_prescriptions'
  | 'view_medicines'
  | 'view_cost_price'
  | 'manage_medicines'
  | 'adjust_inventory'
  | 'manage_purchases'
  | 'manage_customers'
  | 'manage_returns'
  | 'view_reports'
  | 'view_sales_reports'
  | 'manage_users'
  | 'manage_rbac_matrix'
  | 'view_audit_logs'
  | 'manage_backups'
  | 'view_system_docs';

export type RolePermissions = Record<PermissionKey, boolean>;

export type RBACMatrix = Record<UserRole, RolePermissions>;
