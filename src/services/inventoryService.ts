import {
  doc,
  runTransaction,
  collection,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  MedicineBatch,
  StockAdjustment,
  StockMovement,
  PurchaseOrder,
  SaleItem,
  User,
} from '../types';

export const BATCHES_COLLECTION = 'batches';
export const STOCK_ADJUSTMENTS_COLLECTION = 'stockAdjustments';
export const STOCK_MOVEMENTS_COLLECTION = 'stockMovements';
export const PURCHASE_ORDERS_COLLECTION = 'purchaseOrders';

/**
 * Filter and sort batches by FEFO (First-Expired, First-Out)
 * Excludes expired batches and zero-quantity batches.
 */
export function sortBatchesByFEFO(batches: MedicineBatch[]): MedicineBatch[] {
  const now = new Date();
  return batches
    .filter(b => {
      const exp = new Date(b.expiryDate);
      return exp > now && b.remainingQuantity > 0;
    })
    .sort((a, b) => new Date(a.expiryDate).getTime() - new Date(b.expiryDate).getTime());
}

/**
 * Atomically adjusts stock for a single batch with full ledger tracking.
 */
export async function executeStockAdjustmentTransaction(
  adjustmentData: Omit<StockAdjustment, 'id' | 'createdAt'>,
  user: User
): Promise<{ success: boolean; adjustment?: StockAdjustment; error?: string }> {
  try {
    const adjustmentId = `adj-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const movementId = `mov-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const batchRef = doc(db, BATCHES_COLLECTION, adjustmentData.batchId);
    const adjustmentRef = doc(db, STOCK_ADJUSTMENTS_COLLECTION, adjustmentId);
    const movementRef = doc(db, STOCK_MOVEMENTS_COLLECTION, movementId);

    const nowIso = new Date().toISOString();

    const newAdjustment: StockAdjustment = {
      ...adjustmentData,
      id: adjustmentId,
      createdAt: nowIso,
    };

    const isPositive = adjustmentData.adjustmentQuantity > 0;
    const movementType = isPositive ? 'ADJUSTMENT_IN' : (
      adjustmentData.reason === 'expired_disposal' ? 'EXPIRED_DISPOSAL' :
      adjustmentData.reason === 'damaged' ? 'DAMAGE_DISPOSAL' : 'ADJUSTMENT_OUT'
    );

    const newMovement: StockMovement = {
      id: movementId,
      medicineId: adjustmentData.medicineId,
      medicineName: adjustmentData.medicineName,
      batchId: adjustmentData.batchId,
      batchNumber: adjustmentData.batchNumber,
      movementType,
      quantity: Math.abs(adjustmentData.adjustmentQuantity),
      previousStock: adjustmentData.previousQuantity,
      newStock: adjustmentData.newQuantity,
      referenceId: adjustmentId,
      reason: adjustmentData.reason,
      notes: adjustmentData.notes,
      performedById: user.id,
      performedByName: user.name,
      createdAt: nowIso,
    };

    await runTransaction(db, async (tx) => {
      const batchDoc = await tx.get(batchRef);
      if (!batchDoc.exists()) {
        throw new Error(`Batch ID ${adjustmentData.batchId} was not found in Firestore.`);
      }

      // Update remainingQuantity
      tx.update(batchRef, {
        remainingQuantity: adjustmentData.newQuantity,
        updatedAt: nowIso,
        updatedAtServer: serverTimestamp(),
      });

      // Write adjustment doc
      tx.set(adjustmentRef, {
        ...newAdjustment,
        createdAtServer: serverTimestamp(),
      });

      // Write immutable stock movement ledger entry
      tx.set(movementRef, {
        ...newMovement,
        createdAtServer: serverTimestamp(),
      });
    });

    return { success: true, adjustment: newAdjustment };
  } catch (error: any) {
    console.error('Stock adjustment transaction error:', error);
    return { success: false, error: error.message || 'Failed to adjust stock atomically.' };
  }
}

