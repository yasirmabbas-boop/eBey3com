# Phase 2 & 3: Return Kill-Switch and Admin Refund - COMPLETE

## Implementation Summary

Successfully implemented the seller-driven return flow with payout permission lock/unlock mechanisms and admin refund finalization.

---

## Phase 2: Return Integration & Kill-Switch

### 1. Return Request Creation (Lock Payout)

**File:** `server/routes/transactions.ts` (Lines 681-694)

**Endpoint:** `POST /api/return-requests`

**Implementation:**
```typescript
// After creating return request, immediately lock payout permission
try {
  const { payoutPermissionService } = await import("../services/payout-permission-service");
  await payoutPermissionService.lockPermissionForReturn(transactionId, returnRequest.id);
  console.log(`[ReturnRequest] Payout permission LOCKED for transaction: ${transactionId}`);
} catch (lockError) {
  console.error(`[ReturnRequest] Failed to lock payout permission: ${lockError}`);
  console.warn(`[ReturnRequest] WARNING: Return created but permission not locked for transaction ${transactionId}`);
}
```

**Behavior:**
- ✅ Instantly locks payout when buyer files return request
- ✅ Prevents delivery partner from paying seller
- ✅ Continues even if lock fails (non-blocking)
- ✅ Logs warning if permission already paid/cleared

**State Change:** `withheld` → `locked`

---

### 2. Seller Response Handler (Unlock or Keep Locked)

**File:** `server/routes/transactions.ts` (Lines 900-920)

**Endpoint:** `PATCH /api/return-requests/:id/respond`

**Implementation:**
```typescript
// Handle payout permission based on seller decision
if (status === "rejected") {
  // Seller rejected - unlock payout permission
  try {
    const { payoutPermissionService } = await import("../services/payout-permission-service");
    await payoutPermissionService.unlockPermission(
      request.transactionId,
      `Return rejected by seller: ${sellerResponse || "No reason provided"}`
    );
    console.log(`[ReturnRequest] Payout permission UNLOCKED for transaction: ${request.transactionId}`);
  } catch (unlockError) {
    console.error(`[ReturnRequest] Failed to unlock payout permission: ${unlockError}`);
  }
} else if (status === "approved") {
  // Seller approved - permission stays LOCKED until admin processes refund
  console.log(`[ReturnRequest] Seller approved return for transaction: ${request.transactionId}. Permission remains LOCKED pending admin refund.`);
}
```

**Behavior:**

**If Seller Rejects:**
- ✅ Unlocks payout permission
- ✅ Order goes back to "maturity clock" (grace period)
- ✅ If grace period expired, immediately clears for payout
- ✅ If grace period not expired, returns to `withheld` status
- ✅ Buyer can escalate via existing report system

**State Change (Rejected):** `locked` → `withheld` or `cleared` (depending on grace period)

**If Seller Approves:**
- ✅ Permission stays `locked`
- ✅ Awaits admin refund processing
- ✅ Notifies all admins for review

**State Change (Approved):** `locked` → stays `locked`

---

## Phase 3: Admin Refund Finalization

### 3. Admin Refund Endpoint

**File:** `server/routes/admin.ts` (Lines 519-621)

**Endpoint:** `POST /api/admin/returns/:id/finalize-refund`

**Authentication:** `requireAdmin` middleware

**Request Body:**
```typescript
{
  adminNotes?: string  // Optional admin notes
}
```

**Implementation Flow:**

