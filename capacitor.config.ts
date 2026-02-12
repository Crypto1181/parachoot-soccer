import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parachoot.soccer',
  appName: 'Parachoot Soccer',
  webDir: 'dist',
  ios: {
    buildNumber: '22'
  },
  server: {
    androidScheme: 'https'
  },
  plugins: {
    App: {
      disableBackButtonHandler: false,
    },
    PushNotifications: {
      presentationOptions: ["badge", "sound", "alert"],
    },
  },
};

export default config;
