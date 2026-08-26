import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { safeFixed } from '../utils/formatters';
import {
  collection,
  doc,
  onSnapshot,
} from 'firebase/firestore';
import { db, testConnection, handleFirestoreError, OperationType, ensureAuth } from '../firebase';
import {
  FirestoreCollections,
  seedInitialFirestoreData,
  syncDoc,
  deleteDocFromFirestore
} from '../services/firestoreSync';
import {
  User,
  UserRole,
  Medicine,
  MedicineBatch,
  Category,
  Supplier,
  Customer,
  Prescription,
  Sale,
  SaleItem,
  PaymentMethod,
  PurchaseOrder,
  PharmacySettings,
  StockAdjustment,
  AuditLog,
  NotificationItem,
  ToastNotification,
  ReturnOrder,
  PermissionKey,
  RolePermissions,
  RBACMatrix,
} from '../types';
import {
  initialUsers,
  initialCategories,
  initialMedicines,
  initialBatches,
  initialSuppliers,
  initialCustomers,
  initialPrescriptions,
  initialPurchaseOrders,
  initialSales,
  initialReturns,
  initialStockAdjustments,
  initialAuditLogs,
  initialSettings,
} from '../data/initialData';

export interface SavedCart {
  id: string;
  name: string;
  customerId?: string;
  customerName?: string;
  prescriptionId?: string;
  prescriptionNumber?: string;
  items: any[];
  discountPercent: number;
  notes?: string;
  savedAt: string;
  savedBy: string;
}

export const initialRBACMatrix: RBACMatrix = {
  admin: {
    view_dashboard: true,
    access_pos: true,
    save_hold_cart: true,
    add_prescription_to_cart: true,
    receive_payment: true,
    dispense_prescriptions: true,
    register_prescriptions: true,
    view_medicines: true,
    view_cost_price: true,
    manage_medicines: true,
    adjust_inventory: true,
    manage_purchases: true,
    manage_customers: true,
    manage_returns: true,
    view_reports: true,
    view_sales_reports: true,
    manage_users: true,
    manage_rbac_matrix: true,
    view_audit_logs: true,
    manage_backups: true,
    view_system_docs: true,
  },
  pharmacist: {
    view_dashboard: true,
    access_pos: true,
    save_hold_cart: true,
    add_prescription_to_cart: true,
    receive_payment: true,
    dispense_prescriptions: true,
    register_prescriptions: true,
    view_medicines: true,
    view_cost_price: true,
    manage_medicines: true,
    adjust_inventory: true,
    manage_purchases: true,
    manage_customers: true,
    manage_returns: true,
    view_reports: true,
    view_sales_reports: true,
    manage_users: false,
    manage_rbac_matrix: false,
    view_audit_logs: false,
    manage_backups: false,
    view_system_docs: false,
  },
  dispensing_assistant: {
    view_dashboard: true,
    access_pos: true,
    save_hold_cart: true,
    add_prescription_to_cart: true,
    receive_payment: false, // Dispensing assistants MUST NOT receive payment
    dispense_prescriptions: true, // Dispensing assistants finally dispense paid items
    register_prescriptions: false, // Only pharmacist adds prescriptions
    view_medicines: true,
    view_cost_price: false, // Dispensing assistants do not see cost prices
    manage_medicines: false, // Dispensing assistants cannot setup medicines
    adjust_inventory: false, // Dispensing assistants cannot adjust inventory
    manage_purchases: false,
    manage_customers: true,
    manage_returns: false, // Admin & Pharmacist only
    view_reports: false,
    view_sales_reports: false,
    manage_users: false,
    manage_rbac_matrix: false,
    view_audit_logs: false,
    manage_backups: false,
    view_system_docs: false,
  },
  cashier: {
    view_dashboard: true,
    access_pos: true,
    save_hold_cart: true,
    add_prescription_to_cart: false, // Cashier cannot add prescription to cart
    receive_payment: true, // Cashier receives money and prints receipt
    dispense_prescriptions: false, // Cashier can only dispense if they prepared the cart
    register_prescriptions: false,
    view_medicines: false,
    view_cost_price: false,
    manage_medicines: false,
    adjust_inventory: false,
    manage_purchases: false,
    manage_customers: true,
    manage_returns: false, // Admin & Pharmacist only
    view_reports: false,
    view_sales_reports: false,
    manage_users: false,
    manage_rbac_matrix: false,
    view_audit_logs: false,
    manage_backups: false,
    view_system_docs: false,
  },
  storekeeper: {
    view_dashboard: true,
    access_pos: false,
    save_hold_cart: false,
    add_prescription_to_cart: false,
    receive_payment: false,
    dispense_prescriptions: false,
    register_prescriptions: false,
    view_medicines: true,
    view_cost_price: true,
    manage_medicines: true,
    adjust_inventory: true,
    manage_purchases: true,
    manage_customers: false,
    manage_returns: false,
    view_reports: true,
    view_sales_reports: false, // Storekeeper cannot access Sales & Revenue reports
    manage_users: false,
    manage_rbac_matrix: false,
    view_audit_logs: false,
    manage_backups: false,
    view_system_docs: false,
  },
};

interface PharmacyContextType {
  // Current session & auth
  currentUser: User;
  users: User[];
  isAuthenticated: boolean;
  setCurrentUser: (user: User) => void;
  switchUserRole: (role: UserRole) => void;
  login: (identifier: string, password?: string) => boolean;
  logout: () => void;
  addUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  deleteUser: (id: string) => void;
  toggleUserStatus: (id: string) => void;
  resetUserPassword: (userId: string, newDefaultPassword?: string, forceChangeOnLogin?: boolean) => void;
  updateUserCustomPermissions: (userId: string, customPermissions: Partial<Record<PermissionKey, boolean>>) => void;
  forceChangePasswordOnFirstLogin: (newPassword: string) => void;
  changeMyPassword: (newPassword: string) => void;

  // RBAC & User Permission Management
  rbacMatrix: RBACMatrix;
  updateRolePermission: (role: UserRole, permission: PermissionKey, allowed: boolean) => void;
  saveEntireRBACMatrix: (newMatrix: RBACMatrix) => void;
  resetRBACMatrix: () => void;
  hasPermission: (permission: PermissionKey, targetUser?: User) => boolean;

  // Prescription to POS Transfer
  pendingPrescriptionForPOS: Prescription | null;
  setPendingPrescriptionForPOS: (rx: Prescription | null) => void;
  loadPrescriptionToPOSCart: (rx: Prescription) => void;

  // Saved / Held Carts
  savedCarts: SavedCart[];
  saveHoldCart: (cartData: {
    name: string;
    customerId?: string;
    customerName?: string;
    prescriptionId?: string;
    prescriptionNumber?: string;
    items: any[];
    discountPercent?: number;
    notes?: string;
  }) => string;
  deleteSavedCart: (id: string) => void;

  // Settings
  settings: PharmacySettings;
  updateSettings: (newSettings: Partial<PharmacySettings>) => void;

