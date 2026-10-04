import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { coerceSupportedLocale, DEFAULT_LOCALE, namespaceFilePath } from "@bondery/translations";

function localesRoot(): string {
  const fromThisFile = join(
    dirname(fileURLToPath(import.meta.url)),
    "../../../../../packages/translations/dist/locales",
  );
  const fromAppCwd = join(process.cwd(), "../../packages/translations/dist/locales");
  const fromRepoCwd = join(process.cwd(), "packages/translations/dist/locales");
  for (const candidate of [fromThisFile, fromAppCwd, fromRepoCwd]) {
    if (existsSync(candidate)) {
      return candidate;
    }
  }
  return fromThisFile;
}

/**
 * Read locale JSON from disk. The compiled `resources.js` graph caches JSON
 * modules for the life of the Next process, so new keys never appear until
 * restart. next-i18next already calls `reloadResources` in development.
 */
export function diskResourceLoader(
  language: string,
  namespace: string,
): Promise<Record<string, unknown>> {
  const relative = namespaceFilePath(namespace);
  if (!relative) {
    return Promise.resolve({});
  }

  const lng = coerceSupportedLocale(language);
  const root = localesRoot();
  for (const locale of [lng, DEFAULT_LOCALE]) {
    try {
      const parsed: unknown = JSON.parse(readFileSync(join(root, locale, relative), "utf8"));
      if (parsed && typeof parsed === "object") {
        return Promise.resolve(parsed as Record<string, unknown>);
      }
    } catch {
      // Try fallback locale, then empty.
    }
  }
  return Promise.resolve({});
}
