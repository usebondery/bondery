import type { Metadata } from "next";
import "./globals.css";
import { bonderyTheme } from "@bondery/mantine-next";
import { Notifications } from "@mantine/notifications";
import { Lexend } from "next/font/google";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { Footer, Header } from "@/components/landing";
import Script from "next/script";
import { WEBSITE_URL } from "@/lib/config";
import { SOCIAL_LINKS, SUPPORT_EMAIL } from "@bondery/helpers";
import { headers } from "next/headers";

const ogTitle = "Bondery: Build bonds that last forever";
const ogDescription =
  "Bondery is an open-source PRM (Personal Relationship Manager) to help you track relationships, remember details, and stay connected with your network.";

export const metadata: Metadata = {
  metadataBase: new URL(WEBSITE_URL),
  title: {
    default: ogTitle,
    template: "%s | Bondery",
  },
  description: ogDescription,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: ogTitle,
    description: ogDescription,
    url: "/",
    siteName: "Bondery",
    locale: "en_US",
    type: "website",
    images: [
      {
        url: "/opengraph-image",
        width: 1200,
        height: 630,
        alt: "Bondery - Build bonds that last forever",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: ogTitle,
    description: ogDescription,
    images: ["/twitter-image"],
  },
};

const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": `${WEBSITE_URL}#organization`,
  name: "Bondery",
  description: ogDescription,
  url: WEBSITE_URL,
  logo: `${WEBSITE_URL}/logo.svg`,
  sameAs: [SOCIAL_LINKS.github, SOCIAL_LINKS.linkedin, SOCIAL_LINKS.reddit, SOCIAL_LINKS.x],
  contactPoint: [
    {
      "@type": "ContactPoint",
      contactType: "customer support",
      email: SUPPORT_EMAIL,
      availableLanguage: ["en"],
    },
  ],
} as const;

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${WEBSITE_URL}#website`,
  name: "Bondery",
  description: ogDescription,
  url: WEBSITE_URL,
  inLanguage: "en-US",
  publisher: {
    "@id": `${WEBSITE_URL}#organization`,
  },
} as const;

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" {...mantineHtmlProps} className={lexend.variable}>
      <head>
        <ColorSchemeScript nonce={nonce} defaultColorScheme="auto" />
      </head>
      <body>
        <Script
          id="schema-organization"
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <Script
          id="schema-website"
          type="application/ld+json"
          nonce={nonce}
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <MantineProvider defaultColorScheme="dark" theme={bonderyTheme}>
          <Notifications autoClose={5000} position="top-center" />
          <Header />
          <main>{children}</main>
          <Footer />
        </MantineProvider>
      </body>
    </html>
  );
}
