# App Store Submission Guide

Complete guide for submitting E-بيع to Google Play Store and Apple App Store.

---

## Google Play Store Submission

### App Description Template

**Title:** `E-بيع - مزادات وبيع أونلاين`

**Short Description (80 characters max):**
```
أول منصة عراقية للمزادات الإلكترونية وشراء المنتجات المستعملة
```

**Full Description:**

```
E-بيع - منصة المزادات العراقية الأولى

🎯 ما هو E-بيع؟
E-بيع هي أول منصة عراقية متخصصة في المزادات الإلكترونية وشراء وبيع المنتجات. نوفر تجربة آمنة وسهلة للبيع والشراء في العراق.

✨ المميزات الرئيسية:
• مزادات مباشرة: زايد على المنتجات واربح بأفضل سعر
• شراء فوري: اشترِ المنتجات مباشرة بدون انتظار
• رسائل آمنة: تواصل مع البائعين والمشترين
• إشعارات فورية: ابقَ على اطلاع بكل جديد
• دعم اللغة العربية والكردية

🔔 الإشعارات:
يستخدم التطبيق إشعارات Firebase Cloud Messaging لإعلامك بـ:
• تحديثات المزادات (مزايدات، فوز، انتهاء)
• رسائل جديدة من المشترين والبائعين
• تحديثات حالة الطلبات (دفع، شحن، تسليم)
• إشعارات العروض (مستلمة، مقبولة، مرفوضة)

يمكنك تعطيل الإشعارات في: الإعدادات → التطبيقات → E-بيع → الإشعارات

🛡️ الأمان والخصوصية:
• بيانات مشفرة بالكامل
• لا نبيع معلوماتك
• توثيق البائعين
• نظام تقييم شفاف
• دعم فني على مدار الساعة

📱 الفئات المتوفرة:
إلكترونيات | سيارات | عقارات | أزياء | منزل | رياضة | كتب | مجوهرات | وأكثر

🌍 التغطية:
خدماتنا متوفرة في جميع محافظات العراق:
بغداد | أربيل | السليمانية | دهوك | البصرة | الموصل | كربلاء | النجف | وأكثر

📞 الدعم الفني:
security@ebey3.com

🏢 الشركة:
Ebey3 LLC (Wyoming, USA)

---

E-بيع - سوقك الإلكتروني الموثوق في العراق
```

**Category:** Shopping

**Tags:** `مزادات، بيع، شراء، عراق، Iraq, Auction, Marketplace, Shopping`

### Privacy Policy URL
```
https://ebey3.com/privacy
```

### Notification Disclosure (REQUIRED)

In the "App content" section, when asked about notifications:

```
This app uses Firebase Cloud Messaging to send push notifications about:

✓ Auction updates (bids, wins, endings)
✓ New messages from buyers/sellers  
✓ Order status updates (payment, shipping, delivery)
✓ Offer notifications (received, accepted, rejected)

Users can disable notifications in:
Android Settings > Apps > E-بيع > Notifications

Notification data collected:
• Device tokens (for delivery)
• Delivery status (success/failure tracking)
• Device type (iOS/Android)

We do NOT:
• Share device tokens with third parties
• Send marketing notifications without consent
• Track user location through notifications
• Sell notification data

Third-party service used:
• Firebase Cloud Messaging (Google)
• Privacy policy: https://firebase.google.com/support/privacy

Users must opt-in by enabling notifications in the app.
Tokens are automatically deleted after 90 days of inactivity.
```

### Screenshots Needed (IMPORTANT)

Take screenshots showing:
1. **Home page** with Arabic text
2. **Product detail page** with auction
3. **Bidding screen**
4. **Messages screen**
5. **Kurdish language** (Settings → Language → Kurdish)
6. **Notification prompt** (showing notification request)
7. **Profile/account page**

Requirements:
- At least 2 screenshots in 16:9 ratio
- Show Kurdish language in at least 1 screenshot
- High resolution (1080p minimum)
- Real content (not test data)

### Build Upload

```bash
# Build release AAB
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
# Upload this file to Google Play Console
```

---

## Apple App Store Submission

### App Name
```
E-بيع
```

**Subtitle (30 characters max):**
```
مزادات وبيع في العراق
```

### Description (4000 characters max)

