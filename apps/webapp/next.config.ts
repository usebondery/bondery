import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { NextConfig } from "next";

const appDir = path.dirname(fileURLToPath(import.meta.url));
const monorepoRoot = path.join(appDir, "../..");

/**
 * Directory Turbopack must follow for pnpm `enableGlobalVirtualStore` junctions
 * (Next 16.4+ `turbopackAdditionalRoots`). Prefer PNPM_STORE_DIR (Docker);
 * otherwise derive from the real path of local `next`.
 */
function resolvePnpmStorePath(): string | undefined {
  if (process.env.PNPM_STORE_DIR) {
    return process.env.PNPM_STORE_DIR;
  }
  try {
    const nextReal = fs.realpathSync(path.join(appDir, "node_modules", "next"));
    const match = /[/\\]store[/\\]v\d+/i.exec(nextReal);
    if (!match || match.index === undefined) {
      return undefined;
    }
    return nextReal.slice(0, match.index + match[0].length);
  } catch {
    return undefined;
  }
}

const pnpmStorePath = resolvePnpmStorePath();

const nextConfig: NextConfig = {
  // Portless: allow https://app.usebondery.test to hit the Next dev server.
  allowedDevOrigins: [
    "app.usebondery.test",
    "*.app.usebondery.test",
    "usebondery.test",
    "*.usebondery.test",
  ],
  experimental: {
    optimizePackageImports: [
      "@tabler/icons-react",
      "@bondery/mantine-next",
      "@mantine/core",
      "@mantine/dates",
      "@mantine/dropzone",
      "@mantine/form",
      "@mantine/hooks",
      "@mantine/modals",
      "@mantine/notifications",
      "@mantine/nprogress",
      "@mantine/spotlight",
      "@mantine/tiptap",
    ],
    proxyClientMaxBodySize: "20mb",
    turbopackPluginRuntimeStrategy: "workerThreads",
    turbopackRustReactCompiler: true,
    typedEnv: true,
    useTypeScriptCli: true,
    ...(pnpmStorePath
      ? {
          turbopackAdditionalRoots: {
            pnpmStore: { ignoreIfMissing: true, path: pnpmStorePath },
          },
        }
      : {}),
  },
  async headers() {
    return [
      {
        headers: [
          {
            key: "Cache-Control",
            value: "no-cache, no-store, must-revalidate",
          },
        ],
        // Prevent browsers from caching a stale service worker script
        source: "/sw.js",
      },
      {
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains; preload",
          },
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
        source: "/:path*",
      },
    ];
  },
  images: {
    formats: ["image/avif", "image/webp"],
  },
  output: "standalone",
  // Native bindings are easy to miss under isolated pnpm + standalone.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@takumi-rs/core/**", "./node_modules/sharp/**"],
  },
  // Monorepo root so file tracing includes workspace packages.
  outputFileTracingRoot: monorepoRoot,
  poweredByHeader: false,
  reactCompiler: true,
  serverExternalPackages: ["@takumi-rs/core"],
  turbopack: {
    root: monorepoRoot,
  },
  typedRoutes: true,
};

export default nextConfig;
