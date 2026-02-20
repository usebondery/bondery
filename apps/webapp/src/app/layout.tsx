import type { Metadata } from "next";
import "./globals.css";
import { bonderyTheme } from "@bondery/mantine-next";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { Lexend } from "next/font/google";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "Bondery",
  description: "Build bonds that last forever.",
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
  const nonce = (await headers()).get("x-nonce") ?? undefined;

  return (
    <html lang="en" {...mantineHtmlProps} className={lexend.variable}>
      <head>
        <ColorSchemeScript nonce={nonce} defaultColorScheme="auto" />
      </head>
      <body>
        <MantineProvider defaultColorScheme="auto" theme={bonderyTheme}>
          <ModalsProvider>
            <Notifications autoClose={5000} position="top-center" />
            {children}
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
