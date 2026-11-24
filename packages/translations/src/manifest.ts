import {
  DEFAULT_LOCALE,
  intlTagForLocale,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@bondery/schemas/locale/supported-locale";
import manifestJson from "../manifest.json" with { type: "json" };

const UI_GROUP_PREFIXES = ["web.", "mobile.", "extension."] as const;

function isUiGroup(group: string): boolean {
  return UI_GROUP_PREFIXES.some((prefix) => group.startsWith(prefix));
}

export type Platform = "web" | "mobile" | "website" | "extension";

export interface NamespaceEntry {
  /**
   * The namespace exists only in the source locale because its copy is not translated yet, such as
   * the marketing website. Locale tooling then expects no file in other locales, and the loader
   * serves the source locale. Remove the flag to start localizing the namespace.
   */
  englishOnly?: boolean;
  path: string;
  platforms: Platform[];
}

export interface TranslationManifest {
  namespaces: Record<string, NamespaceEntry>;
  preload: Record<string, string[]>;
}

export const manifest = manifestJson as TranslationManifest;

export { DEFAULT_LOCALE, intlTagForLocale, SUPPORTED_LOCALES, type SupportedLocale };

export const ALL_NAMESPACE_NAMES: string[] = Object.keys(manifest.namespaces);

export function getNamespaceManifest(): TranslationManifest {
  return manifest;
}

export function namespacesForPlatform(platform: Platform): string[] {
  return Object.entries(manifest.namespaces)
    .filter(([, entry]) => entry.platforms.includes(platform))
    .map(([name]) => name);
}

/**
 * Namespaces that any screen can read, regardless of its route group:
 * shared verbs, validation messages, and product terms.
 *
 * They are added to every UI group instead of repeated in each manifest entry.
 * A new screen that calls `useCommonTranslations` then cannot lose its copy.
 */
export const BASE_NAMESPACES = ["common", "validation", "glossary"] as const;

/**
 * Resolve the namespaces a preload group needs.
 *
 * UI groups always carry `BASE_NAMESPACES`. Non-UI groups, such as email and
 * website, return only what the manifest lists.
 *
 * @param group Manifest preload group name, such as `web.login`.
 * @returns Deduplicated namespace names.
 */
export function preloadGroup(group: string): string[] {
  const listed = manifest.preload[group] ?? [];
  if (!isUiGroup(group)) {
    return listed;
  }

  return [...new Set<string>([...BASE_NAMESPACES, ...listed])];
}

export function namespaceFilePath(namespace: string): string | undefined {
  return manifest.namespaces[namespace]?.path;
}
