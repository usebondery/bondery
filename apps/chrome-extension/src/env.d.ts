// Augment ImportMetaEnv to declare WXT_ environment variables.
// WXT/Vite injects these at build time from .env.[mode].local files.
interface ImportMetaEnv {
  readonly WXT_WEBAPP_URL: string;
  readonly WXT_API_URL: string;
  readonly WXT_SUPABASE_URL: string;
  readonly WXT_SUPABASE_OAUTH_CLIENT_ID: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