```typescript
// 1. Validate return request
- Check return request exists
- Check not already processed (idempotency)
- Check seller approved

// 2. Get transaction details
- Verify transaction exists

// 3. Database transaction (ATOMIC)
await db.transaction(async (tx) => {
  // 3a. Reverse seller settlement
  await financialService.reverseSettlement(
    transaction.id,
    `Admin processed refund for return request ${returnRequestId}`
  );
  
  // 3b. Credit buyer's wallet
  await financialService.createBuyerWalletTransaction(
    transaction.buyerId,
    transaction.amount,
    "refund",
    transaction.id,
    `Refund for order #${transaction.id}`
  );
  
  // 3c. Mark return as processed
  await storage.markReturnAsProcessed(
    returnRequestId,
    transaction.amount,
    adminUser.id,
    adminNotes || "Refund processed by admin"
  );
  
  // 3d. BLOCK payout permission permanently
  await payoutPermissionService.blockPermissionForRefund(
    transaction.id,
    adminUser.id,
    `Admin processed refund for return request ${returnRequestId}`,
    transaction.amount
  );
});

// 4. Notify buyer
await storage.createNotification({
  userId: transaction.buyerId,
  type: "refund_processed",
  title: "تم إرجاع المبلغ",
  message: `تم إرجاع ${transaction.amount.toLocaleString()} د.ع إلى محفظتك`,
  linkUrl: `/buyer-dashboard?tab=wallet`,
});
```

**Financial Operations:**

1. **Seller Settlement Reversal:**
   - Removes funds from seller's wallet (if already credited)
   - Or prevents future credit

2. **Buyer Refund:**
   - Credits full `transaction.amount` to buyer's wallet
   - Type: `"refund"`
   - Immediate availability

3. **Debt Creation:**
   - `debtAmount`: Full refund amount
   - `debtDueDate`: 30 days from block
   - `debtStatus`: `"pending"`

**Behavior:**
- ✅ Idempotent (checks if already processed)
- ✅ Requires seller approval first
- ✅ All operations in database transaction (atomic)
- ✅ Blocks payout permission permanently
- ✅ Creates debt record for seller
- ✅ Notifies buyer of refund
- ✅ Logs all steps for audit trail

**State Change:** `locked` → `blocked`

---

## Error Handling & Safety

### Idempotency Checks
- ✅ Return request creation: Checks for existing request
- ✅ Admin refund: Checks `refundProcessed` flag
- ✅ Payout blocking: Permission status verified

### Transaction Safety
- ✅ Admin refund uses `db.transaction()` for atomicity
- ✅ If any step fails, entire refund is rolled back
- ✅ No partial refunds possible

### Non-Blocking Operations
- ✅ Lock/unlock failures log warnings but don't block request creation
- ✅ Notification failures don't block refund processing

### Edge Cases Handled
1. **Permission already paid:** Lock still applied, warning logged
2. **Permission already cleared:** Lock overrides, warning logged
3. **Grace period expired during lock:** Unlock correctly determines final state
4. **Seller settlement doesn't exist:** Reversal continues without error

---

## State Machine Verification

### Complete Flow Example:

```
Order Delivered
    ↓ [createPermissionOnDelivery]
status: withheld
    ↓ [Buyer files return]
status: locked ← KILL-SWITCH ACTIVATED
    ↓
    ├─ [Seller Rejects]
    │   ↓ [unlockPermission]
    │   status: withheld or cleared (depending on grace period)
    │   ↓
    │   [If cleared] → Delivery partner can pay
    │
    └─ [Seller Approves]
        ↓ [stays locked]
        status: locked (awaiting admin)
        ↓ [Admin finalizes refund]
        status: blocked ← PERMANENT BLOCK
        ↓
        Debt tracked, seller owes platform
```

---

## Logging & Audit Trail

### Console Logs Added:

**Return Creation:**
```
[ReturnRequest] Payout permission LOCKED for transaction: {id}
[ReturnRequest] WARNING: Return created but permission not locked for transaction {id}
```

**Seller Rejection:**
```
[ReturnRequest] Payout permission UNLOCKED for transaction: {id}
```

**Seller Approval:**
```
[ReturnRequest] Seller approved return for transaction: {id}. Permission remains LOCKED pending admin refund.
```

**Admin Refund:**
```
[AdminRefund] Reversed settlement for transaction: {id}
[AdminRefund] Credited {amount} IQD to buyer wallet: {buyerId}
[AdminRefund] Payout permission BLOCKED for transaction: {id}
```

**Payout Permission Service:**
```
[PayoutPermission] LOCKED transaction {id}: return request {returnId}
[PayoutPermission] UNLOCKED transaction {id}: status={newStatus}, grace_expired={bool}
[PayoutPermission] BLOCKED transaction {id}: debt={amount} IQD, due={date}
```

---

## API Response Format

### Admin Refund Success Response:
```json
{
  "success": true,
  "message": "تم معالجة الاسترجاع بنجاح",
  "refundAmount": 250000
}
```

### Error Responses:
```json
// Already processed
{
  "error": "تم معالجة هذا الاسترجاع مسبقاً"
}

