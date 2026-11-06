import type { Metadata } from "next";
import type { ComponentProps } from "react";
import "./globals.css";
import { METADATA_TITLE_DIVIDER, WEBAPP_NAME } from "@bondery/helpers";
import { ColorSchemeScript } from "@mantine/core";
import { Lexend } from "next/font/google";
import PlausibleProvider from "next-plausible";
import { WEBSITE_URL } from "@/lib/config";
import { SITE_DESCRIPTION, SITE_TITLE } from "@/lib/seo/copy";
import { JsonLd } from "@/lib/seo/json-ld";
import { getCspNonce } from "@/lib/seo/nonce";
import {
  buildOrganizationSchema,
  buildSoftwareApplicationSchema,
  buildWebsiteSchema,
} from "@/lib/seo/schemas/site";

export const metadata: Metadata = {
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

const plausibleDomain = process.env.BONDERY_PUBLIC_PLAUSIBLE_DOMAIN;
const plausibleHost = process.env.BONDERY_PUBLIC_PLAUSIBLE_HOST;
const analyticsEnabled = Boolean(plausibleDomain && plausibleHost);

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = await getCspNonce();

  return (
    <html className={lexend.variable} lang="en" suppressHydrationWarning>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" nonce={nonce} />
        <link href={`${WEBSITE_URL.replace(/\/+$/, "")}/.well-known/ard.json`} rel="ard" />
      </head>
      <body>
        <JsonLd data={buildOrganizationSchema()} id="schema-organization" nonce={nonce} />
        <JsonLd data={buildWebsiteSchema()} id="schema-website" nonce={nonce} />
        <JsonLd
          data={buildSoftwareApplicationSchema()}
          id="schema-software-application"
          nonce={nonce}
        />
        {plausibleHost && plausibleDomain ? (
          <PlausibleProvider
            enabled={analyticsEnabled}
            init={{
              captureOnLocalhost: process.env.NODE_ENV === "development",
            }}
            scriptProps={
              { "data-domain": plausibleDomain } as NonNullable<
                ComponentProps<typeof PlausibleProvider>["scriptProps"]
              >
            }
            src={`${plausibleHost.replace(/\/$/, "")}/js/script.js`}
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
