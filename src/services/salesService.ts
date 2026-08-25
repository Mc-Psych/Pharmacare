import {
  doc,
  runTransaction,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  Sale,
  SaleItem,
  ReturnOrder,
  MedicineBatch,
  StockMovement,
  Customer,
  Prescription,
  User,
  PaymentMethod,
} from '../types';
import { BATCHES_COLLECTION, STOCK_MOVEMENTS_COLLECTION } from './inventoryService';

export const SALES_COLLECTION = 'sales';
export const RETURNS_COLLECTION = 'returns';
export const CUSTOMERS_COLLECTION = 'customers';
export const PRESCRIPTIONS_COLLECTION = 'prescriptions';

/**
 * Generate a collision-resistant unique invoice identifier.
 * Format: INV-YYYYMMDD-HHMMSS-RAND
 */
export function generateUniqueInvoiceNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hh = String(now.getHours()).padStart(2, '0');
  const min = String(now.getMinutes()).padStart(2, '0');
  const ss = String(now.getSeconds()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `INV-${yyyy}${mm}${dd}-${hh}${min}${ss}-${rand}`;
}

/**
 * Generate a collision-resistant unique return order number.
 */
export function generateUniqueReturnNumber(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `RET-${yyyy}-${rand}`;
}

/**
 * Atomically execute a POS sale with FEFO batch stock deductions and stock ledger movements.
 */
export async function executeSaleTransaction(
  saleData: Omit<Sale, 'id' | 'invoiceNumber' | 'createdAt'>,
  user: User,
  allowNegativeStock: boolean = false
): Promise<{ success: boolean; sale?: Sale; error?: string }> {
  try {
    const saleId = `sale-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const invoiceNumber = generateUniqueInvoiceNumber();
    const now = new Date();
    const nowIso = now.toISOString();

    const newSale: Sale = {
      ...saleData,
      id: saleId,
      invoiceNumber,
      dispenseStatus: saleData.dispenseStatus || 'finally_dispensed',
      createdAt: nowIso,
    };

    const saleRef = doc(db, SALES_COLLECTION, saleId);
    const customerRef = saleData.customerId ? doc(db, CUSTOMERS_COLLECTION, saleData.customerId) : null;
    const prescriptionRef = saleData.prescriptionId ? doc(db, PRESCRIPTIONS_COLLECTION, saleData.prescriptionId) : null;

    await runTransaction(db, async (tx) => {
      // 1. Validate all batches and check stock & expiry
      const batchDocs: { ref: any; batch: MedicineBatch; item: SaleItem }[] = [];

      for (const item of saleData.items) {
        const bRef = doc(db, BATCHES_COLLECTION, item.batchId);
        const bSnap = await tx.get(bRef);

        if (!bSnap.exists()) {
          throw new Error(`Batch ID ${item.batchId} for item "${item.medicineName}" was not found.`);
        }

        const batch = bSnap.data() as MedicineBatch;

        // Verify expiry
        const expDate = new Date(batch.expiryDate);
        if (expDate <= now) {
          throw new Error(
            `Batch ${batch.batchNumber} of "${item.medicineName}" expired on ${batch.expiryDate}. Dispensing of expired medications is strictly prohibited.`
          );
        }

        // Verify sufficient stock
        if (!allowNegativeStock && batch.remainingQuantity < item.quantity) {
          throw new Error(
            `Insufficient stock for "${item.medicineName}" in batch ${batch.batchNumber}. Available: ${batch.remainingQuantity}, Requested: ${item.quantity}.`
          );
        }

        batchDocs.push({ ref: bRef, batch, item });
      }

      // 2. Deduct batch quantities and record stock movements
      for (const { ref, batch, item } of batchDocs) {
        const newRemaining = Math.max(0, batch.remainingQuantity - item.quantity);
        tx.update(ref, {
          remainingQuantity: newRemaining,
          updatedAt: nowIso,
          updatedAtServer: serverTimestamp(),
        });

        const movementId = `mov-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const movementRef = doc(db, STOCK_MOVEMENTS_COLLECTION, movementId);

        const movement: StockMovement = {
          id: movementId,
          medicineId: item.medicineId,
          medicineName: item.medicineName,
          batchId: item.batchId,
          batchNumber: item.batchNumber,
          movementType: 'SALE',
          quantity: item.quantity,
          previousStock: batch.remainingQuantity,
          newStock: newRemaining,
          referenceId: invoiceNumber,
          notes: `POS Sale ${invoiceNumber} to ${saleData.customerName || 'Walk-in'}`,
          performedById: user.id,
          performedByName: user.name,
          createdAt: nowIso,
        };

        tx.set(movementRef, {
          ...movement,
          createdAtServer: serverTimestamp(),
        });
      }

      // 3. Update customer total purchases if applicable
      if (customerRef) {
        const custSnap = await tx.get(customerRef);
        if (custSnap.exists()) {
          const cust = custSnap.data() as Customer;
          const currentTotal = cust.totalPurchases || 0;
          tx.update(customerRef, {
            totalPurchases: currentTotal + newSale.grandTotal,
            lastVisit: nowIso,
            updatedAt: nowIso,
            updatedAtServer: serverTimestamp(),
          });
        }
      }

      // 4. Update prescription if linked
      if (prescriptionRef) {
        const rxSnap = await tx.get(prescriptionRef);
        if (rxSnap.exists()) {
          const rx = rxSnap.data() as Prescription;
          const updatedItems = rx.items.map(i => ({ ...i, quantityDispensed: i.quantityPrescribed }));
          tx.update(prescriptionRef, {
            status: 'dispensed',
            dispensedBy: user.name,
            dispensedAt: nowIso,
            items: updatedItems,
            updatedAt: nowIso,
            updatedAtServer: serverTimestamp(),
          });
        }
      }

      // 5. Write sale document
      tx.set(saleRef, {
        ...newSale,
        createdAtServer: serverTimestamp(),
      });
    });

    return { success: true, sale: newSale };
  } catch (error: any) {
    console.error('Sale transaction failed:', error);
    return { success: false, error: error.message || 'Sale transaction failed.' };
  }
}

