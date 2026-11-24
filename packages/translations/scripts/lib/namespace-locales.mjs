import localeCatalog from "@bondery/schemas/locale/supported-locales.json" with { type: "json" };

export const ALL_LOCALES = localeCatalog.supported.map((entry) => entry.code);
export const SOURCE_LOCALE = localeCatalog.default;

/**
 * Locales that must ship a file for a manifest namespace.
 *
 * A namespace marked `"englishOnly": true` exists only in the source locale. It holds copy that is
 * not translated yet, such as the marketing website. Removing the flag is the switch that makes
 * every locale require the namespace, so the checks then list each missing translation.
 *
 * @param {{ englishOnly?: boolean }} entry Manifest namespace entry.
 * @returns {string[]} Locale codes.
 */
export function localesForNamespace(entry) {
  return entry.englishOnly ? [SOURCE_LOCALE] : ALL_LOCALES;
}
