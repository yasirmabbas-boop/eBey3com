# Return & Refund System - Step 1 Test Plan

**Status:** Ready for Testing  
**Prerequisite:** Run migration `0026_add_return_refund_tracking.sql`

---

## Manual Testing Guide

### Prerequisites
1. **Run Database Migration:**
   ```bash
   # Apply migration to add new columns
   psql $DATABASE_URL -f migrations/0026_add_return_refund_tracking.sql
   
   # Or if using npm script:
   npm run db:migrate
   ```

2. **Verify Migration:**
   ```sql
   -- Check new columns exist
   \d return_requests
   
   -- Should see:
   -- refund_processed | boolean | not null | false
   -- refund_amount    | integer |          |
   -- admin_notes      | text    |          |
   -- processed_by     | varchar |          |
   -- processed_at     | timestamp|         |
   ```

3. **Create Test Data:**
   - Create a test buyer account
   - Create a test seller account
   - Create a test admin account
   - Create a completed transaction (delivered status)
   - Create a return request for that transaction

---

## Test Cases

### Test 1: View Pending Returns (GET /api/admin/returns)

**Setup:**
```sql
-- Create a return request with approved status
INSERT INTO return_requests (
  transaction_id, buyer_id, seller_id, listing_id,
  reason, status, seller_response, responded_at
) VALUES (
  'test-txn-id',
  'test-buyer-id',
  'test-seller-id',
  'test-listing-id',
  'damaged',
  'approved',
  'Product was damaged, accepting return',
  NOW()
);
```

**Test Steps:**
1. Login as admin
2. Send GET request to `/api/admin/returns`
3. Verify response includes the return request
4. Verify enriched data (listing, buyer, seller, transaction)

**Expected Result:**
```json
{
  "returns": [
    {
      "id": "...",
      "status": "approved",
      "refundProcessed": false,
      "listing": { "title": "...", "price": 100000 },
      "transaction": { "amount": 100000 },
      "buyer": { "displayName": "Test Buyer" },
      "seller": { "displayName": "Test Seller" }
    }
  ],
  "pagination": { ... }
}
```

**Pass Criteria:**
- ✅ Response is 200 OK
- ✅ Returns array contains the test return
- ✅ All enriched fields are populated
- ✅ Pagination object is correct

---

### Test 2: Process Refund - Happy Path (POST /api/admin/returns/:id/process)

**Setup:**
- Use return request from Test 1
- Verify seller has wallet balance from the sale
- Note buyer wallet balance before refund

**Test Steps:**
1. Login as admin
2. POST to `/api/admin/returns/{returnId}/process`
   ```json
   {
     "action": "approve_refund",
     "adminNotes": "Test refund processing"
   }
   ```

**Expected Result:**
```json
{
  "success": true,
  "action": "refund_processed",
  "refundAmount": 100000,
  "returnRequest": {
    "id": "...",
    "status": "processed",
    "refundProcessed": true,
    "refundAmount": 100000,
    "processedBy": "admin-user-id",
    "processedAt": "2026-02-03T..."
  }
}
```

**Verification Steps:**
1. Check return_requests table:
   ```sql
   SELECT status, refund_processed, refund_amount, processed_by
   FROM return_requests
   WHERE id = 'test-return-id';
   
   -- Should show:
   -- status: 'processed'
   -- refund_processed: true
   -- refund_amount: 100000
   -- processed_by: (admin user ID)
   ```

2. Check seller wallet transactions:
   ```sql
   SELECT type, amount, description, status
   FROM wallet_transactions
   WHERE seller_id = 'test-seller-id'
   AND transaction_id = 'test-txn-id'
   ORDER BY created_at DESC;
   
   -- Should see return_reversal entries with negative amounts
   ```

3. Check buyer wallet transactions:
   ```sql
   SELECT type, amount, description, status
   FROM buyer_wallet_transactions
   WHERE buyer_id = 'test-buyer-id'
   AND transaction_id = 'test-txn-id';
   
   -- Should see refund entry with positive amount
   ```

