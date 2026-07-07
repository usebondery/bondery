import type { MetadataRoute } from "next";
import { BRAND_PRIMARY_COLOR } from "@bondery/branding";
import { WEBAPP_NAME } from "@bondery/helpers";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";
import { loadTranslation } from "@bondery/translations/i18n";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { locale } = await resolveLocaleSettings();
  const translations = loadTranslation(locale);
  const common = translations.WebAppCommon as Record<string, string>;

  return {
    name: `${WEBAPP_NAME} PWA`,
    short_name: `${WEBAPP_NAME} PWA`,
    description: common.AppDescription,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: BRAND_PRIMARY_COLOR,
    // launch_handler is part of the PWA spec but not yet in Next.js types
    ...({ launch_handler: { client_mode: "focus-existing" } } as object),
    icons: [
      {
        src: "/icons/pwa-192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icons/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/pwa-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