/**
 * Atomically process a customer sales return and refund.
 */
export async function executeReturnTransaction(
  returnData: Omit<ReturnOrder, 'id' | 'returnNumber' | 'createdAt'>,
  user: User
): Promise<{ success: boolean; returnOrder?: ReturnOrder; error?: string }> {
  try {
    const returnId = `ret-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const returnNumber = generateUniqueReturnNumber();
    const nowIso = new Date().toISOString();

    const newReturn: ReturnOrder = {
      ...returnData,
      id: returnId,
      returnNumber,
      createdAt: nowIso,
    };

    const returnRef = doc(db, RETURNS_COLLECTION, returnId);
    const saleRef = doc(db, SALES_COLLECTION, returnData.saleId);

    await runTransaction(db, async (tx) => {
      // 1. Verify sale exists
      const saleSnap = await tx.get(saleRef);
      if (!saleSnap.exists()) {
        throw new Error(`Original sale record ID ${returnData.saleId} not found.`);
      }

      // 2. For each returned item, handle stock restoration / write-off
      for (const item of returnData.items) {
        const bRef = doc(db, BATCHES_COLLECTION, item.batchId);
        const bSnap = await tx.get(bRef);

        if (bSnap.exists()) {
          const batch = bSnap.data() as MedicineBatch;
          const movementId = `mov-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
          const movementRef = doc(db, STOCK_MOVEMENTS_COLLECTION, movementId);

          if (item.condition === 'restockable') {
            const newRemaining = batch.remainingQuantity + item.quantity;
            tx.update(bRef, {
              remainingQuantity: newRemaining,
              updatedAt: nowIso,
              updatedAtServer: serverTimestamp(),
            });

            const movement: StockMovement = {
              id: movementId,
              medicineId: item.medicineId,
              medicineName: item.medicineName,
              batchId: item.batchId,
              batchNumber: item.batchNumber,
              movementType: 'RETURN',
              quantity: item.quantity,
              previousStock: batch.remainingQuantity,
              newStock: newRemaining,
              referenceId: returnNumber,
              reason: returnData.reason,
              notes: `Customer return restocked for Invoice ${returnData.invoiceNumber}`,
              performedById: user.id,
              performedByName: user.name,
              createdAt: nowIso,
            };

            tx.set(movementRef, {
              ...movement,
              createdAtServer: serverTimestamp(),
            });
          } else {
            // Damaged / non-restockable item write-off
            const movement: StockMovement = {
              id: movementId,
              medicineId: item.medicineId,
              medicineName: item.medicineName,
              batchId: item.batchId,
              batchNumber: item.batchNumber,
              movementType: 'DAMAGE_DISPOSAL',
              quantity: item.quantity,
              previousStock: batch.remainingQuantity,
              newStock: batch.remainingQuantity,
              referenceId: returnNumber,
              reason: 'customer_return_damaged',
              notes: `Customer return ${returnNumber} quarantined/disposed (Condition: ${item.condition})`,
              performedById: user.id,
              performedByName: user.name,
              createdAt: nowIso,
            };

            tx.set(movementRef, {
              ...movement,
              createdAtServer: serverTimestamp(),
            });
          }
        }
      }

      // 3. Update sale status to refunded
      tx.update(saleRef, {
        status: 'refunded',
        refundedAt: nowIso,
        refundedAmount: returnData.totalRefundAmount,
        updatedAt: nowIso,
        updatedAtServer: serverTimestamp(),
      });

      // 4. Save return document
      tx.set(returnRef, {
        ...newReturn,
        createdAtServer: serverTimestamp(),
      });
    });

    return { success: true, returnOrder: newReturn };
  } catch (error: any) {
    console.error('Return transaction error:', error);
    return { success: false, error: error.message || 'Failed to process return transaction.' };
  }
}