4. Check buyer received notification:
   ```sql
   SELECT type, title, message
   FROM notifications
   WHERE user_id = 'test-buyer-id'
   AND type = 'refund_processed'
   ORDER BY created_at DESC
   LIMIT 1;
   
   -- Should show refund notification
   ```

5. Check admin audit log:
   ```sql
   SELECT action, target_type, details
   FROM admin_audit_logs
   WHERE admin_id = 'test-admin-id'
   AND action = 'PROCESS_REFUND'
   ORDER BY created_at DESC
   LIMIT 1;
   
   -- Should show refund processing action
   ```

**Pass Criteria:**
- ✅ Response is 200 OK
- ✅ Return marked as processed in database
- ✅ Seller wallet has return_reversal entries (negative)
- ✅ Buyer wallet has refund entry (positive)
- ✅ Buyer received notification
- ✅ Admin action logged in audit log
- ✅ Wallet balances are correct

---

### Test 3: Idempotency Check (Double Processing Prevention)

**Setup:**
- Use the same return request from Test 2 (already processed)

**Test Steps:**
1. Try to process the same return again
2. POST to `/api/admin/returns/{returnId}/process`
   ```json
   {
     "action": "approve_refund",
     "adminNotes": "Attempting double refund"
   }
   ```

**Expected Result:**
```json
{
  "error": "This return has already been processed",
  "processedAt": "2026-02-03T...",
  "processedBy": "admin-user-id"
}
```

**Verification:**
```sql
-- Count wallet transactions for this return
SELECT COUNT(*) 
FROM buyer_wallet_transactions
WHERE buyer_id = 'test-buyer-id'
AND transaction_id = 'test-txn-id'
AND type = 'refund';

-- Should be exactly 1 (not 2)
```

**Pass Criteria:**
- ✅ Response is 400 Bad Request
- ✅ Error message indicates already processed
- ✅ No duplicate wallet transactions created
- ✅ Buyer wallet balance unchanged from Test 2

---

### Test 4: Admin Rejection Flow

**Setup:**
- Create a new return request with status = 'approved'

**Test Steps:**
1. POST to `/api/admin/returns/{returnId}/process`
   ```json
   {
     "action": "reject",
     "adminNotes": "Return policy expired"
   }
   ```

**Expected Result:**
```json
{
  "success": true,
  "action": "rejected"
}
```

**Verification:**
```sql
SELECT status, seller_response
FROM return_requests
WHERE id = 'test-return-id';

-- Should show:
-- status: 'rejected'
-- seller_response: 'Return policy expired' (or in adminNotes)
```

**Pass Criteria:**
- ✅ Response is 200 OK
- ✅ Return status changed to 'rejected'
- ✅ NO wallet transactions created
- ✅ NO refund processed
- ✅ Admin action logged

---

### Test 5: Invalid Status Check

**Setup:**
- Create a return request with status = 'pending' (not yet approved by seller)

**Test Steps:**
1. Try to process a pending return
2. POST to `/api/admin/returns/{returnId}/process`
   ```json
   {
     "action": "approve_refund"
   }
   ```

**Expected Result:**
```json
{
  "error": "Can only process approved return requests"
}
```

**Pass Criteria:**
- ✅ Response is 400 Bad Request
- ✅ Return status unchanged
- ✅ NO wallet transactions created

---

### Test 6: Seller Approval Notification Flow

**Setup:**
- Create a new return request with status = 'pending'
- Have at least one admin user in the system

**Test Steps:**
1. Login as seller
2. PATCH to `/api/return-requests/{returnId}/respond`
   ```json
   {
     "status": "approved",
     "sellerResponse": "Agreed to return"
   }
   ```

**Expected Result:**
- Buyer receives notification with updated message
- Admin receives notification about pending return

**Verification:**
```sql
-- Check buyer notification
SELECT title, message, type
FROM notifications
WHERE user_id = 'test-buyer-id'
AND type = 'return_approved'
ORDER BY created_at DESC
LIMIT 1;

-- Should see: "الإدارة تراجع الطلب الآن..."
-- (Admin is reviewing now...)

-- Check admin notification
SELECT title, message, type
FROM notifications
WHERE user_id IN (SELECT id FROM users WHERE is_admin = true)
AND type = 'admin_return_review'
ORDER BY created_at DESC
LIMIT 1;

-- Should see: "طلب إرجاع يحتاج مراجعة"
-- (Return request needs review)
```

