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

// Purge all non-admin users, prescriptions, purchase orders, sales, returns, vendors from Firestore
export async function purgeAppCollectionsExceptAdmin(): Promise<void> {
  try {
    const batch = writeBatch(db);
    let deleteCount = 0;

    // 1. Purge non-admin users
    const usersSnap = await getDocs(collection(db, FirestoreCollections.USERS));
    usersSnap.forEach(snap => {
      const data = snap.data() as User;
      if (data.id !== 'usr-courage-admin' && data.role !== 'admin') {
        batch.delete(snap.ref);
        deleteCount++;
      }
    });

    // 2. Purge prescriptions
    const rxSnap = await getDocs(collection(db, FirestoreCollections.PRESCRIPTIONS));
    rxSnap.forEach(snap => {
      batch.delete(snap.ref);
      deleteCount++;
    });

    // 3. Purge purchase orders
    const poSnap = await getDocs(collection(db, FirestoreCollections.PURCHASE_ORDERS));
    poSnap.forEach(snap => {
      batch.delete(snap.ref);
      deleteCount++;
    });

    // 4. Purge sales / payments
    const salesSnap = await getDocs(collection(db, FirestoreCollections.SALES));
    salesSnap.forEach(snap => {
      batch.delete(snap.ref);
      deleteCount++;
    });

    // 5. Purge returns
    const returnsSnap = await getDocs(collection(db, FirestoreCollections.RETURNS));
    returnsSnap.forEach(snap => {
      batch.delete(snap.ref);
      deleteCount++;
    });

    // 6. Purge suppliers / vendors
    const supSnap = await getDocs(collection(db, FirestoreCollections.SUPPLIERS));
    supSnap.forEach(snap => {
      batch.delete(snap.ref);
      deleteCount++;
    });

    // 7. Purge saved carts
    const cartsSnap = await getDocs(collection(db, FirestoreCollections.SAVED_CARTS));
    cartsSnap.forEach(snap => {
      batch.delete(snap.ref);
      deleteCount++;
    });

    if (deleteCount > 0) {
      await batch.commit();
      console.log(`Firestore purge complete. Deleted ${deleteCount} records.`);
    }
  } catch (error) {
    console.warn('Error purging Firestore collections:', error);
  }
}
