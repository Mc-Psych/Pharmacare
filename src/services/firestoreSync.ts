import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import {
  User,
  Category,
  Medicine,
  MedicineBatch,
  Supplier,
  Customer,
  Prescription,
  Sale,
  PurchaseOrder,
  PharmacySettings,
  AuditLog,
  StockAdjustment,
  ReturnOrder,
  RBACMatrix
} from '../types';
import { SavedCart } from '../context/PharmacyContext';
import {
  initialSettings,
  initialUsers,
  initialCategories,
  initialAuditLogs
} from '../data/initialData';

export const FirestoreCollections = {
  SETTINGS: 'settings',
  USERS: 'users',
  CATEGORIES: 'categories',
  MEDICINES: 'medicines',
  BATCHES: 'batches',
  SUPPLIERS: 'suppliers',
  CUSTOMERS: 'customers',
  PRESCRIPTIONS: 'prescriptions',
  PURCHASE_ORDERS: 'purchaseOrders',
  SALES: 'sales',
  RETURNS: 'returns',
  STOCK_ADJUSTMENTS: 'stockAdjustments',
  STOCK_MOVEMENTS: 'stockMovements',
  AUDIT_LOGS: 'auditLogs',
  RBAC_MATRIX: 'rbacMatrix',
  SAVED_CARTS: 'savedCarts',
};

// Seed initial data if Firestore collections are empty
export async function seedInitialFirestoreData(initialRBACMatrix: RBACMatrix) {
  try {
    // Check if users collection is empty
    const usersSnap = await getDocs(collection(db, FirestoreCollections.USERS));
    if (usersSnap.empty) {
      console.log('Seeding initial Firebase Firestore database...');
      const batch = writeBatch(db);

      // Seed settings
      const settingsDocRef = doc(db, FirestoreCollections.SETTINGS, 'global');
      batch.set(settingsDocRef, initialSettings);

      // Seed RBAC Matrix
      const rbacDocRef = doc(db, FirestoreCollections.RBAC_MATRIX, 'global');
      batch.set(rbacDocRef, { matrix: initialRBACMatrix, updatedAt: new Date().toISOString() });

      // Seed admin user
      initialUsers.forEach(user => {
        const userRef = doc(db, FirestoreCollections.USERS, user.id);
        batch.set(userRef, user);
      });

      // Seed categories
      initialCategories.forEach(cat => {
        const catRef = doc(db, FirestoreCollections.CATEGORIES, cat.id);
        batch.set(catRef, cat);
      });

      // Seed initial audit log
      initialAuditLogs.forEach(log => {
        const logRef = doc(db, FirestoreCollections.AUDIT_LOGS, log.id);
        batch.set(logRef, log);
      });

      await batch.commit();
      console.log('Firebase Firestore database seeded successfully with Admin account Courage Kay.');
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'seedInitialData');
  }
}

// Generic Document Set / Update
export async function syncDoc<T extends Record<string, any>>(collectionName: string, docId: string, data: T): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    // Remove undefined properties before Firestore write
    const cleanData = JSON.parse(JSON.stringify(data));
    await setDoc(doc(db, collectionName, docId), cleanData, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Generic Document Delete
export async function deleteDocFromFirestore(collectionName: string, docId: string): Promise<void> {
  const path = `${collectionName}/${docId}`;
  try {
    await deleteDoc(doc(db, collectionName, docId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
