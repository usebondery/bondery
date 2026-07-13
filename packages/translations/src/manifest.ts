import {
  DEFAULT_LOCALE,
  SUPPORTED_LOCALES,
  type SupportedLocale,
} from "@bondery/schemas/locale/supported-locale";
import manifestJson from "../manifest.json" with { type: "json" };

export type Platform = "web" | "mobile" | "website" | "extension";

export interface NamespaceEntry {
  path: string;
  platforms: Platform[];
}

export interface TranslationManifest {
  namespaces: Record<string, NamespaceEntry>;
  preload: Record<string, string[]>;
}

export const manifest = manifestJson as TranslationManifest;

export { DEFAULT_LOCALE, SUPPORTED_LOCALES, type SupportedLocale };

export const ALL_NAMESPACE_NAMES = Object.keys(manifest.namespaces);

export function getNamespaceManifest(): TranslationManifest {
  return manifest;
}

export function namespacesForPlatform(platform: Platform): string[] {
  return Object.entries(manifest.namespaces)
    .filter(([, entry]) => entry.platforms.includes(platform))
    .map(([name]) => name);
}

export function preloadGroup(group: string): string[] {
  return manifest.preload[group] ?? [];
}

export function namespaceFilePath(namespace: string): string | undefined {
  return manifest.namespaces[namespace]?.path;
}
