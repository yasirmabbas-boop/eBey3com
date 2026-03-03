# 🍎 Complete Mac Build Guide - iOS & Android

**Step-by-step commands to build your mobile apps on macOS**

---

## 📋 Prerequisites Check

Before starting, verify you have these installed on your Mac:

```bash
# Check Node.js (need v16 or higher)
node --version

# Check npm
npm --version

# Check if Android Studio is installed
ls -la /Applications/ | grep "Android Studio"

# Check if Xcode is installed
xcodebuild -version

# Check if CocoaPods is installed (for iOS)
pod --version
```

### If anything is missing:

```bash
# Install Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install Node.js (if needed)
brew install node

# Install CocoaPods (if needed)
sudo gem install cocoapods

# Install Xcode Command Line Tools (if needed)
xcode-select --install
```

**Manual Downloads:**
- **Android Studio**: https://developer.android.com/studio
- **Xcode**: App Store (search "Xcode")

---

## 1️⃣ Get the Latest Code

```bash
# Navigate to where you want the project (or if already exists, go to it)
cd ~/Documents

# If you don't have the code yet - clone it
# Replace with your actual repo URL or download method
git clone <your-repo-url> ebay-iraq
cd ebay-iraq

# OR if you already have it - pull latest changes
cd /path/to/your/ebay-iraq
git pull origin main
```

---

## 2️⃣ Install Dependencies

```bash
# Install Node packages
npm install

# Install iOS dependencies (CocoaPods)
cd ios/App
pod install
cd ../..
```

**Expected output:**
```
✓ Installed 800+ packages
✓ Pod installation complete! (iOS dependencies)
```

---

## 3️⃣ Firebase Configuration Files

### Step A: Download from Firebase Console

1. Go to: https://console.firebase.google.com
2. Select your project (or create one if needed)
3. Click ⚙️ **Settings** → **Project Settings**

### Step B: Download Android Config

1. In Firebase Console → **Project Settings**
2. Scroll to "Your apps"
3. Click **Android app** (or add one if missing):
   - Package name: `com.ebayiraq.app` (check `android/app/build.gradle` for exact name)
4. Click **Download google-services.json**
5. Save it

```bash
# Copy to Android project (replace ~/Downloads with actual path)
cp ~/Downloads/google-services.json android/app/google-services.json

# Verify it's there
cat android/app/google-services.json | head -5
```

### Step C: Download iOS Config

1. In Firebase Console → **Project Settings**
2. Click **iOS app** (or add one if missing):
   - Bundle ID: `com.ebayiraq.app` (check `ios/App/App.xcodeproj/project.pbxproj` for exact name)
3. Click **Download GoogleService-Info.plist**
4. Save it

```bash
# Copy to iOS project
cp ~/Downloads/GoogleService-Info.plist ios/App/App/GoogleService-Info.plist

# Verify it's there
cat ios/App/App/GoogleService-Info.plist | head -10
```

---

## 4️⃣ Build Web Assets

```bash
# Build the React app
npm run build

# This creates dist/public/ with all web assets
# Expected: ~10 seconds
```

---

## 5️⃣ Sync to Capacitor

```bash
# Copy web assets to iOS and Android
npx cap sync

# This does:
# ✓ Copy web assets → android/app/src/main/assets/public
# ✓ Copy web assets → ios/App/App/public
# ✓ Update native plugins
```

**Expected output:**
```
✔ copy android
✔ update android
✔ copy ios
✔ update ios
[info] Found 9 Capacitor plugins for ios
[info] Found 9 Capacitor plugins for android
```

---

## 6️⃣ Build Android App

### Open Android Studio

```bash
# Open the Android project in Android Studio
npx cap open android
```

**Android Studio will open. Wait for:**
- ✅ Gradle sync to complete (~2-5 minutes first time)
- ✅ "BUILD SUCCESSFUL" in bottom panel

### Build the APK

