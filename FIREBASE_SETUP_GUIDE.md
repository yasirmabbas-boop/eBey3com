# Firebase Cloud Messaging Setup Guide

Follow these steps to configure Firebase for push notifications on iOS and Android.

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click **"Add project"**
3. Project name: `ebay-iraq-prod`
4. Disable Google Analytics (not needed for now)
5. Click **"Create project"**
6. Wait for project creation (~30 seconds)

## Step 2: Add Android App

1. In Firebase Console, click **"Add app"** → Select **Android icon**
2. **Android package name:** `iq.ebay3.app` (MUST match exactly)
   - This comes from `android/app/build.gradle` line 4: `namespace "iq.ebay3.app"`
3. **App nickname (optional):** `E-بيع Android`
4. **Debug signing certificate SHA-1:** Leave empty for now
5. Click **"Register app"**
6. **Download `google-services.json`**
7. Place file at: `android/app/google-services.json`
8. Click **"Next"** → Skip SDK setup (Capacitor handles it)
9. Click **"Next"** → Click **"Continue to console"**

## Step 3: Add iOS App

1. In Firebase Console, click **"Add app"** → Select **iOS icon**
2. **iOS bundle ID:** `iq.ebay3.app` (MUST match exactly)
   - This comes from `capacitor.config.ts`: `appId: 'iq.ebay3.app'`
3. **App nickname (optional):** `E-بيع iOS`
4. **App Store ID:** Leave empty (will add later)
5. Click **"Register app"**
6. **Download `GoogleService-Info.plist`**
7. Place file at: `ios/App/App/GoogleService-Info.plist`
8. **Open Xcode:** Run `npx cap open ios` in terminal
9. **Drag `GoogleService-Info.plist` into Xcode:**
   - Drag from Finder into Xcode project navigator
   - **IMPORTANT:** Check "Copy items if needed"
   - Ensure "App" target is selected
10. Click **"Next"** → Skip SDK setup
11. Click **"Continue to console"**

## Step 4: Get FCM Service Account Key

1. In Firebase Console → **Project Settings** (gear icon)
2. Navigate to **"Service accounts"** tab
3. Click **"Generate new private key"**
4. Click **"Generate key"** (downloads a JSON file)
5. Open the JSON file
6. Copy the following values to your `.env` file:

```bash
# Firebase Cloud Messaging
FCM_PROJECT_ID=ebay-iraq-prod
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ebay-iraq-prod.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**IMPORTANT:** For `FCM_PRIVATE_KEY`:
- Keep the double quotes
- Keep the `\n` characters (they're important!)
- Copy the entire private_key value from the JSON file

## Step 5: Verify Installation

### Android Verification:
1. Check file exists: `android/app/google-services.json`
2. Build Android: `npm run build:mobile`
3. The build should not show any Firebase warnings

### iOS Verification:
1. Check file exists: `ios/App/App/GoogleService-Info.plist`
2. In Xcode, verify file is in project navigator (blue icon)
3. Build iOS: Select device/simulator → Click Run
4. App should build without Firebase errors

## Step 6: Test FCM (After Backend Implementation)

Once you've completed backend implementation, test with:

```bash
# Send test notification from Firebase Console
1. Go to Firebase Console → Cloud Messaging
2. Click "Send your first message"
3. Title: "Test"
4. Body: "This is a test notification"
5. Click "Send test message"
6. Enter your device's FCM token (from app logs)
7. Click "Test"
```

## Environment Variables Summary

Add these to your `.env` file AND Replit Secrets:

```bash
# Existing (should already be there)
VAPID_PUBLIC_KEY=your-existing-vapid-key
VAPID_PRIVATE_KEY=your-existing-vapid-private-key

# New - Firebase Cloud Messaging
FCM_PROJECT_ID=ebay-iraq-prod
FCM_CLIENT_EMAIL=firebase-adminsdk-xxxxx@ebay-iraq-prod.iam.gserviceaccount.com
FCM_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANB...full-key-here...\n-----END PRIVATE KEY-----\n"
```

## Replit Deployments Secrets

To add secrets to Replit Deployments:

1. Go to your Repl
2. Click "Tools" → "Secrets"
3. Add each environment variable as a key-value pair
4. Click "Add secret" for each one

Or use the Secrets tab in the sidebar.

## Troubleshooting

### Android: "google-services plugin not applied"
- Verify `google-services.json` is in `android/app/` (not `android/`)
- Run: `npx cap sync android`

### iOS: "Firebase not configured"
- Verify `GoogleService-Info.plist` is copied to Xcode project
- Rebuild the project in Xcode

### FCM Token Invalid
- Make sure `FCM_PRIVATE_KEY` has `\n` characters preserved
- Verify project ID matches your Firebase project

## Next Steps

After completing this setup:
1. ✅ Mark firebase-setup TODO as complete
2. ➡️ Proceed to iOS APNS setup (see `IOS_APNS_SETUP_GUIDE.md`)
3. ➡️ Continue with backend implementation

## Support

If you encounter issues:
- Check Firebase Console → Project Settings → General
- Verify package names match exactly: `iq.ebay3.app`
- Check Capacitor config: `capacitor.config.ts`
