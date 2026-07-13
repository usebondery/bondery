import {
  coerceSupportedLocale,
  DEFAULT_LOCALE,
  type SupportedLocale,
} from "@bondery/schemas/locale/supported-locale";
import { resourcesByNamespace } from "#generated/resources.js";
import { manifest } from "#manifest.js";

export function loadNamespace(lng: SupportedLocale, namespace: string): Record<string, unknown> {
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
