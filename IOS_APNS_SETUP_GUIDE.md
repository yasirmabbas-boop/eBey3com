# iOS Apple Push Notification Service (APNS) Setup Guide

This guide explains how to generate and configure APNS keys for iOS push notifications.

## Prerequisites

- Active Apple Developer Account ($99/year)
- Admin access to Apple Developer portal

## Why Token-Based Authentication (.p8)?

We use **token-based authentication** instead of certificate-based because:
- ✅ Never expires (certificates expire yearly)
- ✅ Works for all your apps
- ✅ Simpler to manage
- ✅ Recommended by Apple since 2016

## Step 1: Generate APNS Key

1. **Go to Apple Developer Portal:**
   - Visit: [https://developer.apple.com/account/resources/authkeys/list](https://developer.apple.com/account/resources/authkeys/list)
   - Sign in with your Apple ID

2. **Create New Key:**
   - Click the **"+"** button (or "Create a key")
   - **Key Name:** `E-بيع Production Push`
   - Check the box for **"Apple Push Notifications service (APNs)"**
   - Click **"Continue"**

3. **Register and Download:**
   - Click **"Register"**
   - ⚠️ **CRITICAL:** Click **"Download"** to get the `.p8` file
   - ⚠️ **YOU CAN ONLY DOWNLOAD THIS ONCE!**
   - Save the file securely (password manager recommended)
   - Note the **Key ID** (10 characters like `ABC123XYZ`)
   - Click **"Done"**

## Step 2: Get Your Team ID

1. Go to: [https://developer.apple.com/account](https://developer.apple.com/account)
2. Look at the top right corner
3. You'll see your **Team ID** (10 characters like `DEF456UVW`)
4. Copy this value

## Step 3: Add to Environment Variables

Add these to your `.env` file:

```bash
# Apple Push Notification Service
APNS_KEY_ID=ABC123XYZ
APNS_TEAM_ID=DEF456UVW
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIGTAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBHkwdwIBAQQg...
...your full key content here...
...keeping all the line breaks...
-----END PRIVATE KEY-----"
APNS_PRODUCTION=false
```

**How to get `APNS_PRIVATE_KEY` content:**
1. Open the `.p8` file you downloaded in a text editor
2. Copy the ENTIRE content (including BEGIN and END lines)
3. Paste into `.env` file with double quotes
4. Keep all line breaks as-is

**About `APNS_PRODUCTION`:**
- `false` = Use sandbox (for development and TestFlight)
- `true` = Use production (for App Store releases)

Start with `false` for testing!

## Step 4: Configure Xcode

1. **Open Xcode:**
   ```bash
   npx cap open ios
   ```

2. **Add Push Notification Capability:**
   - Click on the project name in the left sidebar
   - Select the **"App"** target
   - Click the **"Signing & Capabilities"** tab
   - Click **"+ Capability"** button
   - Search for and add **"Push Notifications"**

3. **Verify Bundle Identifier:**
   - In the "General" tab
   - Verify **Bundle Identifier** is: `iq.ebay3.app`
   - Must match exactly what's in `capacitor.config.ts`

4. **Add GoogleService-Info.plist (if not done):**
   - Drag `GoogleService-Info.plist` from Finder into Xcode
   - Check **"Copy items if needed"**
   - Ensure **"App"** target is selected

## Step 5: Update Info.plist (Optional but Recommended)

Add push notification usage description:

1. Open `ios/App/App/Info.plist`
2. Add this entry:

```xml
<key>NSUserNotificationsUsageDescription</key>
<string>نحتاج لإرسال إشعارات عن المزادات والرسائل</string>
```

This explains to users why you need notification permissions (in Arabic).

## Step 6: Verify Configuration

### Check Files Exist:
```bash
# In your project root
ls -la ios/App/App/GoogleService-Info.plist
ls -la .env | grep APNS
```

### Build and Test:
1. In Xcode, select a device or simulator
2. Click **Run** (▶️ button)
3. App should build without errors
4. Check console for Firebase initialization logs

## Step 7: Test on Physical Device

⚠️ **Push notifications do NOT work in iOS Simulator!**

You must test on a physical iPhone:

1. **Connect iPhone to Mac**
2. **Select device in Xcode**
3. **Enable Developer Mode on iPhone:**
   - Settings → Privacy & Security → Developer Mode → Enable
4. **Build and Run**
5. **Allow Notifications** when prompted
6. Check Xcode console for FCM token

## Environment Variables Summary

Your complete `.env` should include:

```bash
# Existing VAPID keys (for web push)
VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...

# Firebase (from Firebase setup)
FCM_PROJECT_ID=ebay-iraq-prod
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ebay-iraq-prod.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."

# Apple Push Notification Service (NEW)
APNS_KEY_ID=ABC123XYZ
APNS_TEAM_ID=DEF456UVW
APNS_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
...full content of .p8 file...
-----END PRIVATE KEY-----"
APNS_PRODUCTION=false
```

## Replit Secrets

Don't forget to add APNS variables to Replit Secrets:

1. Go to Replit → Tools → Secrets
2. Add:
   - `APNS_KEY_ID`
   - `APNS_TEAM_ID`
   - `APNS_PRIVATE_KEY`
   - `APNS_PRODUCTION`

## Troubleshooting

### "No APNs token" in logs
- Verify push notification capability is enabled in Xcode
- Check device has notifications enabled: Settings → E-بيع → Notifications
- Try deleting and reinstalling the app

### "Invalid APNs token"
- Verify APNS_KEY_ID matches the key you downloaded
- Verify APNS_TEAM_ID is correct
- Check APNS_PRIVATE_KEY is complete (including BEGIN/END lines)

### Notifications not appearing
- Check APNS_PRODUCTION setting:
  - `false` for TestFlight and development
  - `true` only for App Store releases
- Verify device allows notifications
- Check Xcode console for errors

### Certificate vs Token Confusion
- We use **token-based (.p8)**, not certificate-based (.p12)
- If someone mentions certificates, clarify you're using token auth
- Token auth is newer and better (no expiration)

## Testing Push Notifications

After backend implementation, test with:

```bash
# 1. Run the app on physical iPhone
# 2. Note the FCM token from Xcode console
# 3. Use Firebase Console → Cloud Messaging → Send test message
# 4. Enter the FCM token
# 5. Send notification
```

## Production Checklist

Before App Store submission:

- [ ] Push Notification capability enabled in Xcode
- [ ] `GoogleService-Info.plist` included in Xcode project
- [ ] APNS keys added to Replit Secrets
- [ ] `APNS_PRODUCTION=false` for TestFlight
- [ ] Change to `APNS_PRODUCTION=true` for App Store release
- [ ] App description mentions notifications
- [ ] Privacy policy mentions push notifications

## Security Best Practices

⚠️ **KEEP YOUR `.p8` FILE SECURE!**
- Store in password manager (1Password, LastPass, etc.)
- Never commit to git
- Never share publicly
- If compromised, revoke in Apple Developer portal

## Next Steps

After completing this setup:
1. ✅ Mark ios-apns TODO as complete
2. ➡️ Continue with backend implementation (server/fcm.ts)
3. ➡️ Test notifications on physical device

## Support Resources

- [Apple Push Notifications Documentation](https://developer.apple.com/documentation/usernotifications)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging for iOS](https://firebase.google.com/docs/cloud-messaging/ios/client)
