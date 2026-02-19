import type { Metadata } from "next";
import "./globals.css";
import { Notifications } from "@mantine/notifications";
import { bonderyTheme } from "@bondery/branding/theme/src";
import { Lexend } from "next/font/google";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { Footer, Header } from "@/components/landing";
import Head from "next/head";
import Script from "next/script";
import { WEBSITE_URL } from "@/lib/config";
import { SOCIAL_LINKS, SUPPORT_EMAIL } from "@bondery/helpers";

const ogTitle = "Bondery: Build bonds that last forever";
const ogDescription =
  "Never forget the details about people who matter. Track relationships, remember details, and stay connected.";

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
  name: "Bondery",
  url: WEBSITE_URL,
  logo: `${WEBSITE_URL}/logo.svg`,
  sameAs: [SOCIAL_LINKS.github, SOCIAL_LINKS.linkedin],
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
  name: "Bondery",
  url: WEBSITE_URL,
  inLanguage: "en",
} as const;

const lexend = Lexend({
  subsets: ["latin"],
  variable: "--font-lexend",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" {...mantineHtmlProps} className={lexend.variable}>
      <Head>
        <ColorSchemeScript nonce="8IBTHwOdqNKAWeKl7plt8g==" defaultColorScheme="auto" />
      </Head>
      <body>
        <Script
          id="schema-organization"
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
        />
        <Script
          id="schema-website"
          type="application/ld+json"
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
