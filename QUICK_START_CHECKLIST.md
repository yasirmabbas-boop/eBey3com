# Push Notifications - Quick Start Checklist

Use this checklist to get push notifications working in the correct order.

---

## ✅ STEP 1: Install Dependencies (5 minutes)

```bash
npm install firebase-admin
# Sentry already installed
```

**Verify:**
```bash
npm list firebase-admin @sentry/node @sentry/react
# Should show versions installed
```

---

## ✅ STEP 2: Firebase Setup (2 hours)

📖 **Follow:** `FIREBASE_SETUP_GUIDE.md`

**Tasks:**
- [ ] Create Firebase project: `ebay-iraq-prod`
- [ ] Add Android app (`iq.ebay3.app`)
- [ ] Download `google-services.json`
- [ ] Place in: `android/app/google-services.json`
- [ ] Add iOS app (`iq.ebay3.app`)
- [ ] Download `GoogleService-Info.plist`
- [ ] Place in: `ios/App/App/GoogleService-Info.plist`
- [ ] Generate service account private key
- [ ] Copy FCM credentials to `.env`

**Verify:**
```bash
ls -la android/app/google-services.json
ls -la ios/App/App/GoogleService-Info.plist
grep FCM_PROJECT_ID .env
```

---

## ✅ STEP 3: iOS APNS Setup (2 hours)

📖 **Follow:** `IOS_APNS_SETUP_GUIDE.md`

**Tasks:**
- [ ] Go to Apple Developer Portal
- [ ] Create new APNS key (.p8 file)
- [ ] **Download .p8 file** (ONLY DOWNLOADABLE ONCE - save securely!)
- [ ] Note Key ID (10 characters)
- [ ] Note Team ID (10 characters)
- [ ] Copy APNS credentials to `.env`
- [ ] Open Xcode: `npx cap open ios`
- [ ] Drag `GoogleService-Info.plist` into Xcode (check "Copy items")
- [ ] Add Push Notification capability (Signing & Capabilities tab)

**Verify:**
```bash
grep APNS_KEY_ID .env
grep APNS_TEAM_ID .env
# In Xcode: Check Push Notifications capability is enabled
```

---

## ✅ STEP 4: Sentry Setup (15 minutes)