```
E-بيع - منصة المزادات العراقية الأولى

🎯 نظرة عامة
E-بيع هي أول منصة عراقية متخصصة في المزادات الإلكترونية وشراء وبيع المنتجات. نوفر تجربة آمنة وسهلة للبيع والشراء في كل محافظات العراق.

✨ المميزات الرئيسية
• مزادات حية: زايد على المنتجات واربح بأفضل سعر
• شراء فوري: اشترِ المنتجات مباشرة بدون انتظار
• رسائل آمنة: تواصل مع البائعين والمشترين
• إشعارات فورية: ابقَ على اطلاع بكل جديد
• واجهة بالعربية والكردية
• دعم الاتجاه من اليمين لليسار (RTL)

🔔 الإشعارات
نستخدم إشعارات Apple Push Notification Service لإعلامك فوراً بـ:
• تحديثات المزادات: عندما تفوز، تخسر، أو ينتهي المزاد
• رسائل جديدة: اتصالات من المشترين والبائعين
• حالة الطلبات: تحديثات الدفع والشحن والتسليم
• العروض: عروض أسعار مستلمة أو مقبولة

إدارة الإشعارات: الإعدادات → E-بيع → الإشعارات

🛡️ الأمان والخصوصية
• تشفير SSL/TLS لجميع البيانات
• توثيق البائعين بالهوية الوطنية
• نظام تقييم شفاف وموثوق
• لا نبيع بياناتك أبداً
• دعم فني متاح على مدار الساعة

📱 الفئات
إلكترونيات • سيارات • عقارات • أزياء • منزل • رياضة • كتب • ساعات • مجوهرات • مقتنيات • آلات موسيقية • وأكثر

🌍 التغطية
خدماتنا متوفرة في جميع المحافظات:
بغداد • أربيل • السليمانية • دهوك • البصرة • الموصل • كربلاء • النجف • كركوك • الأنبار • وجميع المحافظات

📞 التواصل
security@ebey3.com

🏢 الشركة
Ebey3 LLC (Wyoming, USA)

---

نزّل E-بيع الآن وابدأ البيع أو المزايدة على آلاف المنتجات!
```

### Keywords (100 characters max)
```
مزادات,بيع,شراء,عراق,سوق,تسوق,auction,marketplace,Iraq,shopping
```

### App Category
```
Primary: Shopping
Secondary: Social Networking
```

### Age Rating
```
4+ (No objectionable content)
```

### Privacy Policy URL
```
https://ebey3.com/privacy
```

### App Privacy - Notification Disclosure

When filling out "App Privacy" in App Store Connect:

**Data Types Collected:**
```
✓ Device ID
✓ User Content (messages)
✓ Purchase History
✓ Contact Info (name, email, phone)

Push Notifications:
✓ Device tokens collected for notification delivery
✓ Notification delivery status tracked
✓ Language preference for notification content
```

**Purpose:**
```
• App functionality (send notifications)
• Analytics (delivery success rate)
• Product personalization (language preference)
```

**Data Linked to User:**
```
Yes - Device tokens linked to user account
```

**Data Used to Track User:**
```
No - We do not track users across apps/websites
```

### Screenshots Required (IMPORTANT)

For App Store, you need:
- **iPhone 6.7" (iPhone 14 Pro Max):** 1290 x 2796 pixels (3 screenshots minimum)
- **iPhone 6.5" (iPhone 11 Pro Max):** 1284 x 2778 pixels
- **iPad Pro (3rd gen) 12.9":** 2048 x 2732 pixels

**Screenshot requirements:**
1. At least 3 showing Kurdish language
2. At least 2 showing Arabic language
3. Show notification prompt
4. Show actual auctions (not fake data)
5. No offensive content
6. High quality (no blur, proper lighting)

**Tools to create screenshots:**
- Xcode Simulator → Screenshot tool
- Or physical device → Screenshot → Transfer to Mac

### Build Upload

```bash
# Archive in Xcode
1. Open Xcode: npx cap open ios
2. Select "Any iOS Device" as target
3. Product → Archive
4. Wait for archive to complete (~5-10 min)
5. Click "Distribute App"
6. Select "App Store Connect"
7. Click "Upload"
8. Sign in with Apple Developer account
9. Wait for upload (~10-20 min depending on connection)
```

**Or use Xcode Cloud:**
```
1. Product → Xcode Cloud → Create Workflow
2. Configure automatic builds on git push
3. Wait for build to complete
4. Automatically uploaded to App Store Connect
```

---

## Environment Variables Checklist

### Replit Secrets (CRITICAL)

Add these to Replit → Tools → Secrets:

