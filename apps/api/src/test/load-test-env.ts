/** Shared dummy env for API integration tests (no .env file required). */

export function loadTestEnv(): void {
  process.env.BONDERY_PUBLIC_SUPABASE_URL ??= "http://localhost:54321";
  process.env.BONDERY_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??= "dummy";
  process.env.BONDERY_PRIVATE_SUPABASE_SECRET_KEY ??= "dummy";
  process.env.BONDERY_PUBLIC_API_URL ??= "http://localhost:26631";
  process.env.BONDERY_PUBLIC_WEBAPP_URL ??= "http://localhost:26632";
  process.env.BONDERY_PUBLIC_WEBSITE_URL ??= "http://localhost:26630";
  process.env.BONDERY_PRIVATE_EMAIL_HOST ??= "localhost";
  process.env.BONDERY_PRIVATE_EMAIL_USER ??= "dummy";
  process.env.BONDERY_PRIVATE_EMAIL_PASS ??= "dummy";
  process.env.BONDERY_PRIVATE_EMAIL_ADDRESS ??= "dummy@localhost";
  process.env.BONDERY_PRIVATE_EMAIL_PORT ??= "587";
  process.env.BONDERY_PRIVATE_API_KEY_PEPPER ??= "dummy-pepper";
  process.env.BONDERY_PRIVATE_SUPABASE_JWT_SIGNING_JWK ??=
    '{"kty":"EC","x":"-ztnrq2xtqWzVslfvYg9Ehds97TWbhD6pFWcYJJKFLA","y":"foLtmAT7OJud7d9ltwZuF9podzkTEhyD56tiDRZFSZQ","crv":"P-256","d":"_bKhwEFYFXeOH3IOBLtT0PS7NSDkWP6xbrqWtj37u2A","alg":"ES256","kid":"test","use":"sig"}';
}
