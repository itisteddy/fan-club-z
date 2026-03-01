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