**Option A: Using Android Studio UI**
1. Click **Build** → **Build Bundle(s) / APK(s)** → **Build APK(s)**
2. Wait ~2-5 minutes
3. Click "locate" link when done
4. APK location: `android/app/build/outputs/apk/debug/app-debug.apk`

**Option B: Using Command Line**
```bash
# From project root
cd android
./gradlew assembleDebug
cd ..

# APK location:
ls -lh android/app/build/outputs/apk/debug/app-debug.apk
```

### Install on Android Device

**Connect Android phone via USB:**
```bash
# Enable USB Debugging on phone:
# Settings → About Phone → Tap "Build Number" 7 times
# Settings → Developer Options → Enable USB Debugging

# Check device is connected
adb devices
# Should show: List of devices attached
#              ABC123456789    device

# Install APK
adb install android/app/build/outputs/apk/debug/app-debug.apk

# Or click "Run" (▶️) button in Android Studio
```

---

## 7️⃣ Build iOS App

### Open Xcode

```bash
# Open the iOS project in Xcode
npx cap open ios
```

**Xcode will open with `App.xcworkspace`**

### Configure Signing

1. In Xcode, click **App** in left sidebar (top item)
2. Select **Signing & Capabilities** tab
3. **Uncheck** "Automatically manage signing" (temporarily)
4. **Re-check** "Automatically manage signing"
5. **Team**: Select your Apple Developer account
   - If not shown: Xcode → Preferences → Accounts → Add Apple ID

### Enable Push Notifications Capability

1. Still in **Signing & Capabilities** tab
2. Click **+ Capability**
3. Search for "Push Notifications"
4. Double-click to add
5. Should see: ✅ Push Notifications capability added

### Build the App

**For Simulator (Testing):**
1. Top bar: Select **Any iOS Device (arm64)** → Change to **iPhone 15 Pro** (or any simulator)
2. Click **▶️ Play** button (or Cmd + R)
3. Wait ~1-3 minutes for build
4. Simulator opens with app

**For Physical iPhone:**
1. Connect iPhone via USB
2. iPhone: Trust this computer (popup)
3. Top bar: Select your iPhone name
4. Click **▶️ Play** button
5. **First time**: iPhone will show "Untrusted Developer"
   - iPhone: Settings → General → VPN & Device Management
   - Tap your Apple ID → Trust
6. Re-run from Xcode

---

## 8️⃣ Verify Push Notifications Setup

### Check Android Logs

**In Android Studio:**
1. Bottom panel: Click **Logcat**
2. Filter: Type `Push` or `FCM`
3. Look for:
   ```
   ✅ Push registration success, token: dGh5abc123...
   ✅ Firebase initialized
   ```

**Command line:**
```bash
adb logcat | grep -i "push\|fcm"
```

### Check iOS Logs

**In Xcode:**
1. Bottom panel: Click **Console** (or View → Debug Area → Activate Console)
2. Look for:
   ```
   ✅ Push notification permission granted
   ✅ Device token: <abc123...>
   ```

### Test Notification

**Method 1: Firebase Console**
1. Go to: https://console.firebase.google.com
2. **Cloud Messaging** → **Send test message**
3. Paste device token from logs
4. Title: `مرحبا` / Body: `اختبار الإشعارات`
5. Click **Test**

**Method 2: From your backend**
```bash
# Test endpoint (if you've added one)
curl -X POST https://your-replit-url.replit.app/api/notifications/test \
  -H "Content-Type: application/json" \
  -d '{"userId": "your-test-user-id"}'
```

---

## 9️⃣ Troubleshooting

### Android Issues

**Error: "JAVA_HOME not set"**
```bash
# Add to ~/.zshrc or ~/.bash_profile
export JAVA_HOME=/Applications/Android\ Studio.app/Contents/jbr/Contents/Home
export PATH=$PATH:$JAVA_HOME/bin

# Reload shell
source ~/.zshrc
```

