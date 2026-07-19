/// <reference types="wxt/client-types" />

// Augment ImportMetaEnv to declare BONDERY_PUBLIC_ environment variables.
interface ImportMetaEnv {
  readonly BONDERY_PUBLIC_API_URL: string;
  readonly BONDERY_PUBLIC_SUPABASE_OAUTH_CLIENT_ID: string;
  readonly BONDERY_PUBLIC_SUPABASE_URL: string;
  readonly BONDERY_PUBLIC_WEBAPP_URL: string;
  readonly WXT_DEBUG?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
