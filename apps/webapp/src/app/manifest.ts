import { BRAND_PRIMARY_COLOR } from "@bondery/branding";
import { WEBAPP_NAME } from "@bondery/helpers";
import { loadNamespace } from "@bondery/translations/i18n";
import type { MetadataRoute } from "next";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const { locale } = await resolveLocaleSettings();
  const common = loadNamespace(locale, "common") as { app?: { description?: string } };

  return {
    background_color: "#ffffff",
    description: common.app?.description,
    display: "standalone",
    name: `${WEBAPP_NAME} PWA`,
    short_name: `${WEBAPP_NAME} PWA`,
    start_url: "/",
    theme_color: BRAND_PRIMARY_COLOR,
    // launch_handler is part of the PWA spec but not yet in Next.js types
    ...({ launch_handler: { client_mode: "focus-existing" } } as object),
    icons: [
      {
        sizes: "192x192",
        src: "/icons/pwa-192.png",
        type: "image/png",
      },
      {
        purpose: "any",
        sizes: "512x512",
        src: "/icons/pwa-512.png",
        type: "image/png",
      },
      {
        purpose: "maskable",
        sizes: "512x512",
        src: "/icons/pwa-512.png",
        type: "image/png",
      },
    ],
  };
}
