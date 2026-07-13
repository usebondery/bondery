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
import { buildWebappRuntimeConfigFromEnv } from "@/lib/platform/runtimeConfig.server";
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
  const runtimeConfig = buildWebappRuntimeConfigFromEnv();
  const runtimeConfigJson = JSON.stringify(runtimeConfig).replaceAll("<", "\\u003c");

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
        <script id="bondery-runtime-config" nonce={nonce}>
          {`window.__BONDERY_RUNTIME_CONFIG__=${runtimeConfigJson};`}
        </script>
      </head>
      <body>
        <WebappMantineProvider defaultColorScheme={colorScheme}>{children}</WebappMantineProvider>
      </body>
    </html>
  );
}
