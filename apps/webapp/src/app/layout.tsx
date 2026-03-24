import type { Metadata } from "next";
import "./globals.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/dropzone/styles.css";
import "flag-icons/css/flag-icons.min.css";
import "@bondery/mantine-next/styles";
import { bonderyTheme } from "@bondery/mantine-next";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { Lexend } from "next/font/google";
import { ColorSchemeScript, MantineProvider, mantineHtmlProps } from "@mantine/core";
import { headers } from "next/headers";
import { WEBAPP_NAME } from "@bondery/helpers";

export const metadata: Metadata = {
  title: WEBAPP_NAME,
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
          <ModalsProvider modalProps={{ centered: true }}>
            <Notifications autoClose={6000} position="top-center" />
            {children}
          </ModalsProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
