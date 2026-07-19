/** Supabase PKCE auth codes are UUIDs; provider codes (e.g. GitHub) are not. */
const SUPABASE_AUTH_CODE_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isSupabaseAuthCode(code: string): boolean {
  return SUPABASE_AUTH_CODE_PATTERN.test(code);
}
