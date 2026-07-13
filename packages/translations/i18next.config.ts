import { readFileSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(packageRoot, "../..");
const manifest = JSON.parse(readFileSync(join(packageRoot, "manifest.json"), "utf8")) as {
  namespaces: Record<string, unknown>;
};
const catalog = JSON.parse(
  readFileSync(join(repoRoot, "packages/schemas/locale/supported-locales.json"), "utf8"),
) as {
  default: string;
  supported: { code: string }[];
};

const locales = catalog.supported.map((entry) => entry.code);

/** Paths in this config are relative to the monorepo root (where CI runs i18next-cli). */
function fromRepo(...segments: string[]) {
  return join(...segments).replace(/\\/g, "/");
}

function fromPackage(...segments: string[]) {
  return relative(repoRoot, join(packageRoot, ...segments)).replace(/\\/g, "/");
}

const mirrorRoot = fromPackage(".i18next-cli-mirror");
const localesEnRoot = fromPackage("src/locales/en");
const typesOutDir = fromPackage("src/generated/i18next-cli");

const extractIgnore = ["**/*.test.{ts,tsx}", "**/scripts/**", "**/node_modules/**", "apps/api/**"];

function hookBaseName(namespace: string) {
  if (namespace === "common") {
    return "Common";
  }
  if (namespace === "validation") {
    return "Validation";
  }
  if (namespace === "glossary") {
    return "Glossary";
  }
  return namespace;
}

const generatedClientHooks = Object.keys(manifest.namespaces).map((namespace) => ({
  keyPrefixArg: 0,
  name: `use${hookBaseName(namespace)}Translations`,
  nsArg: -1,
}));

const generatedServerHooks = Object.keys(manifest.namespaces).map((namespace) => ({
  keyPrefixArg: 0,
  name: `get${hookBaseName(namespace)}Translations`,
  nsArg: -1,
}));

/** Run from repo root: `npx i18next-cli status -c packages/translations/i18next.config.ts` */
export default {
  extract: {
    defaultNS: "common",
    disablePlurals: true,
    ignore: extractIgnore,
    input: [
      fromRepo("apps/webapp/src/**/*.{ts,tsx}"),
      fromRepo("apps/mobile/src/**/*.{ts,tsx}"),
      fromRepo("apps/mobile/app/**/*.{ts,tsx}"),
      fromRepo("apps/chrome-extension/src/**/*.{ts,tsx}"),
      fromRepo("apps/website/src/**/*.{ts,tsx}"),
    ],
    interpolationPrefix: "{",
    interpolationSuffix: "}",
    keySeparator: ".",
    nsSeparator: ":",
    output: `${mirrorRoot}/{{language}}/{{namespace}}.json`,
    useTranslationNames: [
      "useT",
      "useTranslation",
      ...generatedClientHooks,
      ...generatedServerHooks,
    ],
  },

  lint: {
    checkInterpolationParams: true,
    ignore: [
      ...extractIgnore,
      "**/lib/sync/**",
      // Marketing site copy is not yet wired to locale files; webapp/mobile are linted strictly.
      "apps/website/**",
    ],
    ignoredAttributes: ["data-testid", "data-test-id", "aria-hidden"],
  },
  locales,
  primaryLanguage: catalog.default,

  types: {
    basePath: localesEnRoot,
    input: `${localesEnRoot}/**/*.json`,
    output: `${typesOutDir}/i18next.d.ts`,
    resourcesFile: `${typesOutDir}/resources.d.ts`,
  },
};
