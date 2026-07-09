import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const SECURE_STORE_OPTIONS: SecureStore.SecureStoreOptions = {
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

/**
 * Supabase auth storage adapter.
 * Uses SecureStore on native platforms and localStorage on web.
 * localStorage is required on web so the PKCE code verifier survives the
 * OAuth redirect (an in-memory store would be wiped when the page reloads).
 */
export const supabaseSecureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return localStorage.getItem(key);
    }

    return SecureStore.getItemAsync(key, SECURE_STORE_OPTIONS);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      localStorage.removeItem(key);
      return;
    }

    await SecureStore.deleteItemAsync(key, SECURE_STORE_OPTIONS);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      localStorage.setItem(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value, SECURE_STORE_OPTIONS);
  },
};
