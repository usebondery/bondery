// Prints local dev URLs from the Dial BOND port registry.
import { DEV_PORTS, DEV_URLS, SUPABASE_PORTS } from "@bondery/schemas/constants";

const rows = [
  ["Website", DEV_PORTS.WEBSITE, DEV_URLS.website],
  ["API", DEV_PORTS.API, DEV_URLS.api],
  ["Webapp", DEV_PORTS.WEBAPP, DEV_URLS.webapp],
  ["Chrome extension HMR", DEV_PORTS.EXTENSION, DEV_URLS.extension],
  ["Mobile (Expo Metro)", DEV_PORTS.MOBILE, DEV_URLS.mobile],
  ["Email preview", DEV_PORTS.EMAIL_PREVIEW, DEV_URLS.emailPreview],
  ["Supabase gateway", SUPABASE_PORTS.GATEWAY, DEV_URLS.supabase],
  ["Supabase Studio", SUPABASE_PORTS.STUDIO, DEV_URLS.supabaseStudio],
  ["Inbucket", SUPABASE_PORTS.INBUCKET, DEV_URLS.inbucket],
];

console.log("Dial BOND — local dev URLs\n");
for (const [name, port, url] of rows) {
  console.log(`  ${String(port).padEnd(5)}  ${name.padEnd(22)}  ${url}`);
}
