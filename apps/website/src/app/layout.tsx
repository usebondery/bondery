import type { Metadata } from "next";
import "./globals.css";
import { METADATA_TITLE_DIVIDER, WEBAPP_NAME } from "@bondery/helpers";
import { bonderyTheme } from "@bondery/mantine-next";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
  v8CssVariablesResolver,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { Lexend } from "next/font/google";
import { Footer, Header } from "@/components/landing";
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
  alternates: {
    canonical: "/",
  },
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = await getCspNonce();

  return (
    <html lang="en" {...mantineHtmlProps} className={lexend.variable}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" nonce={nonce} />
      </head>
      <body>
        <JsonLd data={buildOrganizationSchema()} id="schema-organization" nonce={nonce} />
        <JsonLd data={buildWebsiteSchema()} id="schema-website" nonce={nonce} />
        <JsonLd
          data={buildSoftwareApplicationSchema()}
          id="schema-software-application"
          nonce={nonce}
        />
        <MantineProvider
          cssVariablesResolver={v8CssVariablesResolver}
          defaultColorScheme="dark"
          theme={bonderyTheme}
        >
          <Notifications autoClose={6000} position="top-center" />
          <Header />
          <main>{children}</main>
          <Footer />
        </MantineProvider>
      </body>
    </html>
  );
}