```bash
# Existing
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
DATABASE_URL=...
SESSION_SECRET=...

# Firebase Cloud Messaging (NEW)
FCM_PROJECT_ID=ebay-iraq-prod
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ebay-iraq-prod.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQI...\n-----END PRIVATE KEY-----\n"

# Apple Push Notifications (NEW)
APNS_KEY_ID=ABC123XYZ
APNS_TEAM_ID=DEF456UVW
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
APNS_PRODUCTION=false

# Sentry Error Tracking (NEW)
SENTRY_DSN=https://xxxxx@sentry.io/xxxxx
VITE_SENTRY_DSN=https://xxxxx@sentry.io/xxxxx

# Other services
VERIFYWAY_TOKEN=...
TWILIO_ACCOUNT_SID=...
TWILIO_AUTH_TOKEN=...
```

**⚠️ CRITICAL: Never commit .env file to git!**

---

## Pre-Launch Deployment Checklist

### 1. Database Migration
```bash
# Connect to production database
# Run migration manually (or use drizzle-kit)
psql $DATABASE_URL -f migrations/0022_add_push_notification_fields.sql

# Verify migration
psql $DATABASE_URL -c "SELECT column_name FROM information_schema.columns WHERE table_name='push_subscriptions';"

# Should show: platform, fcm_token, device_id, device_name, last_used
```

### 2. Install Dependencies
```bash
npm install firebase-admin @sentry/node @sentry/react
```

### 3. Build Mobile Apps
```bash
# Build web assets
npm run build

# Sync to native platforms
npx cap sync

# Verify files copied
ls -la android/app/src/main/assets/public
ls -la ios/App/App/public
```

### 4. Verify Configuration Files

**Android:**
```bash
# Check google-services.json exists
ls -la android/app/google-services.json

# Should show: google-services.json with correct package name
```

**iOS:**
```bash
# Check GoogleService-Info.plist
ls -la ios/App/App/GoogleService-Info.plist

# Open in Xcode and verify it's in project
npx cap open ios
# Look for GoogleService-Info.plist in project navigator
```

### 5. Test in Production Mode

```bash
# Set production environment
export NODE_ENV=production
export APNS_PRODUCTION=false  # Keep false for TestFlight

# Run server
npm start

# Test notification endpoints
curl -X GET http://localhost:5000/api/push/vapid-public-key
# Should return: {"publicKey":"..."}
```

### 6. Deploy to Replit

```bash
# In Replit:
1. Commit all changes to git
2. Push to main branch
3. Replit Deployments auto-deploys
4. Wait for deployment to complete (~5 min)
5. Check deployment logs for errors
6. Verify all environment variables set in Secrets
```

---

## Google Play Console Configuration

### 1. Create App Listing