/**
 * Atomically void a sale with audit trail and stock reversal.
 */
export async function executeVoidSaleTransaction(
  saleId: string,
  voidReason: string,
  user: User
): Promise<{ success: boolean; error?: string }> {
  try {
    const saleRef = doc(db, SALES_COLLECTION, saleId);
    const nowIso = new Date().toISOString();

    await runTransaction(db, async (tx) => {
      const saleSnap = await tx.get(saleRef);
      if (!saleSnap.exists()) {
        throw new Error(`Sale record ${saleId} not found.`);
      }

      const sale = saleSnap.data() as Sale;
      if (sale.status === 'voided') {
        throw new Error('This sale has already been voided.');
      }

      // Restore stock for items if they were deducted
      if (sale.dispenseStatus !== 'awaiting_payment') {
        for (const item of sale.items) {
          const bRef = doc(db, BATCHES_COLLECTION, item.batchId);
          const bSnap = await tx.get(bRef);
          if (bSnap.exists()) {
            const batch = bSnap.data() as MedicineBatch;
            const newRemaining = batch.remainingQuantity + item.quantity;

            tx.update(bRef, {
              remainingQuantity: newRemaining,
              updatedAt: nowIso,
              updatedAtServer: serverTimestamp(),
            });

            const movementId = `mov-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
            const movementRef = doc(db, STOCK_MOVEMENTS_COLLECTION, movementId);

            const movement: StockMovement = {
              id: movementId,
              medicineId: item.medicineId,
              medicineName: item.medicineName,
              batchId: item.batchId,
              batchNumber: item.batchNumber,
              movementType: 'VOID_REVERSAL',
              quantity: item.quantity,
              previousStock: batch.remainingQuantity,
              newStock: newRemaining,
              referenceId: sale.invoiceNumber,
              reason: 'sale_voided',
              notes: `Voided Sale ${sale.invoiceNumber}. Reason: ${voidReason}`,
              performedById: user.id,
              performedByName: user.name,
              createdAt: nowIso,
            };

            tx.set(movementRef, {
              ...movement,
              createdAtServer: serverTimestamp(),
            });
          }
        }
      }

      // Mark sale as voided (Financial record is NEVER deleted)
      tx.update(saleRef, {
        status: 'voided',
        voidReason,
        voidedById: user.id,
        voidedByName: user.name,
        voidedAt: nowIso,
        updatedAt: nowIso,
        updatedAtServer: serverTimestamp(),
      });
    });

    return { success: true };
  } catch (error: any) {
    console.error('Void sale error:', error);
    return { success: false, error: error.message || 'Failed to void sale.' };
  }
}
