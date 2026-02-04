import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

/**
 * Storage adapter for Supabase auth that uses Capacitor Preferences on native.
 * Prevents session loss when the app is killed (localStorage can be cleared in WebView).
 */
function createStorage(): { getItem: (key: string) => Promise<string | null>; setItem: (key: string, value: string) => Promise<void>; removeItem: (key: string) => Promise<void> } {
  const isNative = Capacitor.isNativePlatform();

  if (isNative) {
    return {
      async getItem(key: string): Promise<string | null> {
        try {
          const { value } = await Preferences.get({ key });
          return value;
        } catch (e) {
          console.warn('[CapacitorStorage] getItem failed:', key, e);
          return null;
        }
      },
      async setItem(key: string, value: string): Promise<void> {
        try {
          await Preferences.set({ key, value });
        } catch (e) {
          console.warn('[CapacitorStorage] setItem failed:', key, e);
        }
      },
      async removeItem(key: string): Promise<void> {
        try {
          await Preferences.remove({ key });
        } catch (e) {
          console.warn('[CapacitorStorage] removeItem failed:', key, e);
        }
      },
    };
  }

  return {
    async getItem(key: string): Promise<string | null> {
      try {
        return localStorage.getItem(key);
      } catch (e) {
        console.warn('[CapacitorStorage] localStorage getItem failed:', key, e);
        return null;
      }
    },
    async setItem(key: string, value: string): Promise<void> {
      try {
        localStorage.setItem(key, value);
      } catch (e) {
        console.warn('[CapacitorStorage] localStorage setItem failed:', key, e);
      }
    },
    async removeItem(key: string): Promise<void> {
      try {
        localStorage.removeItem(key);
      } catch (e) {
        console.warn('[CapacitorStorage] localStorage removeItem failed:', key, e);
      }
    },
  };
}

export const capacitorStorage = createStorage();
