# Push Notification Testing Guide

Complete testing checklist for push notifications across all platforms.

## Prerequisites

Before testing:
- [ ] Firebase setup completed (`google-services.json` and `GoogleService-Info.plist` in place)
- [ ] Environment variables configured (FCM, APNS, SENTRY)
- [ ] Database migration run successfully
- [ ] Backend deployed and running
- [ ] Build completed: `npm run build:mobile`

## Test 1: Android Device Testing

### Setup
1. Connect Android device via USB (or use emulator)
2. Enable Developer Mode on device
3. Run: `npx cap run android` (opens Android Studio)
4. Click "Run" in Android Studio

### Test Steps
```
✅ 1. App launches successfully
✅ 2. Log in with test account
✅ 3. Wait 5 seconds for push notification prompt
✅ 4. Click "Enable Notifications" button
✅ 5. Accept Android permission dialog
✅ 6. Check Logcat for: "Push registration success, token: ..."
✅ 7. Copy FCM token from logs
```

### Send Test Notification
```bash
# Method 1: Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Click "Send test message"
3. Paste FCM token
4. Title: "Test Arabic" / Body: "اختبار الإشعارات"
5. Click "Test"
6. ✅ Notification appears on device

# Method 2: From your app (if implemented)
1. POST /api/push/test (development only)
2. Check device receives notification
```

### Test Arabic Language
```
✅ 1. Keep app language as Arabic
✅ 2. Place a bid on an auction
✅ 3. Get outbid by another user
✅ 4. Check notification appears in Arabic
```

### Test Kurdish Language
```
✅ 1. Change app language to Kurdish (Settings)
✅ 2. Place a bid on an auction
✅ 3. Get outbid
✅ 4. ✅ Notification appears in Kurdish
```

### Test Notification Tap
```
✅ 1. Receive notification while app is closed
✅ 2. Tap notification
✅ 3. App opens to correct page (e.g., /product/123)
✅ 4. Navigation works correctly
```

### Test Background Notifications
```
✅ 1. Close app completely (swipe away)
✅ 2. Send test notification
✅ 3. ✅ Notification appears even when app closed
✅ 4. Tap notification opens app
```

## Test 2: iOS Device Testing

⚠️ **IMPORTANT:** Push notifications do NOT work in iOS Simulator. You MUST use a physical iPhone.

### Setup
1. Connect iPhone to Mac via USB
2. Enable Developer Mode on iPhone: Settings → Privacy & Security → Developer Mode
3. Run: `npx cap open ios`
4. In Xcode, select your iPhone as target device
5. Click "Run" (▶️ button)

### Test Steps
```
✅ 1. App launches on iPhone
✅ 2. Log in with test account
✅ 3. Wait for push notification prompt
✅ 4. Click "Enable Notifications"
✅ 5. Accept iOS permission dialog
✅ 6. Check Xcode console for FCM token
✅ 7. Copy token for testing
```

### Send Test Notification
```bash
# Firebase Console test message
1. Go to Firebase Console → Cloud Messaging
2. Send test message with iOS FCM token
3. ✅ Notification appears on iPhone
```

### Test Notification Features
```
✅ 1. Notification appears on lock screen
✅ 2. Notification shows in Notification Center
✅ 3. Badge count increases
✅ 4. Sound plays
✅ 5. Haptic feedback works
✅ 6. Tap opens correct page
```

### Test Arabic & Kurdish
```
✅ 1. Test in Arabic (same as Android)
✅ 2. Switch to Kurdish
✅ 3. ✅ Notifications appear in Kurdish
```

## Test 3: Web Browser Testing (PWA)

### Test in Chrome/Edge/Safari
```
✅ 1. Open app in browser
✅ 2. Log in
✅ 3. Wait for push notification prompt
✅ 4. Click "Enable Notifications"
✅ 5. Accept browser permission
✅ 6. Check browser console for subscription
```

### Send Web Push Test
```
✅ 1. Use Firebase test message (if using FCM for web)
✅ 2. OR create auction and test real notifications
✅ 3. ✅ Notification appears in browser
✅ 4. Click notification opens app tab
```

## Test 4: Multi-Device Testing

### Scenario: User with iPhone + Android
```
✅ 1. Log in on iPhone, enable notifications
✅ 2. Log in on Android (same account), enable notifications
✅ 3. Send test notification via backend
✅ 4. ✅ BOTH devices receive notification
✅ 5. Tap on Android → opens Android app
✅ 6. Tap on iPhone → opens iOS app
```

### Scenario: User with 3 devices (iPhone + Android + Web)
```
✅ 1. Enable notifications on all 3
✅ 2. Check database: 3 push subscriptions for user
✅ 3. Send notification
✅ 4. ✅ All 3 devices receive notification
```

## Test 5: Token Cleanup Testing

### Invalid Token Scenario
```
✅ 1. Manually corrupt FCM token in database
✅ 2. Send notification to user
✅ 3. ✅ Backend logs "Invalid FCM token" error
✅ 4. ✅ Token deleted from database
✅ 5. Check DB: subscription removed
```