**Pass Criteria:**
- ✅ Buyer receives updated notification message
- ✅ Message mentions admin review (not "we will contact you")
- ✅ All admins receive notification
- ✅ Admin notification includes deep link to admin panel

---

### Test 7: Transaction Rollback on Failure

**Setup:**
- Mock a database failure scenario (requires code modification for testing)
- Or test with invalid transaction ID

**Test Steps:**
1. POST to `/api/admin/returns/{returnId}/process` with invalid data

**Expected Result:**
- Transaction should rollback
- No partial wallet changes
- Return request status unchanged
- Error response returned

**Verification:**
```sql
-- Verify NO wallet transactions created
SELECT COUNT(*) FROM wallet_transactions
WHERE transaction_id = 'invalid-txn-id';
-- Should be 0

SELECT COUNT(*) FROM buyer_wallet_transactions
WHERE transaction_id = 'invalid-txn-id';
-- Should be 0

-- Verify return status unchanged
SELECT status, refund_processed
FROM return_requests
WHERE id = 'test-return-id';
-- refund_processed should still be false
```

**Pass Criteria:**
- ✅ Error response returned (500 or 404)
- ✅ No wallet transactions created
- ✅ Return status unchanged
- ✅ Database in consistent state

---

### Test 8: Pagination Test

**Setup:**
- Create 60 return requests (to test pagination)

**Test Steps:**
1. GET `/api/admin/returns?page=1&limit=50`
2. GET `/api/admin/returns?page=2&limit=50`

**Expected Result:**
- Page 1 returns 50 items
- Page 2 returns 10 items
- Pagination metadata is correct

**Pass Criteria:**
- ✅ Correct number of items per page
- ✅ `hasMore` flag accurate
- ✅ `totalPages` calculation correct
- ✅ `total` count matches database

---

### Test 9: Status Filter Test

**Setup:**
- Create returns with different statuses: pending, approved, rejected, processed

**Test Steps:**
1. GET `/api/admin/returns?status=approved`
2. GET `/api/admin/returns?status=processed`
3. GET `/api/admin/returns` (no filter)

**Expected Result:**
- Filter returns only matching status
- No filter returns all statuses

**Pass Criteria:**
- ✅ Status filter works correctly
- ✅ Count matches filtered results
- ✅ No filter returns all records

---

### Test 10: Concurrent Admin Processing

**Setup:**
- Create one return request
- Have two admin users

**Test Steps:**
1. Admin 1 and Admin 2 both try to process same return simultaneously
2. Send two POST requests within 100ms

**Expected Result:**
- Only one request succeeds
- Other request gets idempotency error
- Only one set of wallet transactions created

**Verification:**
```sql
-- Should only have ONE refund for this transaction
SELECT COUNT(*) FROM buyer_wallet_transactions
WHERE transaction_id = 'test-txn-id'
AND type = 'refund';
-- Count should be 1
```

**Pass Criteria:**
- ✅ Only one request succeeds (200)
- ✅ Other request fails (400 - already processed)
- ✅ Only one refund created
- ✅ Database consistent

---

## Load Testing (Optional)

### Scenario: Multiple Concurrent Refunds

**Setup:**
- Create 10 return requests
- Have 3 admin users

**Test:**
- Process all 10 returns concurrently
- Verify all succeed
- Verify no race conditions
- Verify all wallet balances correct

**Tools:**
- Apache Bench (ab)
- Artillery
- k6

**Expected:**
- All requests succeed
- Response time < 500ms
- No deadlocks
- No transaction failures

---

## Integration Testing Checklist

- [ ] Migration applies successfully
- [ ] GET /api/admin/returns returns data
- [ ] POST /api/admin/returns/:id/process (approve) works
- [ ] POST /api/admin/returns/:id/process (reject) works
- [ ] Idempotency check prevents double processing
- [ ] Invalid status check works
- [ ] Seller approval triggers admin notification
- [ ] Buyer receives correct notification message
- [ ] Transaction rollback on failure
- [ ] Pagination works correctly
- [ ] Status filtering works
- [ ] Concurrent processing safe
- [ ] Wallet balances correct after refund
- [ ] Audit logs created
- [ ] TypeScript compilation succeeds
- [ ] No regression in existing features