/**
 * Atomically receive purchase order goods into inventory batches and record stock movements.
 */
export async function executeReceivePOTransaction(
  po: PurchaseOrder,
  user: User,
  allExistingBatches: MedicineBatch[],
  notes?: string
): Promise<{ success: boolean; updatedPO?: PurchaseOrder; error?: string }> {
  try {
    const poRef = doc(db, PURCHASE_ORDERS_COLLECTION, po.id);
    const nowIso = new Date().toISOString();

    const updatedPO: PurchaseOrder = {
      ...po,
      status: 'received',
      receivedBy: user.name,
      receivedAt: nowIso,
      notes: notes || po.notes,
    };

    await runTransaction(db, async (tx) => {
      // 1. Update purchase order document
      tx.update(poRef, {
        status: 'received',
        receivedBy: user.name,
        receivedAt: nowIso,
        notes: notes || po.notes || '',
        updatedAt: nowIso,
        updatedAtServer: serverTimestamp(),
      });

      // 2. For each item in PO, create or update batch
      for (const item of po.items) {
        const existingBatch = allExistingBatches.find(
          b => b.medicineId === item.medicineId && b.batchNumber.trim().toLowerCase() === item.batchNumber.trim().toLowerCase()
        );

        const movementId = `mov-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        const movementRef = doc(db, STOCK_MOVEMENTS_COLLECTION, movementId);

        if (existingBatch) {
          const batchRef = doc(db, BATCHES_COLLECTION, existingBatch.id);
          const newRemaining = existingBatch.remainingQuantity + item.quantity;
          const newReceived = existingBatch.quantityReceived + item.quantity;

          tx.update(batchRef, {
            remainingQuantity: newRemaining,
            quantityReceived: newReceived,
            purchasePrice: item.unitCost,
            updatedAt: nowIso,
            updatedAtServer: serverTimestamp(),
          });

          tx.set(movementRef, {
            id: movementId,
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            batchId: existingBatch.id,
            batchNumber: existingBatch.batchNumber,
            movementType: 'PURCHASE',
            quantity: item.quantity,
            previousStock: existingBatch.remainingQuantity,
            newStock: newRemaining,
            referenceId: po.poNumber,
            notes: `Inbound PO ${po.poNumber} received from ${po.supplierName}`,
            performedById: user.id,
            performedByName: user.name,
            createdAt: nowIso,
            createdAtServer: serverTimestamp(),
          });
        } else {
          const newBatchId = `bat-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
          const batchRef = doc(db, BATCHES_COLLECTION, newBatchId);
          const sellingPrice = item.unitCost * 1.35; // Default markup

          const newBatch: MedicineBatch = {
            id: newBatchId,
            medicineId: item.medicineId,
            batchNumber: item.batchNumber,
            supplierId: po.supplierId,
            supplierName: po.supplierName,
            manufacturingDate: item.manufacturingDate || nowIso.split('T')[0],
            expiryDate: item.expiryDate,
            quantityReceived: item.quantity,
            remainingQuantity: item.quantity,
            purchasePrice: item.unitCost,
            sellingPrice,
            createdAt: nowIso,
          };

          tx.set(batchRef, {
            ...newBatch,
            createdAtServer: serverTimestamp(),
          });

          tx.set(movementRef, {
            id: movementId,
            medicineId: item.medicineId,
            medicineName: item.medicineName,
            batchId: newBatchId,
            batchNumber: item.batchNumber,
            movementType: 'PURCHASE',
            quantity: item.quantity,
            previousStock: 0,
            newStock: item.quantity,
            referenceId: po.poNumber,
            notes: `New batch from Inbound PO ${po.poNumber} (${po.supplierName})`,
            performedById: user.id,
            performedByName: user.name,
            createdAt: nowIso,
            createdAtServer: serverTimestamp(),
          });
        }
      }
    });

    return { success: true, updatedPO };
  } catch (error: any) {
    console.error('Receive PO transaction error:', error);
    return { success: false, error: error.message || 'Failed to receive purchase order.' };
  }
}