**Tasks:**
- [ ] Go to [sentry.io](https://sentry.io) and create free account
- [ ] Create new project: "ebay-iraq-backend"
- [ ] Copy DSN for backend
- [ ] Create another project: "ebay-iraq-frontend"
- [ ] Copy DSN for frontend
- [ ] Add both to `.env`

**Verify:**
```bash
grep SENTRY_DSN .env
grep VITE_SENTRY_DSN .env
```

---

## ✅ STEP 5: Configure Replit Secrets (30 minutes)

**Tasks:**
- [ ] In Replit: Tools → Secrets
- [ ] Add `FCM_PROJECT_ID`
- [ ] Add `FCM_CLIENT_EMAIL`
- [ ] Add `FCM_PRIVATE_KEY` (keep \n characters!)
- [ ] Add `APNS_KEY_ID`
- [ ] Add `APNS_TEAM_ID`
- [ ] Add `APNS_PRIVATE_KEY` (keep \n characters!)
- [ ] Add `APNS_PRODUCTION` (set to "false")
- [ ] Add `SENTRY_DSN`
- [ ] Add `VITE_SENTRY_DSN`

**Verify:**
- [ ] All 10 new secrets added
- [ ] No secrets visible in your code or git

---

## ✅ STEP 6: Run Database Migration (10 minutes)

**Option A: Using Drizzle (Recommended)**
```bash
npm run db:push
```

**Option B: Manual SQL**
```bash
psql $DATABASE_URL -f migrations/0022_add_push_notification_fields.sql
```

**Verify migration succeeded:**
```sql
-- Connect to database and run:
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'push_subscriptions' 
ORDER BY ordinal_position;

-- Should show: id, user_id, platform, endpoint, p256dh, auth, fcm_token, 
--              device_id, device_name, last_used, created_at

SELECT indexname FROM pg_indexes 
WHERE tablename = 'push_subscriptions';

-- Should show 4 indexes: idx_push_user_platform, idx_push_token, 
--                       idx_push_device, idx_push_last_used
```

---

## ✅ STEP 7: Build & Sync (15 minutes)

```bash
# Build web assets
npm run build

# Sync to native platforms
npx cap sync

# Verify sync successful
ls -la android/app/src/main/assets/public/index.html
ls -la ios/App/App/public/index.html
```

**Verify config files:**
```bash
# Android
ls -la android/app/google-services.json

# iOS
npx cap open ios
# Check GoogleService-Info.plist appears in Xcode project navigator
```

---

## ✅ STEP 8: Test Backend Locally (30 minutes)

```bash
# Start server
npm run dev

# Check startup logs for:
# ✅ "Firebase Admin SDK initialized successfully"
# ✅ "Sentry error tracking initialized"
# ✅ "WebSocket server initialized"
# ✅ "Auction processor started"
```

**Test endpoints:**
```bash
# Test VAPID key endpoint
curl http://localhost:5000/api/push/vapid-public-key
# Should return: {"publicKey":"BN..."}

# Test with logged-in session (use browser)
# 1. Log in to app
# 2. Open DevTools → Network tab
# 3. Try registering for notifications
# 4. Check POST /api/push/register-native returns {"success":true}
```

**If errors:**
- Check environment variables loaded
- Check database migration ran
- Check Firebase credentials correct
- Check Sentry DSN valid

---

## ✅ STEP 9: Test on Android Device (2 hours)

📖 **Follow:** `TESTING_GUIDE.md` → Test 1: Android Device Testing

**Quick test:**
```bash
# Build and run
npx cap run android

# Or manually:
npx cap open android
# Then click Run in Android Studio
```

**On device:**
- [ ] App launches successfully
- [ ] Log in with test account
- [ ] Wait for notification prompt (5 seconds)
- [ ] Enable notifications
- [ ] Check Android Studio Logcat for FCM token
- [ ] Copy token for testing

**Send test notification:**
- [ ] Firebase Console → Cloud Messaging → Send test message
- [ ] Paste FCM token
- [ ] Send notification
- [ ] **✅ Notification appears on device**

**Test in Arabic:**
- [ ] Trigger real notification (place bid, get outbid)
- [ ] **✅ Notification text in Arabic**

**Test in Kurdish:**
- [ ] Change language to Kurdish in app
- [ ] Trigger notification
- [ ] **✅ Notification text in Kurdish**

---

## ✅ STEP 10: Test on iPhone (2 hours)

⚠️ **MUST use physical iPhone - simulator doesn't support push!**

📖 **Follow:** `TESTING_GUIDE.md` → Test 2: iOS Device Testing

**Quick test:**
```bash
# Open in Xcode
npx cap open ios

# Select your iPhone as target
# Click Run (▶️)
```

**On iPhone:**
- [ ] App launches
- [ ] Log in
- [ ] Enable notifications when prompted
- [ ] Check Xcode console for FCM token
- [ ] Copy token

**Send test notification:**
- [ ] Firebase Console → Send test message
- [ ] **✅ Notification appears on iPhone lock screen**
- [ ] **✅ Sound plays**
- [ ] **✅ Badge count increases**
- [ ] Tap notification
- [ ] **✅ Opens correct page in app**

**Test both languages:**
- [ ] Test Arabic notifications
- [ ] Switch to Kurdish
- [ ] **✅ Notifications in Kurdish**

---

## ✅ STEP 11: Test Web Push (30 minutes)

**Quick test:**
```bash
# Open in browser (Chrome recommended)
http://localhost:5000

# Or production URL
https://your-app.replit.app
```

**In browser:**
- [ ] Log in
- [ ] Wait for notification prompt
- [ ] Enable notifications
- [ ] Check DevTools console for subscription
- [ ] Trigger notification (place bid)
- [ ] **✅ Browser notification appears**

---

## ✅ STEP 12: Multi-Device Test (30 minutes)

**Scenario:**
- [ ] Log in on Android
- [ ] Enable notifications
- [ ] Log in on iPhone (same account)
- [ ] Enable notifications
- [ ] Check database: 2 push subscriptions for user
- [ ] Trigger notification (send yourself a message)
- [ ] **✅ Both devices receive notification**
- [ ] **✅ Both in correct language**

---

## ✅ STEP 13: App Store Preparation (8 hours)

📖 **Follow:** `APP_STORE_SUBMISSION_GUIDE.md`

**Google Play:**
- [ ] Create app listing in Play Console
- [ ] Upload screenshots (minimum 2)
- [ ] Fill out data safety section
- [ ] Build release AAB: `cd android && ./gradlew bundleRelease`
- [ ] Upload AAB to Play Console
- [ ] Submit for review

**Apple App Store:**
- [ ] Create app in App Store Connect
- [ ] Upload screenshots (minimum 3 per size)
- [ ] Fill out app privacy section
- [ ] Archive in Xcode: Product → Archive
- [ ] Upload to App Store Connect
- [ ] Submit for review

---

## ✅ STEP 14: Deploy to Production (1 hour)

**Deploy:**
```bash
# Commit all changes
git add .
git commit -m "Implement push notifications with Kurdish support"
git push origin main

# Replit Deployments auto-deploys
# Wait ~5 minutes for deployment
```

**Verify deployment:**
- [ ] Check deployment logs in Replit
- [ ] Visit production URL
- [ ] Check logs for:
  - "✅ Firebase Admin SDK initialized successfully"
  - "✅ Sentry error tracking initialized"
- [ ] Test notification registration on production

---

## ✅ STEP 15: Monitor First 48 Hours (Ongoing)

**Daily checks:**
- [ ] Check Sentry for errors: https://sentry.io
- [ ] Check Firebase delivery metrics
- [ ] Run notification stats query (see below)
- [ ] Respond to app store reviews
- [ ] Monitor user feedback

**Stats query:**
```sql
SELECT 
  COUNT(*) as total_notifications,
  COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) as delivered,
  COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
  ROUND(100.0 * COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) / COUNT(*), 2) as delivery_rate,
  ROUND(100.0 * COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) / COUNT(*), 2) as open_rate
FROM notifications
WHERE created_at > now() - interval '24 hours';
```

**Target metrics:**
- Delivery rate: >95% ✅
- Open rate: >30% ✅
- Error rate: <1% ✅

---

## 🚨 Common Issues & Quick Fixes

### "FCM not initialized" error
```bash
# Check environment variables
grep FCM .env

# Verify format (must have \n):
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"

# Restart server
npm run dev
```

### "Invalid APNS token" error
```bash
# For TestFlight: APNS_PRODUCTION=false
# For App Store: APNS_PRODUCTION=true

# Verify key and team ID match Apple Developer Portal
grep APNS .env
```

### Notifications not appearing
```bash
# 1. Check device permissions
#    iOS: Settings → E-بيع → Notifications (must be ON)
#    Android: Settings → Apps → E-بيع → Notifications (must be ON)

# 2. Check token registered
psql $DATABASE_URL -c "SELECT platform, COUNT(*) FROM push_subscriptions GROUP BY platform;"
# Should show subscriptions

# 3. Test with Firebase Console test message
# Firebase → Cloud Messaging → Send test message
# Use FCM token from device logs

# 4. Check Sentry for errors
# https://sentry.io → Issues
```

### Database migration failed
```bash
# Check current schema
psql $DATABASE_URL -c "\d push_subscriptions"

# If missing columns, run migration again
psql $DATABASE_URL -f migrations/0022_add_push_notification_fields.sql

# Verify indexes
psql $DATABASE_URL -c "SELECT indexname FROM pg_indexes WHERE tablename='push_subscriptions';"
```

---

## 📊 Success Criteria

Before marking as complete:

**Code:**
- [x] All 15 TODOs completed
- [x] No linter errors
- [x] TypeScript types updated
- [x] All files created/modified

**Configuration:**
- [ ] Firebase project created
- [ ] APNS keys generated
- [ ] Environment variables set
- [ ] Database migration run
- [ ] Replit Secrets configured

**Testing:**
- [ ] Android notifications work
- [ ] iOS notifications work
- [ ] Web push works
- [ ] Arabic language works
- [ ] Kurdish language works
- [ ] Multi-device works
- [ ] Rate limiting works
- [ ] Token cleanup works

**Documentation:**
- [x] Firebase setup guide
- [x] iOS APNS guide
- [x] Testing guide
- [x] App store submission guide
- [x] This quick start checklist

**Deployment:**
- [ ] Deployed to production
- [ ] Monitoring with Sentry
- [ ] App store submissions
- [ ] Launch! 🚀

---

## 🎯 Your Current Progress

```
✅ COMPLETED (Jan 30):
  • All backend code implemented
  • All frontend code updated
  • Kurdish translations added
  • Privacy policy updated
  • Documentation created
  • Database migration created
  • Rate limiting implemented
  • Sentry configured

⏳ TODO THIS WEEK (Feb 3-9):
  • Firebase setup (2 hours)
  • iOS APNS setup (2 hours)
  • Install firebase-admin (5 min)
  • Run database migration (5 min)
  • Set environment variables (30 min)
  • Test on devices (4 hours)

📅 NEXT WEEKS:
  • Week 2-3: Testing & bug fixes
  • Week 4: App store submission
  • Feb 28: LAUNCH!
```

---

## 📞 Need Help?

**Documentation:**
- Firebase issues → `FIREBASE_SETUP_GUIDE.md`
- iOS issues → `IOS_APNS_SETUP_GUIDE.md`
- Testing → `TESTING_GUIDE.md`
- App stores → `APP_STORE_SUBMISSION_GUIDE.md`

**Check Logs:**
```bash
# Backend logs
npm run dev
# Look for: ✅ success messages or ❌ errors

# Sentry dashboard
https://sentry.io
# Check "Issues" tab for errors

# Firebase Console
https://console.firebase.google.com
# Check Cloud Messaging → Stats
```

**Debug Mode:**
```bash
# Enable verbose logging
export DEBUG=firebase-admin:*
npm run dev
```

---

## 🎉 You're Ready!

All code is implemented. Just follow Steps 2-15 to go live!

**Estimated time to launch:** 25-30 hours (including testing)

**Start with:** `FIREBASE_SETUP_GUIDE.md` 👈

---

Good luck! 🚀
