import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.parachoot.soccer',
  appName: 'Parachoot Soccer',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    App: {
      disableBackButtonHandler: false,
    },
  },
};

export default config;
