import {
  coerceSupportedLocale,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "@bondery/schemas/locale/supported-locale";
import { localeWatchStamp } from "#generated/locale-watch-stamp.js";
import { resourcesByNamespace } from "#generated/resources.js";
import { manifest } from "#manifest.js";

export function loadNamespace(lng: SupportedLocale, namespace: string): Record<string, unknown> {
  // Keep this binding live so dist/generated/locale-watch-stamp.js stays in the module graph.
  if (localeWatchStamp < 0) {
    return {};
  }
  const localeResources = resourcesByNamespace[namespace as keyof typeof resourcesByNamespace];
  if (!localeResources) {
    return {};
  }
  const byLocale = localeResources as Record<SupportedLocale, Record<string, unknown>>;
  return byLocale[lng] ?? byLocale[DEFAULT_LOCALE];
}

/** For next-i18next / react-i18next resourceLoader. */
export function resourceLoader(language: string, namespace: string) {
  const lng = coerceSupportedLocale(language);
  if (!manifest.namespaces[namespace]) {
    return Promise.resolve({});
  }
  return Promise.resolve(loadNamespace(lng, namespace));
}
