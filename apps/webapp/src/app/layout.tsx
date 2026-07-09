import "./globals.css";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "@mantine/dates/styles.css";
import "@mantine/tiptap/styles.css";
import "@mantine/dropzone/styles.css";
import "@mantine/spotlight/styles.css";
import "@mantine/nprogress/styles.css";
import "@mantine/code-highlight/styles.css";
import "@/components/code-highlight-hljs.css";
import "flag-icons/css/flag-icons.min.css";
import "@bondery/mantine-next/styles";
import { bonderyTheme } from "@bondery/mantine-next";
import {
  ColorSchemeScript,
  MantineProvider,
  mantineHtmlProps,
  v8CssVariablesResolver,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { Lexend } from "next/font/google";
import { headers } from "next/headers";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";
import { rootMetadata } from "@/lib/metadata/rootMetadata";

export const metadata = rootMetadata;

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
  const { locale } = await resolveLocaleSettings();

  return (
    <html lang={locale} {...mantineHtmlProps} className={lexend.variable}>
      <head>
        <ColorSchemeScript defaultColorScheme="auto" nonce={nonce} />
      </head>
      <body>
        <MantineProvider
          cssVariablesResolver={v8CssVariablesResolver}
          defaultColorScheme="auto"
          theme={bonderyTheme}
        >
          <Notifications autoClose={6000} position="top-center" />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