  // Medicines & Categories
  medicines: Medicine[];
  categories: Category[];
  addMedicine: (medicine: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateMedicine: (id: string, medicine: Partial<Medicine>) => void;
  deleteMedicine: (id: string) => void;
  addCategory: (name: string, description?: string) => void;
  updateCategory: (id: string, name: string, description?: string) => void;
  deleteCategory: (id: string) => void;

  // Batches & Inventory
  batches: MedicineBatch[];
  addBatch: (batch: Omit<MedicineBatch, 'id' | 'createdAt'>) => void;
  updateBatch: (id: string, batch: Partial<MedicineBatch>) => void;
  deleteBatch: (id: string) => void;
  stockAdjustments: StockAdjustment[];
  adjustStock: (adjustment: Omit<StockAdjustment, 'id' | 'createdAt'>) => void;
  getMedicineTotalStock: (medicineId: string) => number;
  getMedicineBatches: (medicineId: string, filterExpired?: boolean) => MedicineBatch[];
  getFefoRecommendedBatch: (medicineId: string, requiredQty: number) => MedicineBatch | null;

  // Suppliers & Purchasing
  suppliers: Supplier[];
  purchaseOrders: PurchaseOrder[];
  addSupplier: (supplier: Omit<Supplier, 'id' | 'createdAt'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  createPurchaseOrder: (po: Omit<PurchaseOrder, 'id' | 'createdAt' | 'poNumber'>) => PurchaseOrder;
  updatePurchaseOrder: (id: string, poData: Partial<PurchaseOrder>) => void;
  approvePurchaseOrder: (id: string, adminName: string) => void;
  receivePurchaseOrder: (
    poId: string,
    notes?: string,
    customBatches?: Record<string, { batchNumber: string; manufacturingDate: string; expiryDate: string; quantityReceived: number }>
  ) => { success: boolean; error?: string };
  updatePurchaseOrderStatus: (poId: string, status: PurchaseOrder['status']) => void;

  // Customers / Patients
  customers: Customer[];
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'totalPurchases'>) => Customer;
  updateCustomer: (id: string, customer: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;

  // Prescriptions
  prescriptions: Prescription[];
  createPrescription: (rx: Omit<Prescription, 'id' | 'createdAt' | 'prescriptionNumber'>) => Prescription;
  updatePrescription: (id: string, rx: Partial<Prescription>) => void;
  dispensePrescription: (id: string, pharmacistName: string) => void;

  // Sales & POS
  sales: Sale[];
  returns: ReturnOrder[];
  salesReturns?: ReturnOrder[];
  processSale: (saleData: Omit<Sale, 'id' | 'invoiceNumber' | 'createdAt'>) => { success: boolean; sale?: Sale; error?: string };
  createDispensingOrder: (orderData: {
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
    notes?: string;
  }) => { success: boolean; sale?: Sale; error?: string };
  completeCashierPayment: (
    saleId: string,
    paymentData: {
      paymentMethod: PaymentMethod;
      amountTendered: number;
      changeGiven: number;
      notes?: string;
    }
  ) => { success: boolean; sale?: Sale; error?: string };
  finallyDispenseSale: (saleId: string, dispenserName?: string) => { success: boolean; sale?: Sale; error?: string };
  cancelDispensingOrder: (saleId: string) => { success: boolean; error?: string };
  processReturn: (returnData: Omit<ReturnOrder, 'id' | 'returnNumber' | 'createdAt'>) => { success: boolean; returnOrder?: ReturnOrder; error?: string };
  processSaleReturn?: (returnData: any) => { success: boolean; returnOrder?: ReturnOrder; error?: string };

  // Audits & Notifications
  auditLogs: AuditLog[];
  notifications: NotificationItem[];
  activeToast: ToastNotification | null;
  addAuditLog: (log: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => void;
  addNotification: (item: {
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    module?: 'inventory' | 'expiry' | 'prescription' | 'purchase' | 'system' | 'pos';
    linkTab?: string;
  }) => void;
  showToast: (toast: Omit<ToastNotification, 'id'>) => void;
  dismissToast: () => void;
  markNotificationRead: (id: string) => void;
  toggleNotificationRead: (id: string) => void;
  deleteNotification: (id: string) => void;
  clearAllNotifications: () => void;

  // Backup, Restore & Reset
  exportDatabase: () => string;
  exportFullDatabaseBackup?: () => string;
  importDatabase: (jsonString: string) => boolean;
  restoreDatabaseBackup?: (jsonString: string) => boolean;
  resetDatabaseToDefault: () => void;
  resetToDefaultSeedData?: () => void;

  // Computed helper data
  lowStockMedicines: { medicine: Medicine; currentStock: number }[];
  nearExpiryBatches: { batch: MedicineBatch; medicine: Medicine; daysLeft: number }[];
  expiredBatches: { batch: MedicineBatch; medicine: Medicine; daysPassed: number }[];
  todayStats: { salesCount: number; salesTotal: number; netProfit: number; itemsSold: number };
}

const PharmacyContext = createContext<PharmacyContextType | undefined>(undefined);

const LOCAL_STORAGE_PREFIX = 'pharmacare_pms_';

export const PharmacyProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // Load state from localStorage or initialize with seed data
  const loadState = <T,>(key: string, defaultVal: T): T => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_PREFIX + key);
      if (!saved) return defaultVal;
      const parsed = JSON.parse(saved);
      if (Array.isArray(defaultVal)) {
        return Array.isArray(parsed) ? (parsed as unknown as T) : defaultVal;
      }
      if (typeof defaultVal === 'object' && defaultVal !== null) {
        return typeof parsed === 'object' && parsed !== null ? { ...defaultVal, ...parsed } : defaultVal;
      }
      return (parsed as T) ?? defaultVal;
    } catch {
      return defaultVal;
    }
  };

  const [settings, setSettings] = useState<PharmacySettings>(() => {
    const loaded = loadState<PharmacySettings>('settings', initialSettings);
    // Ensure Ghana Cedi is standard default if previously configured as USD or empty
    if (!loaded.currencySymbol || loaded.currencySymbol === '$' || loaded.currencyCode === 'USD') {
      return {
        ...loaded,
        currencySymbol: 'GH₵',
        currencyCode: 'GHS',
        address: loaded.address.includes('Metro City') ? 'Ring Road Central, Adabraka, Accra, Ghana' : loaded.address,
        phone: loaded.phone.includes('+1') ? '+233 24 555 8900' : loaded.phone,
      };
    }
    return loaded;
  });
  const [users, setUsers] = useState<User[]>(() => {
    const loaded = loadState<User[]>('users', initialUsers);
    const existingIds = new Set(loaded.map(u => u.id));
    const missing = initialUsers.filter(u => !existingIds.has(u.id));
    return missing.length > 0 ? [...loaded, ...missing] : (loaded.length > 0 ? loaded : initialUsers);
  });
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => loadState('isAuthenticated', true));
  const [currentUser, setCurrentUser] = useState<User>(() => {
    const savedUser = loadState<User | null>('currentUser', null);
    if (savedUser) {
      const match = initialUsers.find(u => u.id === savedUser.id) || savedUser;
      return match;
    }
    return initialUsers[0];
  });
  const [pendingPrescriptionForPOS, setPendingPrescriptionForPOS] = useState<Prescription | null>(null);
  const [categories, setCategories] = useState<Category[]>(() => {
    const loaded = loadState<Category[]>('categories', initialCategories);
    return loaded.length > 0 ? loaded : initialCategories;
  });
  const [medicines, setMedicines] = useState<Medicine[]>(() => {
    const loaded = loadState<Medicine[]>('medicines', initialMedicines);
    return loaded.length > 0 ? loaded : initialMedicines;
  });
  const [batches, setBatches] = useState<MedicineBatch[]>(() => {
    const loaded = loadState<MedicineBatch[]>('batches', initialBatches);
    return loaded.length > 0 ? loaded : initialBatches;
  });
  const [suppliers, setSuppliers] = useState<Supplier[]>(() => {
    const loaded = loadState<Supplier[]>('suppliers', initialSuppliers);
    return loaded.length > 0 ? loaded : initialSuppliers;
  });
  const [customers, setCustomers] = useState<Customer[]>(() => {
    const loaded = loadState<Customer[]>('customers', initialCustomers);
    return loaded.length > 0 ? loaded : initialCustomers;
  });
  const [prescriptions, setPrescriptions] = useState<Prescription[]>(() => {
    const loaded = loadState<Prescription[]>('prescriptions', initialPrescriptions);
    return loaded.length > 0 ? loaded : initialPrescriptions;
  });
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>(() => {
    const loaded = loadState<PurchaseOrder[]>('purchaseOrders', initialPurchaseOrders);
    return loaded.length > 0 ? loaded : initialPurchaseOrders;
  });
  const [sales, setSales] = useState<Sale[]>(() => {
    const loaded = loadState<Sale[]>('sales', initialSales);
    return loaded.length > 0 ? loaded : initialSales;
  });
  const [returns, setReturns] = useState<ReturnOrder[]>(() => {
    const loaded = loadState<ReturnOrder[]>('returns', initialReturns);
    return loaded.length > 0 ? loaded : initialReturns;
  });
  const [stockAdjustments, setStockAdjustments] = useState<StockAdjustment[]>(() => loadState('stockAdjustments', initialStockAdjustments));
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => loadState('auditLogs', initialAuditLogs));
  const [readNotificationIds, setReadNotificationIds] = useState<string[]>(() => loadState('readNotificationIds', []));
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState<string[]>(() => loadState('dismissedNotificationIds', []));
  const [userNotifications, setUserNotifications] = useState<NotificationItem[]>(() => loadState('userNotifications', []));
  const [activeToast, setActiveToast] = useState<ToastNotification | null>(null);
  const [rbacMatrix, setRbacMatrix] = useState<RBACMatrix>(() => loadState('rbacMatrix', initialRBACMatrix));
  const [savedCarts, setSavedCarts] = useState<SavedCart[]>(() => loadState('savedCarts', []));

  // Sync to localStorage
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'users', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'isAuthenticated', JSON.stringify(isAuthenticated)); }, [isAuthenticated]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'currentUser', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'categories', JSON.stringify(categories)); }, [categories]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'medicines', JSON.stringify(medicines)); }, [medicines]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'batches', JSON.stringify(batches)); }, [batches]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'suppliers', JSON.stringify(suppliers)); }, [suppliers]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'customers', JSON.stringify(customers)); }, [customers]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'prescriptions', JSON.stringify(prescriptions)); }, [prescriptions]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'purchaseOrders', JSON.stringify(purchaseOrders)); }, [purchaseOrders]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'sales', JSON.stringify(sales)); }, [sales]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'returns', JSON.stringify(returns)); }, [returns]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'stockAdjustments', JSON.stringify(stockAdjustments)); }, [stockAdjustments]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'auditLogs', JSON.stringify(auditLogs)); }, [auditLogs]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'readNotificationIds', JSON.stringify(readNotificationIds)); }, [readNotificationIds]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'dismissedNotificationIds', JSON.stringify(dismissedNotificationIds)); }, [dismissedNotificationIds]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'userNotifications', JSON.stringify(userNotifications)); }, [userNotifications]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'rbacMatrix', JSON.stringify(rbacMatrix)); }, [rbacMatrix]);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_PREFIX + 'savedCarts', JSON.stringify(savedCarts)); }, [savedCarts]);

  // Real-time Cloud Firestore synchronization & initial seeding
  useEffect(() => {
    // 1. Establish auth session, test connection, and seed initial Firestore data if needed
    ensureAuth().then(() => {
      testConnection().then(() => {
        seedInitialFirestoreData(initialRBACMatrix);
      }).catch(err => {
        console.warn('Firestore initialization notice:', err);
      });
    }).catch(() => {
      testConnection().then(() => {
        seedInitialFirestoreData(initialRBACMatrix);
      }).catch(err => {
        console.warn('Firestore initialization notice:', err);
      });
    });

    // 2. Attach real-time snapshot listeners for all collections
    const unsubUsers = onSnapshot(collection(db, FirestoreCollections.USERS), snapshot => {
      if (!snapshot.empty) {
        const loadedUsers = snapshot.docs.map(d => d.data() as User);
        setUsers(loadedUsers);
        // Ensure current active user updates in session if modified
        setCurrentUser(curr => {
          const match = loadedUsers.find(u => u.id === curr.id);
          return match || curr;
        });
      }
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.USERS));

    const unsubSettings = onSnapshot(collection(db, FirestoreCollections.SETTINGS), snapshot => {
      const globalDoc = snapshot.docs.find(d => d.id === 'global');
      if (globalDoc) {
        setSettings(globalDoc.data() as PharmacySettings);
      }
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.SETTINGS));

    const unsubRBAC = onSnapshot(collection(db, FirestoreCollections.RBAC_MATRIX), snapshot => {
      const rbacDoc = snapshot.docs.find(d => d.id === 'global');
      if (rbacDoc && rbacDoc.data()?.matrix) {
        setRbacMatrix(rbacDoc.data().matrix as RBACMatrix);
      }
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.RBAC_MATRIX));

    const unsubCategories = onSnapshot(collection(db, FirestoreCollections.CATEGORIES), snapshot => {
      if (!snapshot.empty) {
        setCategories(snapshot.docs.map(d => d.data() as Category));
      }
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.CATEGORIES));

    const unsubMedicines = onSnapshot(collection(db, FirestoreCollections.MEDICINES), snapshot => {
      setMedicines(snapshot.docs.map(d => d.data() as Medicine));
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.MEDICINES));

    const unsubBatches = onSnapshot(collection(db, FirestoreCollections.BATCHES), snapshot => {
      setBatches(snapshot.docs.map(d => d.data() as MedicineBatch));
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.BATCHES));

    const unsubSuppliers = onSnapshot(collection(db, FirestoreCollections.SUPPLIERS), snapshot => {
      setSuppliers(snapshot.docs.map(d => d.data() as Supplier));
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.SUPPLIERS));

    const unsubCustomers = onSnapshot(collection(db, FirestoreCollections.CUSTOMERS), snapshot => {
      setCustomers(snapshot.docs.map(d => d.data() as Customer));
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.CUSTOMERS));

    const unsubPrescriptions = onSnapshot(collection(db, FirestoreCollections.PRESCRIPTIONS), snapshot => {
      setPrescriptions(snapshot.docs.map(d => d.data() as Prescription));
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.PRESCRIPTIONS));

    const unsubPurchaseOrders = onSnapshot(collection(db, FirestoreCollections.PURCHASE_ORDERS), snapshot => {
      setPurchaseOrders(snapshot.docs.map(d => d.data() as PurchaseOrder));
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.PURCHASE_ORDERS));

    const unsubSales = onSnapshot(collection(db, FirestoreCollections.SALES), snapshot => {
      setSales(snapshot.docs.map(d => d.data() as Sale));
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.SALES));

    const unsubReturns = onSnapshot(collection(db, FirestoreCollections.RETURNS), snapshot => {
      setReturns(snapshot.docs.map(d => d.data() as ReturnOrder));
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.RETURNS));

    const unsubStockAdjustments = onSnapshot(collection(db, FirestoreCollections.STOCK_ADJUSTMENTS), snapshot => {
      setStockAdjustments(snapshot.docs.map(d => d.data() as StockAdjustment));
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.STOCK_ADJUSTMENTS));

    const unsubAuditLogs = onSnapshot(collection(db, FirestoreCollections.AUDIT_LOGS), snapshot => {
      if (!snapshot.empty) {
        setAuditLogs(snapshot.docs.map(d => d.data() as AuditLog));
      }
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.AUDIT_LOGS));

    const unsubSavedCarts = onSnapshot(collection(db, FirestoreCollections.SAVED_CARTS), snapshot => {
      setSavedCarts(snapshot.docs.map(d => d.data() as SavedCart));
    }, error => handleFirestoreError(error, OperationType.GET, FirestoreCollections.SAVED_CARTS));

    return () => {
      unsubUsers();
      unsubSettings();
      unsubRBAC();
      unsubCategories();
      unsubMedicines();
      unsubBatches();
      unsubSuppliers();
      unsubCustomers();
      unsubPrescriptions();
      unsubPurchaseOrders();
      unsubSales();
      unsubReturns();
      unsubStockAdjustments();
      unsubAuditLogs();
      unsubSavedCarts();
    };
  }, []);

  // RBAC & User-Specific Permission checks & matrix editor
  const hasPermission = (permission: PermissionKey, targetUser?: User): boolean => {
    const userToCheck = targetUser || currentUser;
    if (!userToCheck) return false;

    // 1. Check user-specific custom permission overrides first
    if (userToCheck.customPermissions && userToCheck.customPermissions[permission] !== undefined) {
      return Boolean(userToCheck.customPermissions[permission]);
    }

    // 2. Otherwise fallback to Role-Based Access Control matrix
    const role = userToCheck.role || 'cashier';
    const rolePerms = rbacMatrix[role];
    if (!rolePerms) return false;
    if (permission === 'view_sales_reports' && rolePerms[permission] === undefined) {
      return role === 'admin' || role === 'pharmacist';
    }
    return Boolean(rolePerms[permission]);
  };

  const updateRolePermission = (role: UserRole, permission: PermissionKey, allowed: boolean) => {
    setRbacMatrix(prev => {
      const updated = {
        ...prev,
        [role]: {
          ...prev[role],
          [permission]: allowed,
        },
      };
      return updated;
    });

    addAuditLog({
      module: 'users',
      action: 'UPDATE_RBAC_PERMISSION',
      details: `Modified permission '${permission}' for role '${role}' to ${allowed ? 'ALLOWED' : 'DENIED'}`,
    });
  };

  const saveEntireRBACMatrix = (newMatrix: RBACMatrix) => {
    setRbacMatrix(newMatrix);
    try {
      localStorage.setItem(LOCAL_STORAGE_PREFIX + 'rbacMatrix', JSON.stringify(newMatrix));
    } catch (e) {
      console.error('Failed to persist RBAC matrix to localStorage', e);
    }
    syncDoc(FirestoreCollections.RBAC_MATRIX, 'global', { matrix: newMatrix, updatedAt: new Date().toISOString() }).catch(console.error);
    addAuditLog({
      module: 'users',
      action: 'SAVE_RBAC_MATRIX',
      details: 'Administrator saved and enforced new system-wide Role-Based Access Control (RBAC) permission configuration.',
    });
  };

  const resetRBACMatrix = () => {
    setRbacMatrix(initialRBACMatrix);
    try {
      localStorage.setItem(LOCAL_STORAGE_PREFIX + 'rbacMatrix', JSON.stringify(initialRBACMatrix));
    } catch (e) {
      console.error('Failed to reset RBAC matrix in localStorage', e);
    }
    syncDoc(FirestoreCollections.RBAC_MATRIX, 'global', { matrix: initialRBACMatrix, updatedAt: new Date().toISOString() }).catch(console.error);
    addAuditLog({
      module: 'users',
      action: 'RESET_RBAC_MATRIX',
      details: `Reset RBAC Permission Matrix to default system security policy`,
    });
  };

  // Saved / Held Carts
  const saveHoldCart = (cartData: {
    name: string;
    customerId?: string;
    customerName?: string;
    prescriptionId?: string;
    prescriptionNumber?: string;
    items: any[];
    discountPercent?: number;
    notes?: string;
  }): string => {
    const id = `hold-${Date.now()}`;
    const newCart: SavedCart = {
      id,
      name: cartData.name || `Held Cart (${new Date().toLocaleTimeString()})`,
      customerId: cartData.customerId,
      customerName: cartData.customerName,
      prescriptionId: cartData.prescriptionId,
      prescriptionNumber: cartData.prescriptionNumber,
      items: cartData.items,
      discountPercent: cartData.discountPercent || 0,
      notes: cartData.notes,
      savedAt: new Date().toISOString(),
      savedBy: currentUser.name,
    };
    setSavedCarts(prev => [newCart, ...prev]);
    syncDoc(FirestoreCollections.SAVED_CARTS, newCart.id, newCart).catch(console.error);

    addAuditLog({
      module: 'pos_sales',
      action: 'SAVE_HOLD_CART',
      details: `Saved cart '${newCart.name}' with ${newCart.items.length} items (Prescription: ${newCart.prescriptionNumber || 'None'})`,
    });
    return id;
  };

  const deleteSavedCart = (id: string) => {
    setSavedCarts(prev => prev.filter(c => c.id !== id));
    deleteDocFromFirestore(FirestoreCollections.SAVED_CARTS, id).catch(console.error);
  };

  // Audit Logger Helper
  const addAuditLog = (log: Omit<AuditLog, 'id' | 'timestamp' | 'userId' | 'userName' | 'userRole'>) => {
    const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: currentUser.id,
      userName: currentUser.name,
      userRole: currentUser.role,
      timestamp: new Date().toISOString(),
    };
    setAuditLogs(prev => [newLog, ...prev]);
    syncDoc(FirestoreCollections.AUDIT_LOGS, newLog.id, newLog).catch(console.error);
  };

  // Stock helpers
  const getMedicineTotalStock = (medicineId: string): number => {
    return batches
      .filter(b => b.medicineId === medicineId)
      .reduce((sum, b) => sum + (Number(b.remainingQuantity) || 0), 0);
  };

  const getMedicineBatches = (medicineId: string, filterExpired: boolean = false): MedicineBatch[] => {
    const now = new Date();
    return batches
      .filter(b => {
        if (b.medicineId !== medicineId) return false;
        if (filterExpired) {
          const exp = new Date(b.expiryDate);
          return exp > now && b.remainingQuantity > 0;
        }
        return true;
      })
      .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime()); // FEFO
  };

  const getFefoRecommendedBatch = (medicineId: string, requiredQty: number): MedicineBatch | null => {
    const validBatches = getMedicineBatches(medicineId, true);
    // Find the first non-expired batch with enough stock, or the first with remaining stock
    const batchWithStock = validBatches.find(b => b.remainingQuantity >= requiredQty) || validBatches.find(b => b.remainingQuantity > 0);
    return batchWithStock || null;
  };

  // User authentication, switching & management
  const login = (identifier: string, _password?: string): boolean => {
    const cleanId = identifier.trim().toLowerCase();
    const targetUser = users.find(
      u =>
        u.id.toLowerCase() === cleanId ||
        u.username.toLowerCase() === cleanId ||
        u.role.toLowerCase() === cleanId ||
        u.email.toLowerCase() === cleanId
    );

    if (targetUser && targetUser.isActive) {
      setCurrentUser(targetUser);
      setIsAuthenticated(true);
      addAuditLog({
        module: 'auth',
        action: 'LOGIN',
        recordId: targetUser.id,
        details: `User ${targetUser.name} logged into system (${targetUser.role})`,
      });
      return true;
    }
    return false;
  };

  const logout = () => {
    addAuditLog({
      module: 'auth',
      action: 'LOGOUT',
      recordId: currentUser.id,
      details: `User ${currentUser.name} logged out of active session`,
    });
    setIsAuthenticated(false);
  };

  const loadPrescriptionToPOSCart = (rx: Prescription) => {
    setPendingPrescriptionForPOS(rx);
    addAuditLog({
      module: 'prescriptions',
      action: 'RX_LOAD_TO_CART',
      recordId: rx.id,
      details: `Prescription ${rx.prescriptionNumber} loaded into POS checkout cart by ${currentUser.name} (${currentUser.role})`,
    });
  };

  const switchUserRole = (role: UserRole) => {
    const matchedUser = users.find(u => u.role === role && u.isActive) || users.find(u => u.role === role);
    if (matchedUser) {
      setCurrentUser(matchedUser);
      setIsAuthenticated(true);
      addAuditLog({
        module: 'auth',
        action: 'ROLE_SWITCH',
        details: `Switched active session to user ${matchedUser.name} (${matchedUser.role})`,
      });
    }
  };

  const addUser = (userData: Omit<User, 'id' | 'createdAt'>) => {
    const newUser: User = {
      ...userData,
      id: `usr-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setUsers(prev => [...prev, newUser]);
    syncDoc(FirestoreCollections.USERS, newUser.id, newUser).catch(console.error);

    addAuditLog({
      module: 'users',
      action: 'USER_CREATE',
      recordId: newUser.id,
      details: `Created new user ${newUser.name} with role ${newUser.role}`,
    });
  };

  const updateUser = (id: string, updated: Partial<User>) => {
    setUsers(prev =>
      prev.map(u => {
        if (u.id === id) {
          const updatedUser = { ...u, ...updated };
          syncDoc(FirestoreCollections.USERS, id, updatedUser).catch(console.error);
          return updatedUser;
        }
        return u;
      })
    );
    if (currentUser.id === id) {
      setCurrentUser(prev => ({ ...prev, ...updated }));
    }
    addAuditLog({
      module: 'users',
      action: 'USER_UPDATE',
      recordId: id,
      details: `Updated user profile for ID ${id}`,
    });
  };

  const deleteUser = (id: string) => {
    const target = users.find(u => u.id === id);
    if (!target) return;
    setUsers(prev => prev.filter(u => u.id !== id));
    deleteDocFromFirestore(FirestoreCollections.USERS, id).catch(console.error);

    addAuditLog({
      module: 'users',
      action: 'USER_DELETE',
      recordId: id,
      details: `Deleted user ${target.name} (${target.username})`,
    });
  };

  const toggleUserStatus = (id: string) => {
    setUsers(prev =>
      prev.map(u => {
        if (u.id === id) {
          const nextStatus = !u.isActive;
          const updatedUser = { ...u, isActive: nextStatus };
          syncDoc(FirestoreCollections.USERS, id, updatedUser).catch(console.error);

          addAuditLog({
            module: 'users',
            action: 'USER_STATUS_CHANGE',
            recordId: id,
            details: `${nextStatus ? 'Activated' : 'Deactivated'} user ${u.name}`,
          });
          return updatedUser;
        }
        return u;
      })
    );
  };

  const resetUserPassword = (userId: string, newDefaultPassword?: string, forceChangeOnLogin: boolean = true) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const assignedPassword = newDefaultPassword || 'Pharmacy@123';
    const updatedUser = {
      ...targetUser,
      password: assignedPassword,
      mustChangePasswordOnLogin: forceChangeOnLogin,
    };
    syncDoc(FirestoreCollections.USERS, userId, updatedUser).catch(console.error);

    setUsers(prev =>
      prev.map(u => (u.id === userId ? updatedUser : u))
    );

    if (currentUser.id === userId) {
      setCurrentUser(prev => ({
        ...prev,
        password: assignedPassword,
        mustChangePasswordOnLogin: forceChangeOnLogin,
      }));
    }

    addAuditLog({
      module: 'users',
      action: 'ADMIN_RESET_PASSWORD',
      recordId: userId,
      details: `Administrator reset password for user ${targetUser.name} (${targetUser.username}). Force change on login: ${forceChangeOnLogin ? 'YES' : 'NO'}.`,
    });
  };

  const updateUserCustomPermissions = (userId: string, customPermissions: Partial<Record<PermissionKey, boolean>>) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;

    const updatedUser = {
      ...targetUser,
      customPermissions,
    };
    syncDoc(FirestoreCollections.USERS, userId, updatedUser).catch(console.error);

    setUsers(prev =>
      prev.map(u => (u.id === userId ? updatedUser : u))
    );

    if (currentUser.id === userId) {
      setCurrentUser(prev => ({
        ...prev,
        customPermissions,
      }));
    }

    addAuditLog({
      module: 'users',
      action: 'UPDATE_CUSTOM_USER_PERMISSIONS',
      recordId: userId,
      details: `Administrator updated individual access permissions for user ${targetUser.name} (${targetUser.username}).`,
    });
  };

  const forceChangePasswordOnFirstLogin = (newPassword: string) => {
    const updatedUser = {
      ...currentUser,
      password: newPassword,
      mustChangePasswordOnLogin: false,
    };
    syncDoc(FirestoreCollections.USERS, currentUser.id, updatedUser).catch(console.error);

    setUsers(prev =>
      prev.map(u => (u.id === currentUser.id ? updatedUser : u))
    );

    setCurrentUser(updatedUser);

    addAuditLog({
      module: 'auth',
      action: 'FIRST_LOGIN_PASSWORD_CHANGED',
      recordId: currentUser.id,
      details: `User ${currentUser.name} successfully set a personalized password upon first login requirement.`,
    });
  };

  const changeMyPassword = (newPassword: string) => {
    const updatedUser = {
      ...currentUser,
      password: newPassword,
      mustChangePasswordOnLogin: false,
    };
    syncDoc(FirestoreCollections.USERS, currentUser.id, updatedUser).catch(console.error);

    setUsers(prev =>
      prev.map(u => (u.id === currentUser.id ? updatedUser : u))
    );

    setCurrentUser(updatedUser);

    addAuditLog({
      module: 'auth',
      action: 'USER_PASSWORD_CHANGE',
      recordId: currentUser.id,
      details: `User ${currentUser.name} updated account password securely.`,
    });
  };

  // Settings
  const updateSettings = (newSettings: Partial<PharmacySettings>) => {
    const updated = { ...settings, ...newSettings };
    setSettings(updated);
    syncDoc(FirestoreCollections.SETTINGS, 'global', updated).catch(console.error);

    addAuditLog({
      module: 'settings',
      action: 'SETTINGS_UPDATE',
      details: 'Updated pharmacy configuration settings',
    });
  };

  // Medicine Management
  const addMedicine = (medData: Omit<Medicine, 'id' | 'createdAt' | 'updatedAt'>): string => {
    const newId = `med-${Date.now()}`;
    const newMed: Medicine = {
      ...medData,
      id: newId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setMedicines(prev => [newMed, ...prev]);
    syncDoc(FirestoreCollections.MEDICINES, newId, newMed).catch(console.error);

    addAuditLog({
      module: 'medicines',
      action: 'MEDICINE_ADD',
      recordId: newId,
      details: `Registered new medicine: ${newMed.name} (${newMed.code})`,
    });
    return newId;
  };

  const updateMedicine = (id: string, medData: Partial<Medicine>) => {
    setMedicines(prev =>
      prev.map(m => {
        if (m.id === id) {
          const updatedMed = { ...m, ...medData, updatedAt: new Date().toISOString() };
          syncDoc(FirestoreCollections.MEDICINES, id, updatedMed).catch(console.error);
          return updatedMed;
        }
        return m;
      })
    );
    addAuditLog({
      module: 'medicines',
      action: 'MEDICINE_UPDATE',
      recordId: id,
      details: `Updated medicine details for ID ${id}`,
    });
  };

  const deleteMedicine = (id: string) => {
    const target = medicines.find(m => m.id === id);
    if (!target) return;
    setMedicines(prev => prev.filter(m => m.id !== id));
    deleteDocFromFirestore(FirestoreCollections.MEDICINES, id).catch(console.error);

    addAuditLog({
      module: 'medicines',
      action: 'MEDICINE_DELETE',
      recordId: id,
      details: `Removed medicine ${target.name} (${target.code})`,
    });
  };

  // Categories
  const addCategory = (name: string, description?: string) => {
    const newCat: Category = {
      id: `cat-${Date.now()}`,
      name,
      description,
    };
    setCategories(prev => [...prev, newCat]);
    syncDoc(FirestoreCollections.CATEGORIES, newCat.id, newCat).catch(console.error);

    addAuditLog({
      module: 'medicines',
      action: 'CATEGORY_ADD',
      recordId: newCat.id,
      details: `Created category: ${name}`,
    });
  };

  const updateCategory = (id: string, name: string, description?: string) => {
    setCategories(prev =>
      prev.map(c => {
        if (c.id === id) {
          const updatedCat = { ...c, name, description };
          syncDoc(FirestoreCollections.CATEGORIES, id, updatedCat).catch(console.error);
          return updatedCat;
        }
        return c;
      })
    );
    addAuditLog({
      module: 'medicines',
      action: 'CATEGORY_UPDATE',
      recordId: id,
      details: `Updated category ${name}`,
    });
  };

  const deleteCategory = (id: string) => {
    setCategories(prev => prev.filter(c => c.id !== id));
    deleteDocFromFirestore(FirestoreCollections.CATEGORIES, id).catch(console.error);

    addAuditLog({
      module: 'medicines',
      action: 'CATEGORY_DELETE',
      recordId: id,
      details: `Deleted category ID ${id}`,
    });
  };

  // Batches
  const addBatch = (batchData: Omit<MedicineBatch, 'id' | 'createdAt'>) => {
    const newBatch: MedicineBatch = {
      ...batchData,
      id: `bat-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setBatches(prev => [newBatch, ...prev]);
    syncDoc(FirestoreCollections.BATCHES, newBatch.id, newBatch).catch(console.error);

    addAuditLog({
      module: 'batches',
      action: 'BATCH_ADD',
      recordId: newBatch.id,
      details: `Added batch ${newBatch.batchNumber} with ${newBatch.quantityReceived} units (Expires: ${newBatch.expiryDate})`,
    });
  };

  const updateBatch = (id: string, batchData: Partial<MedicineBatch>) => {
    setBatches(prev =>
      prev.map(b => {
        if (b.id === id) {
          const updatedBatch = { ...b, ...batchData };
          syncDoc(FirestoreCollections.BATCHES, id, updatedBatch).catch(console.error);
          return updatedBatch;
        }
        return b;
      })
    );
    addAuditLog({
      module: 'batches',
      action: 'BATCH_UPDATE',
      recordId: id,
      details: `Updated batch ${id}`,
    });
  };

  const deleteBatch = (id: string) => {
    setBatches(prev => prev.filter(b => b.id !== id));
    deleteDocFromFirestore(FirestoreCollections.BATCHES, id).catch(console.error);

    addAuditLog({
      module: 'batches',
      action: 'BATCH_DELETE',
      recordId: id,
      details: `Removed batch ID ${id}`,
    });
  };

  // Stock Adjustments
  const adjustStock = (adjData: Omit<StockAdjustment, 'id' | 'createdAt'>) => {
    const newAdjustment: StockAdjustment = {
      ...adjData,
      id: `adj-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };

    // Update batch quantity
    setBatches(prev =>
      prev.map(b => {
        if (b.id === adjData.batchId) {
          const updatedQty = Math.max(0, b.remainingQuantity + adjData.adjustmentQuantity);
          const updatedBatch = { ...b, remainingQuantity: updatedQty };
          syncDoc(FirestoreCollections.BATCHES, b.id, updatedBatch).catch(console.error);
          return updatedBatch;
        }
        return b;
      })
    );

    setStockAdjustments(prev => [newAdjustment, ...prev]);
    syncDoc(FirestoreCollections.STOCK_ADJUSTMENTS, newAdjustment.id, newAdjustment).catch(console.error);

    addAuditLog({
      module: 'inventory_adjustments',
      action: 'STOCK_ADJUSTMENT',
      recordId: newAdjustment.id,
      details: `Stock adjusted for ${adjData.medicineName} (Batch ${adjData.batchNumber}): ${adjData.adjustmentQuantity > 0 ? '+' : ''}${adjData.adjustmentQuantity} units. Reason: ${adjData.reason}. Note: ${adjData.notes || 'N/A'}`,
    });
  };

  // Suppliers
  const addSupplier = (supplierData: Omit<Supplier, 'id' | 'createdAt'>) => {
    const newSup: Supplier = {
      ...supplierData,
      id: `sup-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setSuppliers(prev => [...prev, newSup]);
    syncDoc(FirestoreCollections.SUPPLIERS, newSup.id, newSup).catch(console.error);

    addAuditLog({
      module: 'suppliers',
      action: 'SUPPLIER_ADD',
      recordId: newSup.id,
      details: `Registered supplier: ${newSup.name}`,
    });
  };

  const updateSupplier = (id: string, supplierData: Partial<Supplier>) => {
    setSuppliers(prev =>
      prev.map(s => {
        if (s.id === id) {
          const updatedSup = { ...s, ...supplierData };
          syncDoc(FirestoreCollections.SUPPLIERS, id, updatedSup).catch(console.error);
          return updatedSup;
        }
        return s;
      })
    );
    addAuditLog({
      module: 'suppliers',
      action: 'SUPPLIER_UPDATE',
      recordId: id,
      details: `Updated supplier details for ID ${id}`,
    });
  };

  const deleteSupplier = (id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
    deleteDocFromFirestore(FirestoreCollections.SUPPLIERS, id).catch(console.error);

    addAuditLog({
      module: 'suppliers',
      action: 'SUPPLIER_DELETE',
      recordId: id,
      details: `Deleted supplier ID ${id}`,
    });
  };

  // Purchase Orders
  const createPurchaseOrder = (poData: Omit<PurchaseOrder, 'id' | 'createdAt' | 'poNumber'>): PurchaseOrder => {
    const count = purchaseOrders.length + 1;
    const poNumber = `PO-${new Date().getFullYear()}-${String(count).padStart(4, '0')}`;
    
    const sanitizedItems = (poData.items || []).map(item => {
      const qty = Number(item.quantityOrdered || item.quantity || 1);
      const cost = Number(item.unitCost || 0);
      return {
        ...item,
        quantityOrdered: qty,
        unitCost: cost,
        totalCost: Number(item.totalCost) || (qty * cost),
      };
    });
    const calculatedTotal = sanitizedItems.reduce((s, i) => s + (Number(i.totalCost) || 0), 0);
    const totalAmount = isNaN(Number(poData.totalAmount)) ? calculatedTotal : Number(poData.totalAmount);

    const newPO: PurchaseOrder = {
      ...poData,
      id: `po-${Date.now()}`,
      poNumber,
      items: sanitizedItems,
      totalAmount: Math.max(0, totalAmount),
      subtotal: Math.max(0, totalAmount),
      status: poData.status || 'pending',
      createdAt: new Date().toISOString(),
    };
    setPurchaseOrders(prev => [newPO, ...prev]);
    syncDoc(FirestoreCollections.PURCHASE_ORDERS, newPO.id, newPO).catch(console.error);

    addAuditLog({
      module: 'purchases',
      action: 'PURCHASE_ORDER_CREATE',
      recordId: newPO.id,
      details: `Created Purchase Order ${newPO.poNumber} for supplier ${newPO.supplierName} (${settings.currencySymbol}${safeFixed(newPO.totalAmount)})`,
    });
    return newPO;
  };

  const updatePurchaseOrder = (id: string, poData: Partial<PurchaseOrder>) => {
    const existing = purchaseOrders.find(p => p.id === id);
    if (!existing) return;
    if (existing.isApproved || existing.status === 'approved' || existing.status === 'received') {
      alert('Approved or received purchase orders cannot be modified.');
      return;
    }

    const sanitizedItems = poData.items ? poData.items.map(item => {
      const qty = Number(item.quantityOrdered || item.quantity || 1);
      const cost = Number(item.unitCost || 0);
      return {
        ...item,
        quantityOrdered: qty,
        unitCost: cost,
        totalCost: Number(item.totalCost) || (qty * cost),
      };
    }) : existing.items;
    const calculatedTotal = sanitizedItems.reduce((s, i) => s + (Number(i.totalCost) || 0), 0);
    const totalAmount = poData.totalAmount !== undefined && !isNaN(Number(poData.totalAmount))
      ? Number(poData.totalAmount)
      : calculatedTotal;

    const updatedPO: PurchaseOrder = {
      ...existing,
      ...poData,
      items: sanitizedItems,
      subtotal: Math.max(0, totalAmount),
      totalAmount: Math.max(0, totalAmount),
    };

    setPurchaseOrders(prev => prev.map(p => (p.id === id ? updatedPO : p)));
    syncDoc(FirestoreCollections.PURCHASE_ORDERS, id, updatedPO).catch(console.error);

    addAuditLog({
      module: 'purchases',
      action: 'PURCHASE_ORDER_UPDATE',
      recordId: updatedPO.poNumber,
      details: `Edited Purchase Order ${updatedPO.poNumber} (Supplier: ${updatedPO.supplierName})`,
    });
  };

  const approvePurchaseOrder = (id: string, adminName: string) => {
    const existing = purchaseOrders.find(p => p.id === id);
    if (!existing) return;

    const approvedPO: PurchaseOrder = {
      ...existing,
      status: 'approved',
      isApproved: true,
      approvedBy: adminName,
      approvedAt: new Date().toISOString(),
    };

    setPurchaseOrders(prev => prev.map(p => (p.id === id ? approvedPO : p)));
    syncDoc(FirestoreCollections.PURCHASE_ORDERS, id, approvedPO).catch(console.error);

    addAuditLog({
      module: 'purchases',
      action: 'PURCHASE_ORDER_APPROVE',
      recordId: approvedPO.poNumber,
      details: `Administrator/Pharmacist (${adminName}) approved Purchase Order ${approvedPO.poNumber}`,
    });
  };

  const receivePurchaseOrder = (
    poId: string,
    notes?: string,
    customBatches?: Record<string, { batchNumber: string; manufacturingDate: string; expiryDate: string; quantityReceived: number }>
  ): { success: boolean; error?: string } => {
    const po = purchaseOrders.find(p => p.id === poId);
    if (!po) return { success: false, error: 'Purchase order not found.' };
    if (po.status === 'received') return { success: false, error: 'Purchase order has already been received into store inventory.' };

    // Strictly enforce PO approval before receiving inventory stock
    if (!po.isApproved && po.status !== 'approved') {
      return {
        success: false,
        error: `Cannot receive stock: Purchase Order ${po.poNumber} is awaiting approval from the System Administrator or Head Pharmacist.`
      };
    }

    // Automatically create or update batches for each item in the purchase order
    po.items.forEach(item => {
      const customItem = customBatches ? customBatches[item.id] : undefined;
      const batchNo = (customItem?.batchNumber || item.batchNumber || `BATCH-INB-${Math.floor(1000 + Math.random() * 9000)}`).trim();
      const qtyReceived = Number(customItem?.quantityReceived ?? (item.quantityReceived || item.quantityOrdered || item.quantity || 1));
      const mfgDate = customItem?.manufacturingDate || item.manufacturingDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      const expDate = customItem?.expiryDate || item.expiryDate || new Date(Date.now() + 540 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

      const existingBatch = batches.find(
        b => b.medicineId === item.medicineId && b.batchNumber && b.batchNumber.toLowerCase() === batchNo.toLowerCase()
      );

      if (existingBatch) {
        setBatches(prev =>
          prev.map(b => {
            if (b.id === existingBatch.id) {
              const updatedB = {
                ...b,
                quantityReceived: b.quantityReceived + qtyReceived,
                remainingQuantity: b.remainingQuantity + qtyReceived,
                purchasePrice: item.unitCost,
                expiryDate: expDate || b.expiryDate,
                manufacturingDate: mfgDate || b.manufacturingDate,
              };
              syncDoc(FirestoreCollections.BATCHES, b.id, updatedB).catch(console.error);
              return updatedB;
            }
            return b;
          })
        );
      } else {
        const targetMed = medicines.find(m => m.id === item.medicineId);
        const sellingPrice = targetMed ? targetMed.sellingPrice : (item.unitCost * 1.5);
        const newBatch: MedicineBatch = {
          id: `bat-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
          medicineId: item.medicineId,
          batchNumber: batchNo,
          supplierId: po.supplierId,
          supplierName: po.supplierName,
          manufacturingDate: mfgDate,
          expiryDate: expDate,
          quantityReceived: qtyReceived,
          remainingQuantity: qtyReceived,
          purchasePrice: item.unitCost,
          sellingPrice,
          createdAt: new Date().toISOString(),
        };
        setBatches(prev => [newBatch, ...prev]);
        syncDoc(FirestoreCollections.BATCHES, newBatch.id, newBatch).catch(console.error);
      }
    });

    const updatedPO: PurchaseOrder = {
      ...po,
      status: 'received' as const,
      isApproved: true,
      receivedBy: currentUser.name,
      receivedAt: new Date().toISOString(),
      notes: notes || po.notes,
    };

    setPurchaseOrders(prev =>
      prev.map(p => (p.id === poId ? updatedPO : p))
    );
    syncDoc(FirestoreCollections.PURCHASE_ORDERS, poId, updatedPO).catch(console.error);

    addAuditLog({
      module: 'purchases',
      action: 'PURCHASE_ORDER_RECEIVE',
      recordId: po.poNumber,
      details: `Received all stock for approved PO ${po.poNumber} (${po.items.length} line items) into store inventory. Batches and FEFO queues synchronized.`,
    });

    addNotification({
      title: `Stock Committed to Inventory • ${po.poNumber}`,
      message: `Purchase Order ${po.poNumber} from ${po.supplierName} has been committed to store inventory by ${currentUser.name}. Stock is now available in POS.`,
      type: 'success',
      module: 'inventory',
      linkTab: 'inventory',
    });

    return { success: true };
  };

  const updatePurchaseOrderStatus = (poId: string, status: PurchaseOrder['status']) => {
    setPurchaseOrders(prev =>
      prev.map(p => {
        if (p.id === poId) {
          const updated = { ...p, status };
          syncDoc(FirestoreCollections.PURCHASE_ORDERS, poId, updated).catch(console.error);
          return updated;
        }
        return p;
      })
    );
  };

  // Customers
  const addCustomer = (custData: Omit<Customer, 'id' | 'createdAt' | 'totalPurchases'>): Customer => {
    const newCust: Customer = {
      ...custData,
      id: `cust-${Date.now()}`,
      totalPurchases: 0,
      createdAt: new Date().toISOString(),
    };
    setCustomers(prev => [...prev, newCust]);
    syncDoc(FirestoreCollections.CUSTOMERS, newCust.id, newCust).catch(console.error);

    addAuditLog({
      module: 'customers',
      action: 'CUSTOMER_ADD',
      recordId: newCust.id,
      details: `Registered customer/patient: ${newCust.name}`,
    });
    return newCust;
  };

  const updateCustomer = (id: string, custData: Partial<Customer>) => {
    setCustomers(prev =>
      prev.map(c => {
        if (c.id === id) {
          const updated = { ...c, ...custData };
          syncDoc(FirestoreCollections.CUSTOMERS, id, updated).catch(console.error);
          return updated;
        }
        return c;
      })
    );
    addAuditLog({
      module: 'customers',
      action: 'CUSTOMER_UPDATE',
      recordId: id,
      details: `Updated customer details for ID ${id}`,
    });
  };

  const deleteCustomer = (id: string) => {
    setCustomers(prev => prev.filter(c => c.id !== id));
    deleteDocFromFirestore(FirestoreCollections.CUSTOMERS, id).catch(console.error);

    addAuditLog({
      module: 'customers',
      action: 'CUSTOMER_DELETE',
      recordId: id,
      details: `Deleted customer ID ${id}`,
    });
  };

  // Prescriptions
  const createPrescription = (rxData: Omit<Prescription, 'id' | 'createdAt' | 'prescriptionNumber'>): Prescription => {
    const count = prescriptions.length + 101;
    const prescriptionNumber = `RX-${new Date().getFullYear()}-${String(count).padStart(5, '0')}`;
    const newRx: Prescription = {
      ...rxData,
      id: `rx-${Date.now()}`,
      prescriptionNumber,
      createdAt: new Date().toISOString(),
    };
    setPrescriptions(prev => [newRx, ...prev]);
    syncDoc(FirestoreCollections.PRESCRIPTIONS, newRx.id, newRx).catch(console.error);

    addAuditLog({
      module: 'prescriptions',
      action: 'PRESCRIPTION_CREATE',
      recordId: newRx.prescriptionNumber,
      details: `Created prescription ${newRx.prescriptionNumber} for patient ${newRx.customerName} by ${newRx.doctorName}`,
    });
    return newRx;
  };

  const updatePrescription = (id: string, rxData: Partial<Prescription>) => {
    setPrescriptions(prev =>
      prev.map(r => {
        if (r.id === id) {
          const updated = { ...r, ...rxData };
          syncDoc(FirestoreCollections.PRESCRIPTIONS, id, updated).catch(console.error);
          return updated;
        }
        return r;
      })
    );
    addAuditLog({
      module: 'prescriptions',
      action: 'PRESCRIPTION_UPDATE',
      recordId: id,
      details: `Updated prescription ID ${id}`,
    });
  };

  const dispensePrescription = (id: string, pharmacistName: string) => {
    setPrescriptions(prev =>
      prev.map(r => {
        if (r.id === id) {
          const updatedItems = r.items.map(item => ({ ...item, quantityDispensed: item.quantityPrescribed }));
          const updatedRx = {
            ...r,
            status: 'dispensed' as const,
            dispensedBy: pharmacistName,
            dispensedAt: new Date().toISOString(),
            items: updatedItems,
          };
          syncDoc(FirestoreCollections.PRESCRIPTIONS, id, updatedRx).catch(console.error);
          return updatedRx;
        }
        return r;
      })
    );
    addAuditLog({
      module: 'prescriptions',
      action: 'PRESCRIPTION_DISPENSE',
      recordId: id,
      details: `Prescription ${id} verified and marked dispensed by ${pharmacistName}`,
    });
  };

  // Sales and POS
  const processSale = (saleData: Omit<Sale, 'id' | 'invoiceNumber' | 'createdAt'>): { success: boolean; sale?: Sale; error?: string } => {
    const now = new Date();
    // 1. Validate items and check stock & expiry
    for (const item of saleData.items) {
      const batch = batches.find(b => b.id === item.batchId);
      if (!batch) {
        return { success: false, error: `Batch for item "${item.medicineName}" not found.` };
      }
      // Check expiry
      if (new Date(batch.expiryDate) <= now) {
        return { success: false, error: `Batch ${batch.batchNumber} of "${item.medicineName}" is EXPIRED on ${batch.expiryDate}. Sales of expired drugs are prohibited.` };
      }
      // Check quantity
      if (!settings.allowNegativeStock && batch.remainingQuantity < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock in batch ${batch.batchNumber} for "${item.medicineName}". Requested: ${item.quantity}, Available: ${batch.remainingQuantity}.`,
        };
      }
    }

    // 2. Generate invoice number
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceCount = sales.length + 1;
    const invoiceNumber = `INV-${dateStr}-${String(invoiceCount).padStart(3, '0')}`;

    const newSale: Sale = {
      ...saleData,
      id: `sale-${Date.now()}`,
      invoiceNumber,
      dispenseStatus: saleData.dispenseStatus || 'finally_dispensed',
      createdAt: now.toISOString(),
    };

    // 3. Deduct stock from specific batches
    setBatches(prev =>
      prev.map(b => {
        const itemSold = saleData.items.find(item => item.batchId === b.id);
        if (itemSold) {
          const updatedB = {
            ...b,
            remainingQuantity: Math.max(0, b.remainingQuantity - itemSold.quantity),
          };
          syncDoc(FirestoreCollections.BATCHES, b.id, updatedB).catch(console.error);
          return updatedB;
        }
        return b;
      })
    );

    // 4. Update customer total purchases if customer exists
    if (saleData.customerId) {
      setCustomers(prev =>
        prev.map(c => {
          if (c.id === saleData.customerId) {
            const updatedC = { ...c, totalPurchases: (c.totalPurchases || 0) + newSale.grandTotal };
            syncDoc(FirestoreCollections.CUSTOMERS, c.id, updatedC).catch(console.error);
            return updatedC;
          }
          return c;
        })
      );
    }

    // 5. Update linked prescription if any
    if (saleData.prescriptionId) {
      dispensePrescription(saleData.prescriptionId, saleData.pharmacistName || currentUser.name);
    }

    // 6. Record sale
    setSales(prev => [newSale, ...prev]);
    syncDoc(FirestoreCollections.SALES, newSale.id, newSale).catch(console.error);

    // 7. Audit log
    addAuditLog({
      module: 'pos_sales',
      action: 'SALE_COMPLETED',
      recordId: newSale.invoiceNumber,
      details: `Completed sale ${newSale.invoiceNumber} (${safeFixed(newSale.grandTotal)}) for ${newSale.customerName} via ${newSale.paymentMethod}`,
    });

    return { success: true, sale: newSale };
  };

  // Dispensing Assistant creates pending order for cashier
  const createDispensingOrder = (orderData: {
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
    notes?: string;
  }): { success: boolean; sale?: Sale; error?: string } => {
    const now = new Date();
    // Validate stock and expiry
    for (const item of orderData.items) {
      const batch = batches.find(b => b.id === item.batchId);
      if (!batch) {
        return { success: false, error: `Batch for item "${item.medicineName}" not found.` };
      }
      if (new Date(batch.expiryDate) <= now) {
        return { success: false, error: `Batch ${batch.batchNumber} of "${item.medicineName}" is EXPIRED.` };
      }
      if (!settings.allowNegativeStock && batch.remainingQuantity < item.quantity) {
        return {
          success: false,
          error: `Insufficient stock in batch ${batch.batchNumber} for "${item.medicineName}". Requested: ${item.quantity}, Available: ${batch.remainingQuantity}.`,
        };
      }
    }

    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const invoiceCount = sales.length + 1;
    const invoiceNumber = `INV-${dateStr}-${String(invoiceCount).padStart(3, '0')}`;

    const newSale: Sale = {
      id: `disp-order-${Date.now()}`,
      invoiceNumber,
      customerId: orderData.customerId,
      customerName: orderData.customerName || 'Walk-in Patient',
      customerPhone: orderData.customerPhone,
      prescriptionId: orderData.prescriptionId,
      prescriptionNumber: orderData.prescriptionNumber,
      items: orderData.items,
      subtotal: orderData.subtotal,
      discountTotal: orderData.discountTotal,
      taxRate: orderData.taxRate,
      taxAmount: orderData.taxAmount,
      grandTotal: orderData.grandTotal,
      paymentMethod: 'cash',
      amountTendered: 0,
      changeGiven: 0,
      cashierId: '',
      cashierName: 'Pending Cashier Payment',
      preparedById: currentUser.id,
      preparedByName: currentUser.name,
      dispenseStatus: 'awaiting_payment',
      status: 'completed',
      notes: orderData.notes,
      createdAt: now.toISOString(),
    };

    setSales(prev => [newSale, ...prev]);
    syncDoc(FirestoreCollections.SALES, newSale.id, newSale).catch(console.error);

    addAuditLog({
      module: 'pos_sales',
      action: 'DISPENSING_ORDER_CREATED',
      recordId: newSale.invoiceNumber,
      details: `Dispensing Assistant ${currentUser.name} verified stock & prepared cart ${newSale.invoiceNumber} for ${newSale.customerName} (${safeFixed(newSale.grandTotal)}). Queued for Cashier payment.`,
    });

    return { success: true, sale: newSale };
  };

  // Cashier receives money and prints receipt
  const completeCashierPayment = (
    saleId: string,
    paymentData: {
      paymentMethod: PaymentMethod;
      amountTendered: number;
      changeGiven: number;
      notes?: string;
    }
  ): { success: boolean; sale?: Sale; error?: string } => {
    // Security restriction: Dispensing Assistant must not be able to receive payment
    if (currentUser.role === 'dispensing_assistant' || !hasPermission('receive_payment')) {
      return {
        success: false,
        error: 'Security Policy: Dispensing Assistants are not authorized to collect payments. Cashier or Admin required.',
      };
    }

    const saleIndex = sales.findIndex(s => s.id === saleId || s.invoiceNumber === saleId);
    if (saleIndex === -1) {
      return { success: false, error: 'Sale record not found.' };
    }

    const targetSale = sales[saleIndex];
    if (targetSale.dispenseStatus !== 'awaiting_payment') {
      return { success: false, error: `This order is already marked as ${targetSale.dispenseStatus}.` };
    }

    // Verify stock availability
    for (const item of targetSale.items) {
      const batch = batches.find(b => b.id === item.batchId);
      if (!batch || (!settings.allowNegativeStock && batch.remainingQuantity < item.quantity)) {
        return { success: false, error: `Stock unavailable for "${item.medicineName}" during checkout.` };
      }
    }

    // Deduct stock
    setBatches(prev =>
      prev.map(b => {
        const itemSold = targetSale.items.find(item => item.batchId === b.id);
        if (itemSold) {
          const updatedB = {
            ...b,
            remainingQuantity: Math.max(0, b.remainingQuantity - itemSold.quantity),
          };
          syncDoc(FirestoreCollections.BATCHES, b.id, updatedB).catch(console.error);
          return updatedB;
        }
        return b;
      })
    );

    // Update customer total purchases
    if (targetSale.customerId) {
      setCustomers(prev =>
        prev.map(c => {
          if (c.id === targetSale.customerId) {
            const updatedC = { ...c, totalPurchases: (c.totalPurchases || 0) + targetSale.grandTotal };
            syncDoc(FirestoreCollections.CUSTOMERS, c.id, updatedC).catch(console.error);
            return updatedC;
          }
          return c;
        })
      );
    }

    const updatedSale: Sale = {
      ...targetSale,
      paymentMethod: paymentData.paymentMethod,
      amountTendered: paymentData.amountTendered,
      changeGiven: paymentData.changeGiven,
      cashierId: currentUser.id,
      cashierName: currentUser.name,
      dispenseStatus: 'paid_awaiting_dispense',
      notes: paymentData.notes ? `${targetSale.notes || ''} | Cashier: ${paymentData.notes}` : targetSale.notes,
    };

    setSales(prev => prev.map((s, i) => (i === saleIndex ? updatedSale : s)));
    syncDoc(FirestoreCollections.SALES, updatedSale.id, updatedSale).catch(console.error);

    // Send direct payment notification to the user/dispensing assistant who prepared the order
    const preparingStaff = updatedSale.preparedByName || 'Dispensing Assistant';
    addNotification({
      title: `Payment Received • Order #${updatedSale.invoiceNumber}`,
      message: `Payment of ${settings.currencySymbol}${safeFixed(updatedSale.grandTotal)} for customer ${updatedSale.customerName} has been received by Cashier ${currentUser.name}. ${preparingStaff}: You may now dispense the medicines.`,
      type: 'success',
      module: 'pos',
      linkTab: 'pos',
    });

    addAuditLog({
      module: 'pos_sales',
      action: 'CASHIER_PAYMENT_RECEIVED',
      recordId: updatedSale.invoiceNumber,
      details: `Cashier ${currentUser.name} received payment (${safeFixed(updatedSale.grandTotal)}) for ${updatedSale.invoiceNumber} from ${updatedSale.customerName} via ${paymentData.paymentMethod}. Printed official receipt. Ready for final dispensing.`,
    });

    return { success: true, sale: updatedSale };
  };

  // Dispensing Assistant finally hands over and dispenses the medications
  const finallyDispenseSale = (
    saleId: string,
    dispenserName?: string
  ): { success: boolean; sale?: Sale; error?: string } => {
    const saleIndex = sales.findIndex(s => s.id === saleId || s.invoiceNumber === saleId);
    if (saleIndex === -1) {
      return { success: false, error: 'Sale record not found.' };
    }

    const targetSale = sales[saleIndex];
    if (targetSale.dispenseStatus === 'finally_dispensed') {
      return { success: false, error: 'This order has already been dispensed.' };
    }

    if (targetSale.dispenseStatus === 'awaiting_payment') {
      return { success: false, error: 'Cannot dispense before customer completes payment with Cashier.' };
    }

    // Security restriction: Cashier should not be able to confirm & finally dispense if he is not the one that added medicine to cart
    if (currentUser.role === 'cashier') {
      const wasPreparedBySelf = (targetSale.preparedById && targetSale.preparedById === currentUser.id) ||
                                (targetSale.preparedByName && targetSale.preparedByName === currentUser.name);
      if (!wasPreparedBySelf) {
        return {
          success: false,
          error: `Security Policy: Cashier ${currentUser.name} cannot finally dispense this order because it was prepared by ${targetSale.preparedByName || 'a Dispensing Assistant'}. Cashiers may only dispense orders they personally prepared.`,
        };
      }
    }

    const finalDispenser = dispenserName || currentUser.name;
    const nowStr = new Date().toISOString();

    const updatedSale: Sale = {
      ...targetSale,
      dispenseStatus: 'finally_dispensed',
      dispensedById: currentUser.id,
      dispensedByName: finalDispenser,
      dispensedAt: nowStr,
    };

    // If linked to prescription, mark prescription as dispensed
    if (targetSale.prescriptionId) {
      dispensePrescription(targetSale.prescriptionId, finalDispenser);
    }

    setSales(prev => prev.map((s, i) => (i === saleIndex ? updatedSale : s)));
    syncDoc(FirestoreCollections.SALES, updatedSale.id, updatedSale).catch(console.error);

    addAuditLog({
      module: 'pos_sales',
      action: 'FINAL_DISPENSE_COMPLETED',
      recordId: updatedSale.invoiceNumber,
      details: `Dispenser ${finalDispenser} verified paid receipt ${updatedSale.invoiceNumber} and finally handed over medications to patient ${updatedSale.customerName}.`,
    });

    return { success: true, sale: updatedSale };
  };

  // Cancel an unbilled order
  const cancelDispensingOrder = (saleId: string): { success: boolean; error?: string } => {
    const saleIndex = sales.findIndex(s => s.id === saleId || s.invoiceNumber === saleId);
    if (saleIndex === -1) return { success: false, error: 'Sale record not found.' };

    const targetSale = sales[saleIndex];
    if (targetSale.dispenseStatus !== 'awaiting_payment') {
      return { success: false, error: 'Only unpaid queue orders can be cancelled.' };
    }

    setSales(prev => prev.filter((_, i) => i !== saleIndex));
    deleteDocFromFirestore(FirestoreCollections.SALES, targetSale.id).catch(console.error);

    addAuditLog({
      module: 'pos_sales',
      action: 'DISPENSING_ORDER_CANCELLED',
      recordId: targetSale.invoiceNumber,
      details: `Cancelled unpaid dispensing order ${targetSale.invoiceNumber} for ${targetSale.customerName}.`,
    });

    return { success: true };
  };

  // Returns and Refunds
  const processReturn = (returnData: Omit<ReturnOrder, 'id' | 'returnNumber' | 'createdAt'>): { success: boolean; returnOrder?: ReturnOrder; error?: string } => {
    const returnCount = returns.length + 1;
    const returnNumber = `RET-${new Date().getFullYear()}-${String(returnCount).padStart(4, '0')}`;

    const newReturn: ReturnOrder = {
      ...returnData,
      id: `ret-${Date.now()}`,
      returnNumber,
      createdAt: new Date().toISOString(),
    };

    // If item condition is restockable, restore stock to batch
    returnData.items.forEach(item => {
      if (item.condition === 'restockable') {
        setBatches(prev =>
          prev.map(b => {
            if (b.id === item.batchId) {
              const updatedB = { ...b, remainingQuantity: b.remainingQuantity + item.quantity };
              syncDoc(FirestoreCollections.BATCHES, b.id, updatedB).catch(console.error);
              return updatedB;
            }
            return b;
          })
        );
      } else {
        // Record stock adjustment for damaged / expired return disposal
        adjustStock({
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          batchId: item.batchId,
          batchNumber: item.batchNumber,
          previousQuantity: 0,
          adjustmentQuantity: 0,
          newQuantity: 0,
          reason: 'customer_return_unusable',
          notes: `Return ${returnNumber}: Defective/Damaged item marked as write-off.`,
          authorizedBy: currentUser.id,
          authorizedByName: currentUser.name,
          date: new Date().toISOString().split('T')[0],
        });
      }
    });

    // Calculate refund amount for this return order
    const refundTotal = Number(
      returnData.totalRefundAmount ??
      returnData.totalRefund ??
      returnData.items.reduce((s, it) => s + (it.refundAmount ?? (it.quantity * it.unitPrice)), 0)
    );

    // Update sale refundedAmount and status (deduct refunded amount while retaining non-refunded amount in sales revenue)
    setSales(prev =>
      prev.map(s => {
        if (s.id === returnData.saleId || s.invoiceNumber === returnData.invoiceNumber) {
          const currentRefunded = Number(s.refundedAmount || 0);
          const newTotalRefunded = currentRefunded + refundTotal;
          const isFullRefund = newTotalRefunded >= s.grandTotal;
          const updatedSale: Sale = {
            ...s,
            refundedAmount: newTotalRefunded,
            status: isFullRefund ? ('refunded' as const) : ('partially_refunded' as const),
          };
          syncDoc(FirestoreCollections.SALES, s.id, updatedSale).catch(console.error);
          return updatedSale;
        }
        return s;
      })
    );

    setReturns(prev => [newReturn, ...prev]);
    syncDoc(FirestoreCollections.RETURNS, newReturn.id, newReturn).catch(console.error);

    addAuditLog({
      module: 'returns',
      action: 'RETURN_PROCESSED',
      recordId: returnNumber,
      details: `Processed return ${returnNumber} for invoice ${returnData.invoiceNumber}. Total refunded: ${settings.currencySymbol}${safeFixed(refundTotal)}. Reason: ${returnData.reason}`,
    });

    return { success: true, returnOrder: newReturn };
  };

  // Computed Alerts
  const lowStockMedicines = useMemo(() => {
    return medicines
      .map(med => {
        const currentStock = batches
          .filter(b => b.medicineId === med.id)
          .reduce((sum, b) => sum + (Number(b.remainingQuantity) || 0), 0);
        return { medicine: med, currentStock };
      })
      .filter(item => item.currentStock <= (Number(item.medicine.minimumStockLevel) || settings.lowStockThresholdDefault || 15));
  }, [medicines, batches, settings.lowStockThresholdDefault]);

  const nearExpiryBatches = useMemo(() => {
    const now = new Date();
    const thresholdDays = settings.nearExpiryThresholdDays || 60;
    const thresholdMs = thresholdDays * 24 * 60 * 60 * 1000;

    return batches
      .filter(b => b.remainingQuantity > 0)
      .map(b => {
        const exp = new Date(b.expiryDate);
        const diffMs = exp.getTime() - now.getTime();
        const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const med = medicines.find(m => m.id === b.medicineId);
        return { batch: b, medicine: med!, daysLeft };
      })
      .filter(item => item.medicine && item.daysLeft > 0 && item.daysLeft <= thresholdDays)
      .sort((a, b) => a.daysLeft - b.daysLeft);
  }, [batches, medicines, settings.nearExpiryThresholdDays]);

  const expiredBatches = useMemo(() => {
    const now = new Date();
    return batches
      .filter(b => b.remainingQuantity > 0)
      .map(b => {
        const exp = new Date(b.expiryDate);
        const diffMs = now.getTime() - exp.getTime();
        const daysPassed = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        const med = medicines.find(m => m.id === b.medicineId);
        return { batch: b, medicine: med!, daysPassed };
      })
      .filter(item => item.medicine && item.daysPassed >= 0)
      .sort((a, b) => b.daysPassed - a.daysPassed);
  }, [batches, medicines]);

  // Notifications dynamically generated from active system events + User Account activity notifications
  const notifications = useMemo(() => {
    const list: NotificationItem[] = [];

    // User activity notifications (e.g., POS Cart Additions, Account notices)
    userNotifications.forEach(un => {
      if (!dismissedNotificationIds.includes(un.id)) {
        list.push({
          ...un,
          isRead: un.isRead || readNotificationIds.includes(un.id),
        });
      }
    });

    // Expired warnings
    expiredBatches.forEach(item => {
      const notifId = `notif-exp-${item.batch.id}`;
      if (!dismissedNotificationIds.includes(notifId)) {
        list.push({
          id: notifId,
          title: `Expired Drug Alert: ${item.medicine.name}`,
          message: `Batch ${item.batch.batchNumber} has expired (${item.daysPassed} days ago). ${item.batch.remainingQuantity} units must be quarantined and destroyed.`,
          type: 'danger',
          module: 'expiry',
          isRead: readNotificationIds.includes(notifId),
          linkTab: 'inventory',
          createdAt: item.batch.createdAt,
        });
      }
    });

    // Near-expiry warnings
    nearExpiryBatches.forEach(item => {
      const notifId = `notif-nearexp-${item.batch.id}`;
      if (!dismissedNotificationIds.includes(notifId)) {
        list.push({
          id: notifId,
          title: `Near Expiry Warning: ${item.medicine.name}`,
          message: `Batch ${item.batch.batchNumber} will expire in ${item.daysLeft} days (${item.batch.expiryDate}). Prioritize via FEFO dispensing.`,
          type: 'warning',
          module: 'expiry',
          isRead: readNotificationIds.includes(notifId),
          linkTab: 'inventory',
          createdAt: item.batch.createdAt,
        });
      }
    });

    // Low stock warnings
    lowStockMedicines.forEach(item => {
      const notifId = `notif-low-${item.medicine.id}`;
      if (!dismissedNotificationIds.includes(notifId)) {
        list.push({
          id: notifId,
          title: `Low Stock: ${item.medicine.name}`,
          message: `Available quantity (${item.currentStock} units) is at or below reorder threshold (${item.medicine.minimumStockLevel}). Replenish PO immediately.`,
          type: 'warning',
          module: 'inventory',
          isRead: readNotificationIds.includes(notifId),
          linkTab: 'purchases',
          createdAt: item.medicine.createdAt,
        });
      }
    });

    // Pending Prescriptions
    const pendingRx = prescriptions.filter(r => r.status === 'pending');
    if (pendingRx.length > 0) {
      const notifId = 'notif-pending-rx';
      if (!dismissedNotificationIds.includes(notifId)) {
        list.push({
          id: notifId,
          title: `Pending Prescriptions (${pendingRx.length})`,
          message: `${pendingRx.length} patient prescription(s) awaiting clinical verification and dispensing.`,
          type: 'info',
          module: 'prescription',
          isRead: readNotificationIds.includes(notifId),
          linkTab: 'prescriptions',
          createdAt: new Date().toISOString(),
        });
      }
    }

    // Sort newest first
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [userNotifications, expiredBatches, nearExpiryBatches, lowStockMedicines, prescriptions, readNotificationIds, dismissedNotificationIds]);

  // Dismiss / Clear active toast
  const dismissToast = () => {
    setActiveToast(null);
  };

  // Show a temporary floating pop-up toast notification
  const showToast = (toast: Omit<ToastNotification, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const duration = toast.durationMs || 3500;
    setActiveToast({
      id,
      title: toast.title,
      message: toast.message,
      type: toast.type || 'success',
      durationMs: duration,
    });

    setTimeout(() => {
      setActiveToast(current => (current?.id === id ? null : current));
    }, duration);
  };

  // Add an item to user account notifications & display a pop-up toast
  const addNotification = (item: {
    title: string;
    message: string;
    type?: 'danger' | 'warning' | 'info' | 'success';
    module?: 'inventory' | 'expiry' | 'prescription' | 'purchase' | 'system' | 'pos';
    linkTab?: string;
  }) => {
    const newItem: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: item.title,
      message: item.message,
      type: item.type || 'success',
      module: item.module || 'pos',
      isRead: false,
      linkTab: item.linkTab || 'pos',
      createdAt: new Date().toISOString(),
    };

    setUserNotifications(prev => [newItem, ...prev].slice(0, 50));
    showToast({
      title: item.title,
      message: item.message,
      type: item.type || 'success',
      durationMs: 3500,
    });
  };

  const markNotificationRead = (id: string) => {
    setReadNotificationIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    setUserNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const toggleNotificationRead = (id: string) => {
    if (readNotificationIds.includes(id)) {
      setReadNotificationIds(prev => prev.filter(i => i !== id));
      setUserNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: false } : n)));
    } else {
      setReadNotificationIds(prev => [...prev, id]);
      setUserNotifications(prev => prev.map(n => (n.id === id ? { ...n, isRead: true } : n)));
    }
  };

  const deleteNotification = (id: string) => {
    setDismissedNotificationIds(prev => (prev.includes(id) ? prev : [...prev, id]));
    setUserNotifications(prev => prev.filter(n => n.id !== id));
  };

  const clearAllNotifications = () => {
    setReadNotificationIds(notifications.map(n => n.id));
    setUserNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  // Today's Sales Stats
  const todayStats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySales = sales.filter(
      s => (s?.createdAt || '').startsWith(todayStr) && (s?.status === 'completed' || s?.status === 'partially_refunded')
    );

    const salesCount = todaySales.length;
    // Net sales total: Grand Total minus refunded amounts
    const salesTotal = todaySales.reduce((sum, s) => {
      const saleNet = Math.max(0, (s?.grandTotal || 0) - (s?.refundedAmount || 0));
      return sum + saleNet;
    }, 0);

    let totalCost = 0;
    let itemsSold = 0;
    todaySales.forEach(s => {
      (s?.items || []).forEach(i => {
        totalCost += (i?.purchaseCost || 0) * (i?.quantity || 1);
        itemsSold += (i?.quantity || 1);
      });
    });

    const netProfit = salesTotal - totalCost;

    return { salesCount, salesTotal, netProfit, itemsSold };
  }, [sales]);

  // Database Export & Import
  const exportDatabase = (): string => {
    const dbDump = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser.name,
      settings,
      users,
      categories,
      medicines,
      batches,
      suppliers,
      customers,
      prescriptions,
      purchaseOrders,
      sales,
      returns,
      stockAdjustments,
      auditLogs,
    };
    addAuditLog({
      module: 'backup_restore',
      action: 'DATABASE_BACKUP_EXPORT',
      details: 'Full system database JSON backup generated and exported.',
    });
    return JSON.stringify(dbDump, null, 2);
  };

  const importDatabase = (jsonString: string): boolean => {
    try {
      const data = JSON.parse(jsonString);
      if (!data.medicines || !data.batches || !data.users) {
        throw new Error('Invalid database format');
      }

      if (data.settings) setSettings(data.settings);
      if (data.users) setUsers(data.users);
      if (data.categories) setCategories(data.categories);
      if (data.medicines) setMedicines(data.medicines);
      if (data.batches) setBatches(data.batches);
      if (data.suppliers) setSuppliers(data.suppliers);
      if (data.customers) setCustomers(data.customers);
      if (data.prescriptions) setPrescriptions(data.prescriptions);
      if (data.purchaseOrders) setPurchaseOrders(data.purchaseOrders);
      if (data.sales) setSales(data.sales);
      if (data.returns) setReturns(data.returns || []);
      if (data.stockAdjustments) setStockAdjustments(data.stockAdjustments || []);
      if (data.auditLogs) setAuditLogs(data.auditLogs || []);

      addAuditLog({
        module: 'backup_restore',
        action: 'DATABASE_RESTORE',
        details: `System restored from external JSON backup (Version ${data.version || '1.0'}).`,
      });
      return true;
    } catch {
      return false;
    }
  };

  const resetDatabaseToDefault = () => {
    setSettings(initialSettings);
    setUsers(initialUsers);
    setCurrentUser(initialUsers[0]);
    setCategories(initialCategories);
    setMedicines(initialMedicines);
    setBatches(initialBatches);
    setSuppliers(initialSuppliers);
    setCustomers(initialCustomers);
    setPrescriptions(initialPrescriptions);
    setPurchaseOrders(initialPurchaseOrders);
    setSales(initialSales);
    setReturns(initialReturns);
    setStockAdjustments(initialStockAdjustments);
    setAuditLogs(initialAuditLogs);
    setReadNotificationIds([]);

    // Clear local storage
    Object.keys(localStorage)
      .filter(k => k.startsWith(LOCAL_STORAGE_PREFIX))
      .forEach(k => localStorage.removeItem(k));

    addAuditLog({
      module: 'backup_restore',
      action: 'DATABASE_RESET_DEFAULT',
      details: 'System database reset to initial demonstration dataset.',
    });
  };

  return (
    <PharmacyContext.Provider
      value={{
        currentUser,
        users,
        isAuthenticated,
        setCurrentUser,
        switchUserRole,
        login,
        logout,
        addUser,
        updateUser,
        deleteUser,
        toggleUserStatus,
        resetUserPassword,
        updateUserCustomPermissions,
        forceChangePasswordOnFirstLogin,
        changeMyPassword,
        rbacMatrix,
        updateRolePermission,
        saveEntireRBACMatrix,
        resetRBACMatrix,
        hasPermission,
        savedCarts,
        saveHoldCart,
        deleteSavedCart,
        pendingPrescriptionForPOS,
        setPendingPrescriptionForPOS,
        loadPrescriptionToPOSCart,
        settings,
        updateSettings,
        medicines,
        categories,
        addMedicine,
        updateMedicine,
        deleteMedicine,
        addCategory,
        updateCategory,
        deleteCategory,
        batches,
        addBatch,
        updateBatch,
        deleteBatch,
        stockAdjustments,
        adjustStock,
        getMedicineTotalStock,
        getMedicineBatches,
        getFefoRecommendedBatch,
        suppliers,
        purchaseOrders,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        createPurchaseOrder,
        updatePurchaseOrder,
        approvePurchaseOrder,
        receivePurchaseOrder,
        updatePurchaseOrderStatus,
        customers,
        addCustomer,
        updateCustomer,
        deleteCustomer,
        prescriptions,
        createPrescription,
        updatePrescription,
        dispensePrescription,
        sales,
        returns,
        salesReturns: returns,
        processSale,
        createDispensingOrder,
        completeCashierPayment,
        finallyDispenseSale,
        cancelDispensingOrder,
        processReturn,
        processSaleReturn: processReturn,
        auditLogs,
        notifications,
        activeToast,
        addAuditLog,
        addNotification,
        showToast,
        dismissToast,
        markNotificationRead,
        toggleNotificationRead,
        deleteNotification,
        clearAllNotifications,
        exportDatabase,
        exportFullDatabaseBackup: exportDatabase,
        importDatabase,
        restoreDatabaseBackup: importDatabase,
        resetDatabaseToDefault,
        resetToDefaultSeedData: resetDatabaseToDefault,
        lowStockMedicines,
        nearExpiryBatches,
        expiredBatches,
        todayStats,
      }}
    >
      {children}
    </PharmacyContext.Provider>
  );
};

export const usePharmacy = () => {
  const context = useContext(PharmacyContext);
  if (!context) {
    throw new Error('usePharmacy must be used within a PharmacyProvider');
  }
  return context;
};