### Uninstall Scenario
```
✅ 1. Register device for notifications
✅ 2. Uninstall app
✅ 3. Send notification (FCM returns 404)
✅ 4. ✅ Token automatically deleted from database
```

## Test 6: Offline Testing

### Device Offline
```
✅ 1. Enable airplane mode on device
✅ 2. Send notification from backend
✅ 3. Wait 30 seconds
✅ 4. Disable airplane mode
✅ 5. ✅ Notification appears (FCM queued it)
```

### Extended Offline (3 days)
```
✅ 1. Keep device offline for 3 days
✅ 2. Send notifications during offline period
✅ 3. Turn device back online
✅ 4. ✅ FCM delivers queued notifications (up to 28 days)
```

## Test 7: Rate Limiting

### Spam Prevention
```
✅ 1. Trigger 25 outbid notifications rapidly
✅ 2. ✅ Only first 20 sent (high priority limit)
✅ 3. Check logs: "User exceeded limit"
✅ 4. Wait 24 hours
✅ 5. ✅ Limits reset, notifications work again
```

## Test 8: Notification Batching

### Message Batching
```
✅ 1. Send 5 messages from User A to User B within 5 minutes
✅ 2. ✅ User B receives 1 batched notification: "5 رسائل جديدة"
✅ 3. Tap notification → opens messages
```

### Outbid Batching
```
✅ 1. Get outbid 3 times within 15 minutes
✅ 2. ✅ Receive 1 batched notification: "3 مزايدات جديدة"
✅ 3. Not 3 separate notifications
```

## Test 9: Real-Time Flow Testing

### Complete Auction Flow
```
✅ 1. User A lists an auction
✅ 2. User B places bid
✅ 3. User C places higher bid
✅ 4. ✅ User B gets "outbid" notification (Arabic or Kurdish based on preference)
✅ 5. Auction ends
✅ 6. ✅ User C gets "auction_won" notification
✅ 7. ✅ User B gets "auction_lost" notification
✅ 8. ✅ User A gets "auction_sold" notification
✅ 9. All notifications in correct language
```

### Message Flow
```
✅ 1. User A sends message to User B
✅ 2. ✅ User B gets notification (if app closed)
✅ 3. ✅ User B gets WebSocket message (if app open)
✅ 4. User B taps notification
✅ 5. ✅ Opens to conversation with User A
```

### Offer Flow
```
✅ 1. User A makes offer on User B's listing
✅ 2. ✅ User B gets "offer_received" notification
✅ 3. User B accepts offer
✅ 4. ✅ User A gets "offer_accepted" notification
✅ 5. Other pending offers auto-rejected
✅ 6. ✅ Other buyers get "offer_rejected" notifications
```

## Test 10: Language-Specific Testing

### Arabic Notifications
```
Text should be RTL (right-to-left)
Numbers should display correctly: ١٢٣ or 123 (both acceptable)
Currency: "د.ع" displays correctly
Emoji placement correct (after text, not before)
```

### Kurdish Notifications
```
Text should be RTL
Kurdish-specific characters render: ە، ێ، ڵ، ۆ، ی
Numbers display correctly
Reads naturally in Kurdish
```

## Test 11: Error Scenarios

### Notification Permission Denied
```
✅ 1. User denies notification permission
✅ 2. ✅ App continues working
✅ 3. ✅ In-app notifications still work (WebSocket)
✅ 4. User goes to device settings, enables notifications
✅ 5. Returns to app
✅ 6. ✅ App registers for push (detects permission change)
```

### Network Failure
```
✅ 1. Disconnect internet
✅ 2. Try to register for notifications
✅ 3. ✅ Graceful error handling
✅ 4. Reconnect internet
✅ 5. ✅ Registration succeeds
```

### Backend Down
```
✅ 1. Stop backend server
✅ 2. Try to enable notifications
✅ 3. ✅ Error message shown
✅ 4. ✅ App doesn't crash
```

## Test 12: Performance Testing

### Memory Leak Check
```
✅ 1. Keep app open for 1 hour
✅ 2. Receive 20 notifications
✅ 3. Check device memory usage
✅ 4. ✅ No significant memory increase
```

### Battery Drain Test
```
✅ 1. Enable notifications
✅ 2. Use app normally for 24 hours
✅ 3. Check battery usage in device settings
✅ 4. ✅ App not in top battery consumers
```

## Test 13: Database Validation

### Check Data Integrity
```sql
-- Check push subscriptions
SELECT user_id, platform, COUNT(*) as device_count
FROM push_subscriptions
GROUP BY user_id, platform
ORDER BY device_count DESC;

-- Should see users with multiple devices

-- Check notification delivery
SELECT 
  delivery_status,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 2) as percentage
FROM notifications
WHERE created_at > now() - interval '24 hours'
GROUP BY delivery_status;

-- Should show >95% 'sent'

-- Check indexes exist
SELECT indexname FROM pg_indexes 
WHERE tablename IN ('notifications', 'push_subscriptions');

-- Should show all indexes from migration
```

