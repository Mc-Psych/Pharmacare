# Security & Firestore Database Specification
**Application**: PharmaCare Pharmacy Management System
**Database ID**: `ai-studio-pharmacarepharma-dbf4fbf0-7021-4bd1-b7e0-e769952bb84e`

---

## 1. Data Invariants & Security Boundaries

1. **Authentication & Identity**:
   - All write operations require an authenticated staff session (`request.auth != null`).
   - Document ID parameters must be valid alphanumeric identifier strings with length <= 128 chars.

2. **Immutable Audit & Financial Records**:
   - **Audit Logs (`/auditLogs/{logId}`)**: Append-only. Updates and deletions are strictly forbidden (`allow update, delete: if false;`).
   - **Stock Movements (`/stockMovements/{movementId}`)**: Append-only ledger entries. Updates and deletions are strictly forbidden.
   - **Stock Adjustments (`/stockAdjustments/{adjustmentId}`)**: Append-only reconciliation records. Updates and deletions are strictly forbidden.
   - **Sales Returns (`/returns/{returnId}`)**: Append-only refund and return records. Updates and deletions are strictly forbidden.
   - **Sales Invoices (`/sales/{saleId}`)**: Invoices and transaction records can be created or status-updated, but deletions are strictly forbidden (`allow delete: if false;`).

3. **Domain Integrity & Type Safety**:
   - **Medicines (`/medicines/{medicineId}`)**: Must have non-empty name, categoryId, and positive numeric sellingPrice.
   - **Batches (`/batches/{batchId}`)**: Must link to a valid medicineId, contain non-empty batchNumber, valid expiryDate, and non-negative remainingQuantity.
   - **Purchase Orders (`/purchaseOrders/{poId}`)**: Must have valid poNumber, supplierId, non-negative totalAmount, and status in `['ordered', 'approved', 'received', 'cancelled']`.
   - **Prescriptions (`/prescriptions/{prescriptionId}`)**: Must have prescriptionNumber, customerName, doctorName, and status in `['pending', 'in_dispensing', 'dispensed', 'cancelled']`.
   - **Settings & RBAC Matrix (`/settings/global`, `/rbacMatrix/global`)**: System-wide configuration records.

---

## 2. The "Dirty Dozen" Malicious / Invariant-Breaking Payloads

1. **Payload 1: Unauthenticated Batch Injection**
   - Attempting to create a batch without auth credentials (`request.auth == null`).
   - *Expected Result*: `PERMISSION_DENIED`
2. **Payload 2: Negative Selling Price Exploitation**
   - `{"id": "med-hack", "name": "Fake Drug", "sellingPrice": -50.00, "categoryId": "cat-1"}`
   - *Expected Result*: `PERMISSION_DENIED`
3. **Payload 3: Arbitrary Deletion of Completed Sales Invoice**
   - `DELETE /sales/INV-20260824-001`
   - *Expected Result*: `PERMISSION_DENIED` (Financial records are protected against deletion)
4. **Payload 4: Tampering with Security Audit Log Entry**
   - `UPDATE /auditLogs/log-12345 {"action": "TAMPERED_LOG"}`
   - *Expected Result*: `PERMISSION_DENIED` (Audit logs are immutable)
5. **Payload 5: Deleting Audit Log Records to Cover Tracks**
   - `DELETE /auditLogs/log-12345`
   - *Expected Result*: `PERMISSION_DENIED`
6. **Payload 6: Negative Remaining Quantity in Medicine Batch**
   - `{"id": "bat-1", "medicineId": "med-1", "batchNumber": "B123", "expiryDate": "2027-01-01", "remainingQuantity": -500}`
   - *Expected Result*: `PERMISSION_DENIED`
7. **Payload 7: Invalid Prescription Status Injection**
   - `{"id": "rx-1", "prescriptionNumber": "RX-01", "customerName": "John", "doctorName": "Dr. Smith", "status": "malicious_status"}`
   - *Expected Result*: `PERMISSION_DENIED`
8. **Payload 8: Updating Immutable Stock Adjustment Record**
   - `UPDATE /stockAdjustments/adj-123 {"quantity": 99999}`
   - *Expected Result*: `PERMISSION_DENIED`
9. **Payload 9: Updating Returns and Refund Record**
   - `UPDATE /returns/ret-123 {"totalRefundAmount": 0}`
   - *Expected Result*: `PERMISSION_DENIED`
10. **Payload 10: Document ID Path Variable Poisoning**
    - `POST /medicines/<script>alert(1)</script>` or ID with 2000 junk characters.
    - *Expected Result*: `PERMISSION_DENIED`
11. **Payload 11: Negative Grand Total in Sales Invoice**
    - `{"id": "sale-1", "invoiceNumber": "INV-001", "grandTotal": -200, "items": []}`
    - *Expected Result*: `PERMISSION_DENIED`
12. **Payload 12: Invalid User Role Privilege Escalation**
    - `{"id": "usr-1", "username": "badactor", "role": "super_root_hacker"}`
    - *Expected Result*: `PERMISSION_DENIED`
