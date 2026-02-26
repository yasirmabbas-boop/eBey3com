# Add project specific ProGuard rules here.
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# ── Capacitor ────────────────────────────────────────────────────────
# Keep the JavaScript ↔ native bridge intact
-keep class com.getcapacitor.** { *; }
-keep @com.getcapacitor.annotation.CapacitorPlugin class * { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}
-dontwarn com.getcapacitor.**

# ── Capacitor Plugins ────────────────────────────────────────────────
-keep class com.capacitorjs.** { *; }
-dontwarn com.capacitorjs.**

# ── Firebase / Google Services ───────────────────────────────────────
-keep class com.google.firebase.** { *; }
-dontwarn com.google.firebase.**
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.android.gms.**

# Firebase Messaging
-keepclassmembers class com.google.firebase.messaging.FirebaseMessagingService {
    public void onMessageReceived(com.google.firebase.messaging.RemoteMessage);
    public void onNewToken(java.lang.String);
}

# ── Facebook SDK ─────────────────────────────────────────────────────
-keep class com.facebook.** { *; }
-dontwarn com.facebook.**

# ── AndroidX / AppCompat ─────────────────────────────────────────────
-keep class androidx.** { *; }
-dontwarn androidx.**

# ── WebView ──────────────────────────────────────────────────────────
-keepclassmembers class * extends android.webkit.WebViewClient {
    public void *(android.webkit.WebView, java.lang.String, android.graphics.Bitmap);
    public boolean *(android.webkit.WebView, java.lang.String);
    public void *(android.webkit.WebView, java.lang.String);
}

# ── Preserve line numbers for crash reports ──────────────────────────
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile
