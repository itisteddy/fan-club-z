import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fanclubz.app',
  appName: 'Fan Club Z',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    // CRITICAL: Use capacitor://localhost for iOS to prevent cross-contamination
    // with web domain storage/cache/service worker
    // hostname: 'app.fanclubz.app', // REMOVED - causes iOS to share storage with web
    // Production: uses bundled web assets (capacitor://localhost)
    // For development, uncomment to use localhost:
    // url: 'http://localhost:5174',
    // cleartext: true
  },
  android: {
    buildOptions: {
      keystorePath: undefined, // Set if you have a keystore
      keystorePassword: undefined,
      keystoreAlias: undefined,
      keystoreAliasPassword: undefined,
    },
  },
  plugins: {
    // CRITICAL: Patch fetch/XHR on native to use CapacitorHttp under the hood.
    // This removes CORS fragility in iOS/Android WebViews even if some code paths still use fetch().
    CapacitorHttp: {
      enabled: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: '#14b8a6',
      androidSplashResourceName: 'splash',
      androidScaleType: 'CENTER_CROP',
      showSpinner: false,
    },
  },
};

export default config;

