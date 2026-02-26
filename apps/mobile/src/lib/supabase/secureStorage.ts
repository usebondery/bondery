import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

const inMemoryWebStore = new Map<string, string>();

/**
 * Supabase auth storage adapter.
 * Uses SecureStore on native platforms and in-memory fallback on web.
 */
export const supabaseSecureStorage = {
  getItem: async (key: string): Promise<string | null> => {
    if (Platform.OS === "web") {
      return inMemoryWebStore.get(key) ?? null;
    }

    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    if (Platform.OS === "web") {
      inMemoryWebStore.set(key, value);
      return;
    }

    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    if (Platform.OS === "web") {
      inMemoryWebStore.delete(key);
      return;
    }

    await SecureStore.deleteItemAsync(key);
  },
};