**Error: "SDK location not found"**
```bash
# Create local.properties in android/
echo "sdk.dir=/Users/$USER/Library/Android/sdk" > android/local.properties
```

**Error: "google-services.json missing"**
```bash
# Verify file exists
ls -la android/app/google-services.json

# If missing, re-download from Firebase Console (Step 3B)
```

### iOS Issues

**Error: "No such module 'Capacitor'"**
```bash
# Re-install CocoaPods
cd ios/App
rm -rf Pods Podfile.lock
pod install
cd ../..
```

**Error: "Provisioning profile not found"**
- Xcode → Preferences → Accounts → Download Manual Profiles
- Or: Select a different Team in Signing & Capabilities

**Error: "Failed to register for remote notifications"**
- Make sure you added Push Notifications capability (Step 7)
- Check Apple Developer Portal: https://developer.apple.com/account/resources/identifiers/list
- Your Bundle ID should have Push Notifications enabled

### Build Errors

**Error: "Command failed: npx cap sync"**
```bash
# Clear Capacitor cache
npx cap sync --force

# Or rebuild everything
npm run build
npx cap copy
npx cap update
```

**Error: "Module not found: firebase-admin"**
```bash
# Install dependencies again
npm install
```

---

## 🎯 Quick Reference Commands

```bash
# Complete build flow (run these in order):

# 1. Pull latest code
git pull

# 2. Install dependencies
npm install
cd ios/App && pod install && cd ../..

# 3. Add Firebase config files (manual step)
# - Copy google-services.json → android/app/
# - Copy GoogleService-Info.plist → ios/App/App/

# 4. Build web assets
npm run build

# 5. Sync to native projects
npx cap sync

# 6. Open in IDEs
npx cap open android   # Android Studio
npx cap open ios       # Xcode

# 7. Build & Run (in Android Studio / Xcode)
# Click ▶️ Play button in each IDE
```

---

## 📱 Expected Timeline

| Task | Time |
|------|------|
| Install prerequisites | 30-60 min (first time only) |
| Clone/pull code | 1-2 min |
| npm install | 2-5 min |
| Firebase config files | 5-10 min |
| Build web assets | 10-30 sec |
| cap sync | 10-20 sec |
| Android build | 2-5 min |
| iOS build | 1-3 min |
| **Total (first time)** | **45-90 min** |
| **Total (subsequent builds)** | **5-10 min** |

---

## ✅ Success Checklist

After building, verify:

- [ ] Android app installs and launches
- [ ] iOS app installs and launches
- [ ] Both apps show "Enable Notifications" button after login
- [ ] Push permission dialog appears when clicked
- [ ] Device tokens appear in logs (Logcat / Xcode Console)
- [ ] Test notification received on device
- [ ] Arabic text displays correctly
- [ ] Kurdish text displays correctly (if switched)
- [ ] In-app notifications work (WebSocket)
- [ ] App connects to backend (check network requests)

---

## 🚀 Next Steps After Building

1. **Test all notification types** (auction_won, outbid, new_message, etc.)
2. **Test both languages** (Arabic and Kurdish)
3. **Test on multiple devices** (old/new iOS, different Android versions)
4. **Follow TESTING_GUIDE.md** for comprehensive test scenarios
5. **Prepare for app store submission** (see APP_STORE_SUBMISSION_GUIDE.md)

---

## 📞 Need Help?

**Common issues:**
- Xcode won't build → Clean build folder: Product → Clean Build Folder (Cmd + Shift + K)
- Android Gradle errors → File → Invalidate Caches → Invalidate and Restart
- Push not working → Verify FCM credentials in Replit Secrets and restart backend
- App can't connect → Check backend URL in `capacitor.config.ts`

**Check backend URL:**
```bash
cat capacitor.config.ts | grep server
```

Should point to your Replit URL, not `localhost`.
