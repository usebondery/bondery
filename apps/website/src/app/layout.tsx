import type { Metadata } from "next";
import type { ComponentProps } from "react";
import "./globals.css";
import { METADATA_TITLE_DIVIDER, WEBAPP_NAME } from "@bondery/helpers";
import { ColorSchemeScript } from "@mantine/core";
import { Lexend } from "next/font/google";
import PlausibleProvider from "next-plausible";
import { WEBSITE_URL } from "@/lib/config";
import { getPlausibleDomain, getPlausibleHost, isDevelopment } from "@/lib/env";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo/copy";
import { JsonLd } from "@/lib/seo/json-ld";
import { getCspNonce } from "@/lib/seo/nonce";
import {
  buildOrganizationSchema,
  buildSoftwareApplicationSchema,
  buildWebsiteSchema,
} from "@/lib/seo/schemas/site";

const TRAILING_SLASHES_RE = /\/+$/;
const TRAILING_SLASH_RE = /\/$/;
const metadata: Metadata = {
  description: SITE_DESCRIPTION,
  metadataBase: new URL(WEBSITE_URL),
  openGraph: {
    description: SITE_DESCRIPTION,
    images: [
      {
        alt: SITE_TITLE,
        height: 630,
        url: "/opengraph-image",
        width: 1200,
      },
    ],
    locale: "en_US",
    siteName: "Bondery",
    title: SITE_TITLE,
    type: "website",
    url: "/",
  },
  title: {
    default: SITE_TITLE,
    template: `%s ${METADATA_TITLE_DIVIDER} ${WEBAPP_NAME}`,
  },
  twitter: {
    card: "summary_large_image",
    description: SITE_DESCRIPTION,
    images: ["/twitter-image"],
    title: SITE_TITLE,
  },
};

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

const plausibleDomain = getPlausibleDomain();
const plausibleHost = getPlausibleHost();
const analyticsEnabled = Boolean(plausibleDomain && plausibleHost);

const JSON_LD_ID_ORGANIZATION = "schema-organization";
const JSON_LD_ID_SOFTWARE_APPLICATION = "schema-software-application";
const JSON_LD_ID_WEBSITE = "schema-website";

async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = await getCspNonce();

  return (
    <html className={lexend.variable} lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" nonce={nonce} />
        <link
          href={`${WEBSITE_URL.replace(TRAILING_SLASHES_RE, "")}/.well-known/ard.json`}
          rel="ard"
        />
      </head>
      <body>
        <JsonLd data={buildOrganizationSchema()} id={JSON_LD_ID_ORGANIZATION} nonce={nonce} />
        <JsonLd data={buildWebsiteSchema()} id={JSON_LD_ID_WEBSITE} nonce={nonce} />
        <JsonLd
          data={buildSoftwareApplicationSchema()}
          id={JSON_LD_ID_SOFTWARE_APPLICATION}
          nonce={nonce}
        />
        {plausibleHost && plausibleDomain ? (
          <PlausibleProvider
            enabled={analyticsEnabled}
            init={{
              captureOnLocalhost: isDevelopment(),
            }}
            scriptProps={
              { "data-domain": plausibleDomain } as NonNullable<
                ComponentProps<typeof PlausibleProvider>["scriptProps"]
              >
            }
            src={`${plausibleHost.replace(TRAILING_SLASH_RE, "")}/js/script.js`}
          >
            {children}
          </PlausibleProvider>
        ) : (
          children
        )}
      </body>
    </html>
  );
}

export { metadata };
export default RootLayout;