---

## Performance Benchmarks

### Expected Response Times
- GET /api/admin/returns: < 200ms (with 50 items)
- POST /api/admin/returns/:id/process: < 500ms (includes transaction)
- Database indexes: Reduce query time by 80%

### Database Performance
```sql
-- Test index usage
EXPLAIN ANALYZE
SELECT * FROM return_requests
WHERE refund_processed = false
AND status = 'approved';

-- Should use: return_requests_status_processed_idx
```

---

## Regression Testing

### Existing Features to Verify Unchanged
- [ ] Buyer can create return requests
- [ ] Seller can view return requests
- [ ] Seller can approve/reject returns
- [ ] Return eligibility check still works
- [ ] Return policy validation unchanged
- [ ] Existing wallet transactions unaffected
- [ ] Existing notifications still sent
- [ ] Seller dashboard return tab works
- [ ] Buyer dashboard shows returns

---

## Security Testing

### Authorization Tests
- [ ] Non-admin cannot access /api/admin/returns
- [ ] Non-admin cannot process refunds
- [ ] CSRF token required for POST requests
- [ ] Admin user validation works
- [ ] Audit log captures admin ID correctly

### Data Validation Tests
- [ ] Invalid action rejected
- [ ] Invalid return ID handled
- [ ] Missing transaction handled
- [ ] SQL injection attempts blocked
- [ ] XSS in admin notes sanitized

---

## Deployment Testing

### Staging Environment
1. Deploy to staging
2. Run migration
3. Run all test cases
4. Verify no errors in logs
5. Test rollback procedure

### Production Deployment
1. **Pre-deployment:**
   - Backup database
   - Review migration one final time
   - Have rollback plan ready

2. **Deployment:**
   - Apply migration during low-traffic period
   - Deploy backend code
   - Monitor error logs
   - Monitor admin notifications

3. **Post-deployment:**
   - Process one test return manually
   - Verify wallet transactions
   - Check audit logs
   - Monitor for 24 hours

### Rollback Plan
If issues detected:
```sql
-- Rollback columns (safe - data preserved)
ALTER TABLE return_requests
DROP COLUMN IF EXISTS refund_processed,
DROP COLUMN IF EXISTS refund_amount,
DROP COLUMN IF EXISTS admin_notes,
DROP COLUMN IF EXISTS processed_by,
DROP COLUMN IF EXISTS processed_at;

-- Rollback code
git revert <commit-hash>
```

---

## Success Criteria

**All tests must pass before proceeding to Step 2 (Admin UI)**

### Critical Tests (Must Pass):
- ✅ Refund processing works correctly
- ✅ Wallet balances accurate
- ✅ Idempotency prevents double refunds
- ✅ Transaction rollback on failure
- ✅ Admin notifications sent

### Important Tests (Should Pass):
- ✅ Pagination works
- ✅ Status filtering works
- ✅ Concurrent processing safe
- ✅ TypeScript compiles

### Nice-to-Have Tests (Can Fix Later):
- Performance meets benchmarks
- Load testing passes
- Security tests pass

---

## Test Results Log

**Tester:**  
**Date:**  
**Environment:**  

| Test | Status | Notes |
|------|--------|-------|
| Test 1: View Returns | ⬜ | |
| Test 2: Process Refund | ⬜ | |
| Test 3: Idempotency | ⬜ | |
| Test 4: Admin Rejection | ⬜ | |
| Test 5: Invalid Status | ⬜ | |
| Test 6: Notifications | ⬜ | |
| Test 7: Rollback | ⬜ | |
| Test 8: Pagination | ⬜ | |
| Test 9: Filtering | ⬜ | |
| Test 10: Concurrency | ⬜ | |

**Overall Status:** ⬜ Pass / ⬜ Fail

**Next Action:** ⬜ Proceed to Step 2 / ⬜ Fix Issues
