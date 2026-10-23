import { expoClient } from "@better-auth/expo/client";
import { lastLoginMethodClient } from "@better-auth/expo/plugins";
import { BETTER_AUTH_BASE_PATH } from "@bondery/helpers/globals/paths";
import { expoPasskeyClient } from "@lobehub/expo-better-auth-passkey";
import { magicLinkClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import * as WebBrowser from "expo-web-browser";
import { Platform } from "react-native";
import { API_URL, HAS_MOBILE_CONFIG } from "../config";
import { resolveExpoLastLoginMethod } from "./last-login-method";
import { AUTH_SCHEME, nativeAuthDeepLink } from "./native-auth-deep-link";

export { AUTH_SCHEME, nativeAuthDeepLink };

WebBrowser.maybeCompleteAuthSession();

const webStorage = {
  deleteItemAsync: async (key: string) => {
    localStorage.removeItem(key);
  },
  getItem: (key: string) => localStorage.getItem(key),
  getItemAsync: async (key: string) => localStorage.getItem(key),
  setItem: (key: string, value: string) => {
    localStorage.setItem(key, value);
  },
  setItemAsync: async (key: string, value: string) => {
    localStorage.setItem(key, value);
  },
};

export const AUTH_STORAGE_PREFIX = "bondery";
export const AUTH_COOKIE_STORAGE_KEY = `${AUTH_STORAGE_PREFIX}_cookie`;
export const AUTH_NATIVE_STORAGE = Platform.OS === "web" ? webStorage : SecureStore;
export const LAST_LOGIN_METHOD_STORAGE_KEY = `${AUTH_STORAGE_PREFIX}_last_login_method`;

const lastLoginMemory = new Map<string, string>();

/**
 * Sync `getItem` over SecureStore / web storage. Expo `lastLoginMethodClient`
 * reads last-used synchronously and writes asynchronously.
 */
export const lastLoginStorage = {
  deleteItemAsync: async (key: string) => {
    lastLoginMemory.delete(key);
    await AUTH_NATIVE_STORAGE.deleteItemAsync(key);
  },
  getItem: (key: string) => lastLoginMemory.get(key) ?? null,
  setItem: async (key: string, value: string) => {
    lastLoginMemory.set(key, value);
    await AUTH_NATIVE_STORAGE.setItemAsync(key, value);
  },
};

export async function hydrateLastLoginMethod(): Promise<void> {
  const value = await AUTH_NATIVE_STORAGE.getItemAsync(LAST_LOGIN_METHOD_STORAGE_KEY);
  if (value) {
    lastLoginMemory.set(LAST_LOGIN_METHOD_STORAGE_KEY, value);
  }
}

export async function rememberLastLoginMethod(method: string): Promise<void> {
  await lastLoginStorage.setItem(LAST_LOGIN_METHOD_STORAGE_KEY, method);
}

void hydrateLastLoginMethod();

export const authClient = HAS_MOBILE_CONFIG
  ? createAuthClient({
      basePath: BETTER_AUTH_BASE_PATH,
      baseURL: API_URL,
      plugins: [
        expoClient({
          scheme: AUTH_SCHEME,
          storage: AUTH_NATIVE_STORAGE,
          storagePrefix: AUTH_STORAGE_PREFIX,
        }),
        lastLoginMethodClient({
          customResolveMethod: resolveExpoLastLoginMethod,
          storage: lastLoginStorage,
          storagePrefix: AUTH_STORAGE_PREFIX,
        }),
        expoPasskeyClient(),
        magicLinkClient(),
      ],
    })
  : null;

export async function getAccessToken(): Promise<string | null> {
  const { readLocalAccessToken } = await import("./session");
  return readLocalAccessToken();
}
