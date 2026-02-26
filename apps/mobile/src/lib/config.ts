function normalizeApiBaseUrl(value: string): string {
  return value.replace(/\/+$/, "").replace(/\/api$/, "");
}

const rawApiUrl = process.env.EXPO_PUBLIC_API_URL || "";

export const API_URL = rawApiUrl ? normalizeApiBaseUrl(rawApiUrl) : "";
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY || "";
export const WEBSITE_URL = process.env.EXPO_PUBLIC_WEBSITE_URL || "https://usebondery.com";
export const HAS_MOBILE_CONFIG = Boolean(API_URL && SUPABASE_URL && SUPABASE_ANON_KEY);

export function assertMobileConfig() {
  if (!API_URL) {
    throw new Error("Missing EXPO_PUBLIC_API_URL");
  }

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase config. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
}