## Test 14: Production Readiness

### Pre-Launch Checklist
```
Backend:
✅ All environment variables set in Replit Secrets
✅ Database migration run successfully
✅ Sentry DSN configured
✅ Firebase credentials valid
✅ APNS keys valid
✅ Cron jobs running (check logs)

Android:
✅ google-services.json in android/app/
✅ Build successful
✅ APK/AAB signed
✅ Tested on physical device
✅ Notification icon looks good

iOS:
✅ GoogleService-Info.plist in Xcode project
✅ Push capability enabled
✅ Tested on physical iPhone
✅ TestFlight build works
✅ Notification format looks good

Privacy & Compliance:
✅ Privacy policy mentions notifications
✅ App store descriptions mention notifications
✅ Notification usage clear to users
✅ GDPR compliance (if applicable)
```

## Test 15: Sentry Error Tracking

### Verify Sentry Works
```
✅ 1. Go to https://sentry.io
✅ 2. Check "Issues" tab
✅ 3. Trigger a test error (try sending invalid notification)
✅ 4. ✅ Error appears in Sentry within 1 minute
✅ 5. Check error details, stack trace
✅ 6. Verify source maps working (shows actual code, not minified)
```

## Troubleshooting Common Issues

### Android: No Notification Received
```
❌ Problem: Notification not appearing

✅ Solutions:
1. Check Logcat for errors
2. Verify google-services.json is correct
3. Check notification permission in Settings → Apps → E-بيع
4. Verify FCM token in database
5. Test with Firebase Console test message
6. Check battery optimization (disable for E-بيع)
```

### iOS: No Notification Received
```
❌ Problem: Notification not appearing

✅ Solutions:
1. MUST use physical device (not simulator)
2. Check Xcode console for errors
3. Verify GoogleService-Info.plist in project
4. Check Settings → E-بيع → Notifications enabled
5. Verify APNS_PRODUCTION matches (false for TestFlight)
6. Check push capability enabled in Xcode
7. Rebuild and reinstall app
```

### Web: No Notification Received
```
❌ Problem: Web push not working

✅ Solutions:
1. Check browser console for errors
2. Verify service worker registered
3. Check VAPID keys in .env
4. Test in Chrome (best support)
5. Check browser notification settings
6. Try incognito mode (fresh state)
```

### Notification in Wrong Language
```
❌ Problem: User set Kurdish but gets Arabic

✅ Solutions:
1. Check user.language in database
2. Verify getNotificationMessage() is called
3. Check notification-messages.ts has Kurdish translations
4. Verify language saved when user changes it
5. Test: Change language → Log out → Log in → Trigger notification
```

### Token Not Saved
```
❌ Problem: FCM token not in database

✅ Solutions:
1. Check /api/push/register-native endpoint
2. Verify createPushSubscription() called
3. Check database migration ran
4. Verify push_subscriptions table has new columns
5. Check backend logs for errors
6. Test endpoint with Postman
```

## Success Metrics Targets

After testing, verify:
```
✅ Notification delivery rate: >95%
✅ Notification open rate: >30%
✅ WebSocket connection success: >98%
✅ Average delivery latency: <2 seconds
✅ Error rate: <1%
✅ User complaint rate: <0.5%
```

## Performance Benchmarks

Expected performance:
```
Notification send time: <500ms
Database query time: <100ms
FCM delivery time: <1 second
Total user-to-notification: <2 seconds
```

## Final Approval Checklist

Before marking as complete:
```
✅ All 15 test scenarios passed
✅ Both Arabic and Kurdish work
✅ All 3 platforms tested (Android, iOS, Web)
✅ Multi-device scenario works
✅ Rate limiting works
✅ Batching works
✅ Token cleanup works
✅ Offline scenarios work
✅ Error tracking in Sentry works
✅ Performance meets benchmarks
✅ Privacy policy updated
✅ App store descriptions ready
✅ Production environment configured
```

## Next Steps After Testing

1. Mark device-testing TODO as complete
2. Fix any bugs found during testing
3. Proceed to app store submission
4. Monitor Sentry for 48 hours post-launch
5. Check notification delivery metrics daily

## Support Contacts

If you encounter issues during testing:
- Firebase Support: https://firebase.google.com/support
- Capacitor Docs: https://capacitorjs.com/docs/apis/push-notifications
- Sentry Support: https://sentry.io/support/

## Testing Timeline

Recommended testing schedule:
- Day 1: Android testing (3 hours)
- Day 2: iOS testing (3 hours)
- Day 3: Web + multi-device (2 hours)
- Day 4: Edge cases + performance (2 hours)
- Day 5: Fix bugs found (variable)

**Total: 10-15 hours testing** (includes bug fixes)
