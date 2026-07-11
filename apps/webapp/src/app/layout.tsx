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
import { ColorSchemeScript, mantineHtmlProps } from "@mantine/core";
import { Lexend } from "next/font/google";
import { headers } from "next/headers";
import { WebappMantineProvider } from "@/components/shell/WebappMantineProvider";
import { resolveLocaleSettings } from "@/lib/i18n/resolveLocaleSettings";
import { rootMetadata } from "@/lib/metadata/rootMetadata";
import { computeColorScheme } from "@/lib/theme/computeColorScheme";
import { resolveSsrColorScheme } from "@/lib/theme/resolveSsrColorScheme";

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
  const headersList = await headers();
  const nonce = headersList.get("x-nonce") ?? undefined;
  const [{ locale }, colorScheme] = await Promise.all([
    resolveLocaleSettings(),
    resolveSsrColorScheme(),
  ]);
  const prefersDark = headersList.get("sec-ch-prefers-color-scheme") === "dark";
  const computedColorScheme = computeColorScheme(colorScheme, prefersDark);

  return (
    <html
      lang={locale}
      {...mantineHtmlProps}
      className={lexend.variable}
      data-mantine-color-scheme={computedColorScheme}
    >
      <head>
        <ColorSchemeScript
          defaultColorScheme={colorScheme}
          forceColorScheme={colorScheme !== "auto" ? computedColorScheme : undefined}
          nonce={nonce}
        />
      </head>
      <body>
        <WebappMantineProvider defaultColorScheme={colorScheme}>{children}</WebappMantineProvider>
      </body>
    </html>
  );
}
