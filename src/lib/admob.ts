import { AdMob, BannerAdSize, BannerAdPosition, AdMobInitializationOptions } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

export async function initializeAdMob() {
  const { status } = await AdMob.trackingAuthorizationStatus();

  if (status === 'notDetermined') {
    /**
     * If you want to explain TrackingAuthorization before showing the iOS dialog,
     * you can show the modal here.
     * ex)
     * const modal = await this.modalCtrl.create({
     *   component: RequestTrackingPage,
     * });
     * await modal.present();
     * await modal.onDidDismiss();  // Wait for modal to dismiss
     */
  }

  AdMob.initialize({
    requestTrackingAuthorization: true,
    // testingDevices: ['2077ef9a63d2b398840261c8221a0c9b'], // Optional: Add your device ID for testing
    initializeForTesting: false,
  } as AdMobInitializationOptions);
}

export async function showBanner() {
  const options = {
    adId: Capacitor.getPlatform() === 'ios' 
      ? 'ca-app-pub-1483062868916328/6227282772' // Real iOS Ad Unit ID
      : 'ca-app-pub-1483062868916328/3452093582', // Real Android Ad Unit ID
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM,
    margin: 0,
    isTesting: false, // Set to false for real ads
    // npa: true
  };

  try {
    await AdMob.showBanner(options);
  } catch (e) {
    console.error('Failed to show banner:', e);
  }
}

export async function hideBanner() {
  try {
    await AdMob.hideBanner();
  } catch (e) {
    console.error('Failed to hide banner:', e);
  }
}

export async function resumeBanner() {
  try {
    await AdMob.resumeBanner();
  } catch (e) {
    console.error('Failed to resume banner:', e);
  }
}

export async function removeBanner() {
  try {
    await AdMob.removeBanner();
  } catch (e) {
    console.error('Failed to remove banner:', e);
  }
}
