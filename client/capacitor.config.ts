import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.fanclubz.app',
  appName: 'Fan Club Z',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    hostname: 'app.fanclubz.app',
    // For development, you can uncomment this to use localhost
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

