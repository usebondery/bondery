import { storageAdapter } from "@better-auth/expo/client";
import { AUTH_COOKIE_STORAGE_KEY, AUTH_NATIVE_STORAGE } from "./client";
import { mergeExpoAuthCookieStore } from "./merge-expo-auth-cookie";

const cookieStorage = storageAdapter(AUTH_NATIVE_STORAGE);

/**
 * Persist a magic-link `?cookie=` deep-link header into SecureStore so
 * `getSession` can send it. Email links skip `openAuthSessionAsync`.
 */
export async function ingestAuthCookieFromDeepLink(setCookieHeader: string): Promise<void> {
  const previous = await cookieStorage.getItemAsync(AUTH_COOKIE_STORAGE_KEY);
  const next = mergeExpoAuthCookieStore(setCookieHeader, previous);
  await cookieStorage.setItemAsync(AUTH_COOKIE_STORAGE_KEY, next);
}
