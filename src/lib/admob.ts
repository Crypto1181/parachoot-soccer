import { AdMob, BannerAdSize, BannerAdPosition, AdMobInitializationOptions, AdOptions, AdLoadInfo, InterstitialAdPluginEvents } from '@capacitor-community/admob';
import { Capacitor } from '@capacitor/core';

// Ad Unit IDs
// TODO: Replace with your real Ad Unit IDs from AdMob Console
const ANDROID_BANNER_ID = 'ca-app-pub-3718284755022484/1281783613';
const IOS_BANNER_ID = 'ca-app-pub-3718284755022484/2248951162';

// Testing IDs (use these for development)
// const ANDROID_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/1033173712'; 
// const IOS_INTERSTITIAL_ID = 'ca-app-pub-3940256099942544/4411468910';

// Real IDs (replace with yours)
// Note: You need to create separate "Interstitial" ad units for these!
const ANDROID_INTERSTITIAL_ID = 'ca-app-pub-3718284755022484/1014479283';
const IOS_INTERSTITIAL_ID = 'ca-app-pub-3718284755022484/9600805494';

export async function initializeAdMob() {
  try {
    // 1. Check current status
    const { status } = await AdMob.trackingAuthorizationStatus();
    console.log(`[AdMob] Current tracking status: ${status}`);

    // 2. Request permission if not determined (iOS 14+)
    if (status === 'notDetermined') {
      console.log('[AdMob] Requesting tracking authorization...');
      // This will show the popup on iOS
      await AdMob.requestTrackingAuthorization();
    }

    // 3. Initialize AdMob
    // We explicitly requested auth above, but we pass true here as well to be safe
    // initializeForTesting: true will use test ads (safe for dev)
    await AdMob.initialize({
      requestTrackingAuthorization: true,
      initializeForTesting: false,
    } as AdMobInitializationOptions);

    console.log('[AdMob] Initialized');

    // 4. Pre-load first interstitial
    await prepareInterstitial();

  } catch (error) {
    console.error('[AdMob] Initialization failed:', error);
  }
}

export async function showBanner() {
  const options = {
    adId: Capacitor.getPlatform() === 'ios' ? IOS_BANNER_ID : ANDROID_BANNER_ID,
    adSize: BannerAdSize.ADAPTIVE_BANNER,
    position: BannerAdPosition.BOTTOM_CENTER,
    margin: 0,
    isTesting: false, // Set to true for development
    // npa: true // Non-personalized ads
  };

  try {
    await AdMob.showBanner(options);
  } catch (e) {
    console.error('[AdMob] Failed to show banner:', e);
  }
}

export async function hideBanner() {
  try {
    await AdMob.hideBanner();
  } catch (e) {
    console.error('[AdMob] Failed to hide banner:', e);
  }
}

export async function resumeBanner() {
  try {
    await AdMob.resumeBanner();
  } catch (e) {
    console.error('[AdMob] Failed to resume banner:', e);
  }
}

export async function removeBanner() {
  try {
    await AdMob.removeBanner();
  } catch (e) {
    console.error('[AdMob] Failed to remove banner:', e);
  }
}

// Interstitial Ad Support

export async function prepareInterstitial() {
  const options: AdOptions = {
    adId: Capacitor.getPlatform() === 'ios' ? IOS_INTERSTITIAL_ID : ANDROID_INTERSTITIAL_ID,
    isTesting: false // Set to true for development
  };

  try {
    console.log('[AdMob] Preparing interstitial...');
    await AdMob.prepareInterstitial(options);
    console.log('[AdMob] Interstitial prepared');
  } catch (e) {
    console.error('[AdMob] Failed to prepare interstitial:', e);
  }
}

export async function showInterstitial() {
  try {
    console.log('[AdMob] Showing interstitial...');
    await AdMob.showInterstitial();
  } catch (e) {
    console.error('[AdMob] Failed to show interstitial:', e);
    throw e; // Re-throw to handle fallback
  }
}

/**
 * Helper function to show an interstitial ad before navigating.
 * If the ad fails to show or isn't ready, it proceeds immediately.
 * @param onCompleted Callback function to execute after ad is shown (or if it fails)
 */
export async function showInterstitialAd(onCompleted: () => void) {
  // If not native platform, skip ad
  if (!Capacitor.isNativePlatform()) {
    onCompleted();
    return;
  }

  try {
    // Try to show the ad
    await showInterstitial();

    // In Capacitor AdMob, showInterstitial resolves when the ad is presented.
    // We need to wait for it to be dismissed to call onCompleted.
    // However, the plugin doesn't return a "dismissed" promise from showInterstitial.
    // We rely on the 'admob_ad_dismissed' event listener generally, 
    // but for a simple linear flow, we might just assume the user will close it.

    // ACTUALLY: The best way is to let the ad show, and since it's full screen,
    // the app logic pauses. When the user closes it, the app resumes.
    // But showInterstitial() resolves immediately after showing? 
    // Let's verify standard behavior:

    // WORKAROUND: We will assume functionality.
    // BUT common pattern:
    // await show() -> resolves when ad is on screen.

    // Store listener handles to remove them later
    let dismissListener: any;
    let failedListener: any;

    const cleanup = async () => {
      if (dismissListener) await dismissListener.remove();
      if (failedListener) await failedListener.remove();
    };

    const handleDismiss = async () => {
      await cleanup();
      prepareInterstitial(); // Pre-load next one
      onCompleted();
    };

    // Register listeners
    dismissListener = await AdMob.addListener(InterstitialAdPluginEvents.Dismissed, handleDismiss);
    failedListener = await AdMob.addListener(InterstitialAdPluginEvents.FailedToLoad, handleDismiss);

  } catch (e) {
    // If showing fails (e.g. not loaded), just proceed
    console.log('[AdMob] Ad not ready/failed, skipping...');
    onCompleted();
    // Try to reload for next time
    prepareInterstitial();
  }
}
