import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'iq.ebay3.app',
  appName: 'E-بيع',
  webDir: 'dist/public',
  ios: {
    contentInset: 'always'
  },
  server: {
    androidScheme: 'https',
    url: 'https://ebey3.com',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      launchFadeOutDuration: 300,
      backgroundColor: "#000000",
      showSpinner: false,
      androidSpinnerStyle: 'small',
      iosSpinnerStyle: 'small',
      androidScaleType: 'CENTER_INSIDE',
      splashFullScreen: true,
      splashImmersive: true,
      useDialog: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"]
    },
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
    StatusBar: {
      overlaysWebView: true,
      style: 'LIGHT',
      backgroundColor: '#000000',
    },
    FacebookLogin: {
      appId: '2254913588327228',
      clientToken: '03a6c8eae3cbaa91dd284f80d086417a',
      permissions: ['public_profile', 'email'],
    }
  }
};

export default config;