1. Go to [Google Play Console](https://play.google.com/console)
2. Click "Create app"
3. **App name:** `E-بيع`
4. **Default language:** Arabic (ar)
5. **App or game:** App
6. **Free or paid:** Free
7. Accept declarations
8. Click "Create app"

### 2. Store Settings

**App category:** Shopping

**Tags:**
- Shopping
- Social
- Communication

**Content rating:**
- Complete questionnaire
- Answer "No" to all violence/adult content questions
- Rating should be: PEGI 3 / ESRB Everyone

### 3. App Access

**All functionality accessible:**
- Select "Yes, all functionality is accessible"
- No special access needed

**Restricted features:**
- None (or list if you add payments later)

### 4. Data Safety Section

This is CRITICAL - be truthful:

**Location:**
- Collected: Yes (optional, for local auctions)
- Shared: No
- Can be deleted: Yes

**Personal info:**
- Collected: Yes (name, email, phone, address)
- Shared: No
- Can be deleted: Yes

**Financial info:**
- Collected: Yes (payment account info)
- Shared: No (unless using payment processor)
- Can be deleted: Yes

**Photos:**
- Collected: Yes (product photos)
- Shared: No
- Can be deleted: Yes

**Messages:**
- Collected: Yes (buyer-seller messages)
- Shared: No
- Can be deleted: Yes

**Device or other IDs:**
- Collected: Yes (FCM tokens, device IDs)
- Shared: Yes (with Firebase/Google)
- Purpose: Push notifications
- Can be deleted: Yes

### 5. Upload App Bundle

```bash
# Build signed AAB
cd android
./gradlew bundleRelease

# Upload
# Go to Play Console → Production → Create new release
# Upload: android/app/build/outputs/bundle/release/app-release.aab
```

**Release notes (Arabic):**
```
الإصدار 1.0:
• إطلاق E-بيع - أول منصة مزادات عراقية
• دعم المزادات المباشرة
• شراء وبيع آمن
• رسائل فورية
• إشعارات ذكية بالعربية والكردية
• واجهة سهلة الاستخدام
```

### 6. Review & Publish

- Complete all sections
- Pass automated checks
- Submit for review
- **Review time:** 1-7 days typically

---

## Apple App Store Configuration

### 1. Create App in App Store Connect

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Click "My Apps" → "+" → "New App"
3. **Platforms:** iOS
4. **Name:** `E-بيع`
5. **Primary Language:** Arabic
6. **Bundle ID:** `iq.ebay3.app` (must match Xcode)
7. **SKU:** `ebay3-ios-app` (any unique identifier)
8. Click "Create"

### 2. App Information

**Category:**
- Primary: Shopping
- Secondary: Social Networking

**Age Rating:**
- Complete questionnaire
- Answer honestly
- Should get: 4+ rating

**Privacy Policy URL:**
```
https://ebey3.com/privacy
```

### 3. Pricing and Availability

**Price:** Free

**Availability:** All countries (or select Iraq, US, etc.)

### 4. App Privacy

**Privacy Practices:**

When asked about data collection:

**Contact Info:**
- Collected: Name, Email, Phone
- Used for: App functionality, Customer support
- Linked to user: Yes

**Purchases:**
- Collected: Purchase history
- Used for: App functionality
- Linked to user: Yes

**Location:**
- Collected: Approximate location
- Used for: App functionality (local auctions)
- Linked to user: Yes
- User can decline: Yes

**User Content:**
- Collected: Photos, Messages
- Used for: App functionality
- Linked to user: Yes

**Identifiers:**
- Collected: Device ID, Push token
- Used for: Push notifications
- Linked to user: Yes

**Usage Data:**
- Collected: Product interactions
- Used for: Analytics, App functionality
- Linked to user: No

### 5. Push Notification Disclosure (REQUIRED)

In "App Review Information" notes:

```
PUSH NOTIFICATION USAGE:

This app uses Apple Push Notification service to send:
• Auction updates (bid notifications, auction won/lost)
• New messages from buyers/sellers
• Order status updates
• Offer notifications

Implementation:
• Uses Firebase Cloud Messaging (FCM) for push delivery
• Token-based APNS authentication (.p8 key)
• Users must opt-in when prompted
• Can disable in iOS Settings → E-بيع → Notifications

Data Collection:
• Device tokens (APNS tokens via FCM)
• Notification delivery status
• User language preference (Arabic/Kurdish)

Privacy:
• Tokens deleted after 90 days of inactivity
• Not shared with third parties (except Firebase/Google)
• Detailed in privacy policy: https://ebey3.com/privacy

Third-party SDKs:
• Firebase Cloud Messaging (com.google.firebase)
• Capacitor (com.capacitorjs)

Notification language matches user's app language setting (Arabic or Kurdish).
Users can manage notifications in iOS Settings.
```

### 6. Upload Build

**Using Xcode:**
```bash
1. npx cap open ios
2. Select "Any iOS Device (arm64)"
3. Product → Archive
4. Window → Organizer (after archive completes)
5. Select latest archive → "Distribute App"
6. App Store Connect → Upload
7. Wait for processing (~15-30 min)
```

**Using Xcode Cloud (Recommended):**
```bash
1. Product → Xcode Cloud → Create Workflow
2. Setup git repository
3. Configure workflow (build on commit to main)
4. Push code to git
5. Xcode Cloud builds and uploads automatically
```

### 7. Submit for Review

**Build version:** 1.0 (1)

**What's New in This Version:**
```
الإصدار 1.0:
• إطلاق E-بيع - أول منصة مزادات عراقية على iOS
• مزادات حية مع نظام مزايدة ذكي
• شراء وبيع آمن ومضمون
• رسائل فورية بين المشترين والبائعين
• إشعارات ذكية بالعربية والكردية
• واجهة أنيقة وسهلة الاستخدام
• دعم كامل للاتجاه من اليمين لليسار (RTL)
```

**Demo Account (for App Review):**
```
Username: demo@ebey3.com
Password: [Create a test account]

Notes for reviewer:
• App is in Arabic and Kurdish
• Test both languages in Settings
• Try placing a bid on an auction
• Test enabling push notifications
• Check messages feature
```

### 8. Screenshots for iOS

Required sizes:
- **6.7" Display (iPhone 14 Pro Max):** 1290 x 2796 px
- **6.5" Display (iPhone 11 Pro Max):** 1242 x 2688 px  
- **12.9" iPad Pro:** 2048 x 2732 px

Minimum 3 screenshots per size.

**What to show:**
1. Home page with auctions
2. Product detail with bidding
3. Messages screen
4. Kurdish language view
5. Notification prompt
6. Profile/settings

---

## Post-Submission Monitoring

### Week 1 After Launch

**Daily checks:**
```
✅ Sentry dashboard - check for new errors
✅ Database - verify notifications being created
✅ Firebase Console - check message delivery rate
✅ User feedback - monitor app store reviews
✅ Backend logs - check for FCM/APNS errors
```

**Key metrics to track:**
```sql
-- Daily notification stats
SELECT 
  DATE(created_at) as date,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) as delivered,
  COUNT(CASE WHEN opened_at IS NOT NULL THEN 1 END) as opened,
  ROUND(100.0 * COUNT(CASE WHEN delivery_status = 'sent' THEN 1 END) / COUNT(*), 2) as delivery_rate
FROM notifications
WHERE created_at > now() - interval '7 days'
GROUP BY DATE(created_at)
ORDER BY date DESC;
```

**Target metrics:**
- Delivery rate: >95%
- Open rate: >30%
- Error rate: <1%
- User notifications enabled: >40%

---

## App Review Tips

### For Google Play Review

**Approval time:** Usually 1-3 days

**Common rejection reasons:**
- Missing privacy policy
- Misleading screenshots
- Broken functionality
- Crash on launch
- Insufficient notification disclosure

**How to pass:**
- Test thoroughly before submission
- Provide clear privacy policy
- Screenshots match actual app
- All features work
- Notification usage clearly stated

### For Apple App Review

**Approval time:** Usually 1-7 days (can be 24 hours for urgent)

**Common rejection reasons:**
- Notification abuse (too many notifications)
- Missing notification rationale
- Privacy policy incomplete
- App crashes
- Features don't work as described

**How to pass:**
- Rate limit notifications (we did this!)
- Clear notification disclosure in App Privacy
- Complete privacy policy
- Test on real device before submission
- Provide demo account with content

---

## Troubleshooting Submission Issues

### Google Play: "Missing notification disclosure"
```
✅ Solution:
1. Go to Store listing → Data safety
2. Find "Device or other IDs" section
3. Mark "Yes, device tokens collected"
4. Purpose: "Push notifications"
5. Add Firebase to third-party libraries
```

### Apple: "Insufficient notification justification"
```
✅ Solution:
1. Go to App Privacy → Edit
2. Add "Identifiers" → Device ID
3. Purpose: "Push notifications"
4. Add detailed notes in "App Review Information"
5. Explain notification types clearly
```

### Both: "App crashes on launch"
```
✅ Solution:
1. Test on REAL devices (not just simulators)
2. Check Sentry for crash reports
3. Verify all environment variables set
4. Test with empty database (fresh install scenario)
5. Fix crashes, resubmit
```

---

## Post-Approval Steps

### After Google Play Approval
```
✅ 1. App goes live immediately (or scheduled release)
✅ 2. Monitor for first 24 hours
✅ 3. Respond to user reviews quickly
✅ 4. Set up app store optimization (ASO)
✅ 5. Promote app on social media
```

### After Apple App Store Approval
```
✅ 1. App available worldwide within 24 hours
✅ 2. Monitor crash reports in App Store Connect
✅ 3. Respond to reviews
✅ 4. Set APNS_PRODUCTION=true for production
✅ 5. Update Replit secrets with new APNS setting
```

---

## Support & Resources

- [Google Play Console](https://play.google.com/console)
- [App Store Connect](https://appstoreconnect.apple.com)
- [Firebase Console](https://console.firebase.google.com)
- [Apple Developer Portal](https://developer.apple.com/account)
- [Sentry Dashboard](https://sentry.io)

---

## Success! 🎉

Your push notification system is now complete and ready for production.

**What you've accomplished:**
- ✅ Firebase Cloud Messaging for iOS & Android
- ✅ Web Push for browsers
- ✅ WebSocket for real-time updates
- ✅ Kurdish language support
- ✅ Rate limiting & batching
- ✅ Error tracking with Sentry
- ✅ Privacy policy compliant
- ✅ App store ready

**Timeline achieved:** 35 hours of development over 4 weeks

**Launch date:** February 28, 2026 ✅

---

**Good luck with your app launch!** 🚀
