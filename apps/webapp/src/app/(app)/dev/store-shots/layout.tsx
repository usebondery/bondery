import { bonderyTheme } from "@bondery/mantine-next";
import { MantineProvider, v8CssVariablesResolver } from "@mantine/core";
import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import { getResources, getT } from "next-i18next/server";
import type { ReactNode } from "react";
import { LocaleProvider } from "@/components/shell/UserLocaleProvider";
import { preloadWebNamespaces } from "@/lib/i18n/preloadNamespaces.server";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Store shots",
};

export const viewport: Viewport = {
  colorScheme: "light",
};

/**
 * Local-only listing-shot routes. Production must 404 so this never ships as a
 * public page (no session gate — these live outside `/app`).
 */
export default async function StoreShotsLayout({ children }: { children: ReactNode }) {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  const locale = "en";
  await preloadWebNamespaces(locale, ["web.interactions", "web.groups", "web.map"]);
  const { i18n } = await getT("common", { lng: locale });
  const resources = getResources(i18n);

  return (
    <LocaleProvider locale={locale} resources={resources} timeFormat="24h" timezone="Europe/Prague">
      <MantineProvider
        cssVariablesResolver={v8CssVariablesResolver}
        forceColorScheme="light"
        theme={bonderyTheme}
      >
        <style>{`
        nextjs-portal,
        .tsqd-open-btn-container,
        .tsqd-parent-container {
          display: none !important;
        }
        .store-shot-timeline .max-w-md {
          max-width: 100%;
        }
        [data-store-shot] .mantine-Paper-root,
        [data-store-shot] .mantine-Card-root,
        [data-store-shot] .mantine-Button-root {
          border-color: transparent !important;
        }
        [data-store-shot] .mantine-Paper-root[data-with-border],
        [data-store-shot] .mantine-Card-root[data-with-border] {
          border: none !important;
        }
        [data-store-shot] .store-shot-timeline .mantine-Card-root {
          border: none !important;
        }
        [data-store-shot] .store-shot-groups .mantine-Card-root {
          background-color: #ffffff !important;
          color: #111827 !important;
        }
        [data-store-shot] .store-shot-groups .mantine-Text-root {
          color: #111827 !important;
        }
        .store-shot-light-timeline {
          --mantine-color-body: #ffffff;
          --mantine-color-default: #ffffff;
          --mantine-color-default-border: transparent;
          --mantine-color-text: #111827;
          --mantine-color-dimmed: #6b7280;
          color-scheme: light;
        }
        .store-shot-light-timeline .mantine-Paper-root {
          background-color: #ffffff !important;
        }
        .store-shot-light-timeline .max-w-md {
          background-color: #ffffff !important;
        }
        .store-shot-light-timeline .mantine-Stack-root > div > .mantine-Text-root {
          display: none !important;
        }
      `}</style>
        {children}
      </MantineProvider>
    </LocaleProvider>
  );
}
