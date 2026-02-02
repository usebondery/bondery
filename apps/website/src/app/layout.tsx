import type { Metadata } from "next";
import "./globals.css";
import { Notifications } from "@mantine/notifications";
import { bonderyTheme } from "@bondery/branding/theme/src";
import { Lexend } from "next/font/google";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { Footer, Header } from "@/components/landing";
import Head from "next/head";
import { WEBSITE_URL } from "@/lib/config";

export const metadata: Metadata = {
  title: "Bondery - Build bonds that last forever",
  description:
    "Never forget the details about people who matter. Track relationships, remember details, and stay connected.",
  openGraph: {
    title: "Bondery - Build bonds that last forever",
    description: "Never forget the details about people who matter.",
    url: WEBSITE_URL,
    siteName: "Bondery",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Bondery - Build bonds that last forever",
    description: "Never forget the details about people who matter.",
  },
};

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