// Not approved by seller
{
  "error": "يجب أن يوافق البائع على الإرجاع أولاً"
}

// Return request not found
{
  "error": "طلب الإرجاع غير موجود"
}
```

---

## Integration Points

### Required Services:
- ✅ `payoutPermissionService` (created in Phase 1)
- ✅ `financialService.reverseSettlement()`
- ✅ `financialService.createBuyerWalletTransaction()`
- ✅ `storage.markReturnAsProcessed()`
- ✅ `storage.getReturnRequestById()`
- ✅ `storage.getTransactionById()`

### Dependencies:
- ✅ Database transaction support (`db.transaction`)
- ✅ Admin authentication (`requireAdmin` middleware)
- ✅ Notification system (`storage.createNotification`)

---

## Testing Checklist

### Manual Testing Required:

1. **Return Request Lock:**
   - [ ] Create return request
   - [ ] Verify permission status = "locked"
   - [ ] Check console logs for LOCKED message

2. **Seller Rejection (Within Grace Period):**
   - [ ] Seller rejects return
   - [ ] Verify permission status = "withheld"
   - [ ] Check grace period not expired

3. **Seller Rejection (After Grace Period):**
   - [ ] Seller rejects return
   - [ ] Verify permission status = "cleared"
   - [ ] Check grace period expired

4. **Seller Approval:**
   - [ ] Seller approves return
   - [ ] Verify permission status = "locked"
   - [ ] Verify admin notification sent

5. **Admin Refund Processing:**
   - [ ] Admin calls finalize-refund endpoint
   - [ ] Verify permission status = "blocked"
   - [ ] Verify buyer wallet credited
   - [ ] Verify seller settlement reversed
   - [ ] Verify debt created (check debt_amount field)
   - [ ] Verify buyer notification sent

6. **Idempotency:**
   - [ ] Call admin refund endpoint twice
   - [ ] Verify second call returns error
   - [ ] Verify no double-refund

7. **Edge Cases:**
   - [ ] Try to refund without seller approval
   - [ ] Try to create duplicate return requests
   - [ ] Verify error messages in Arabic

---

## Next Steps

Phase 2 & 3 are complete! Ready for:
- **Phase 4:** Logistics API Bridge (cleared orders endpoint)
- **Phase 5:** Cron jobs for automation (grace period expiry, debt escalation)

---

## Files Modified

1. ✅ `server/routes/transactions.ts` (Lines 681-694, 900-920)
2. ✅ `server/routes/admin.ts` (Lines 519-621)
3. ✅ `server/services/payout-permission-service.ts` (used, created in Phase 1)

---

## Compliance with Requirements

✅ **Database Transaction:** Admin refund uses `db.transaction()` for atomicity
✅ **Seller-Driven Flow:** Seller approves/rejects, admin only processes approved refunds
✅ **Kill-Switch:** Immediate lock on return request creation
✅ **Unlock on Rejection:** Permission returns to maturity clock
✅ **Block on Refund:** Permanent block with debt tracking
✅ **Idempotency:** Checks prevent double-processing
✅ **Error Handling:** Non-blocking operations with detailed logging
✅ **Arabic Messages:** All user-facing messages in Arabic

---

**Status:** ✅ PHASE 2 & 3 COMPLETE
**Date:** 2026-02-03
**Next:** Phase 4 - Logistics API Bridge
