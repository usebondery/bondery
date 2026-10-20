import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMDX as createFumadocsMDX } from "fumadocs-mdx/next";
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
  experimental: {
    optimizePackageImports: [
      "@tabler/icons-react",
      "lucide-react",
      "@bondery/mantine-next",
      "@mantine/core",
      "@mantine/hooks",
      "@mantine/notifications",
    ],
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
    remotePatterns: [
      {
        hostname: "icons.duckduckgo.com",
        pathname: "/ip3/**",
        protocol: "https",
      },
    ],
  },
  output: "standalone",
  // Native bindings are easy to miss under isolated pnpm + standalone.
  outputFileTracingIncludes: {
    "/**": ["./node_modules/@takumi-rs/core/**", "./node_modules/sharp/**"],
  },
  // Monorepo root so file tracing includes workspace packages.
  outputFileTracingRoot: monorepoRoot,
  pageExtensions: ["ts", "tsx", "md", "mdx"],
  poweredByHeader: false,
  reactCompiler: true,
  // Outbound redirects (status, help, docs, login, auth/callback, oauth/consent, app)
  // live in src/app/**/route.ts so they can import @bondery/helpers.
  // Public URLs: server reads BONDERY_PUBLIC_*; client leaves get them as RSC props.
  async redirects() {
    return [
      {
        destination: "/blog/updates",
        permanent: true,
        source: "/blog/product",
      },
      {
        destination: "/blog/updates/:slug",
        permanent: true,
        source: "/blog/product/:slug",
      },
      {
        destination: "/docs/deploy/installation",
        permanent: true,
        source: "/docs/deploy/get-started",
      },
    ];
  },
  serverExternalPackages: ["@takumi-rs/core"],
  turbopack: {
    // Docs MDX lives at repo `docs/` and imports app deps (e.g. lucide-react).
    // Isolated installs keep those under apps/website/node_modules only.
    // Turbopack resolveAlias rejects absolute Windows paths ("windows imports
    // are not implemented yet"). Alias targets are relative to the app project
    // dir (`apps/website`), even when `root` is the monorepo.
    resolveAlias: {
      "lucide-react": "./node_modules/lucide-react",
    },
    root: monorepoRoot,
  },
  typedRoutes: true,
};

const withFumadocsMDX = createFumadocsMDX();

// Fumadocs MDX compiles all `.mdx` (docs + blog). Do not wrap with `@next/mdx` — it breaks frontmatter.
export default withFumadocsMDX(nextConfig);
