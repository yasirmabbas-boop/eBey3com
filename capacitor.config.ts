import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'iq.ebay3.app',
  appName: 'E-بيع',
  webDir: 'dist/public',
  ios: {
    // Let iOS manage safe-area insets for the WebView.
    // Combined with StatusBar.overlaysWebView=false, this prevents content
    // from rendering under the notch / Dynamic Island area.
    contentInset: 'automatic'
  },
  server: {
    androidScheme: 'https',
    // Uncomment for development with live reload:
    // url: 'http://YOUR_LOCAL_IP:5000',
    // cleartext: true
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#ffffff",
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      splashFullScreen: true,
      splashImmersive: true,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      // Critical for devices with notch / Dynamic Island:
      // do NOT render the WebView under the status bar area.
      overlaysWebView: false,
      style: 'LIGHT',
      backgroundColor: '#2563eb',
    }
  }
};

export default config;
