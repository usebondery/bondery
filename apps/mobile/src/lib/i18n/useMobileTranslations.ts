import { useMemo } from "react";
import { cs, en } from "@bondery/translations";
import { useMobilePreferences } from "../preferences/useMobilePreferences";

type MessageDictionary = Record<string, unknown>;

const dictionaries: Record<"en" | "cs", MessageDictionary> = {
  en,
  cs,
};

function getNestedValue(dictionary: MessageDictionary, key: string): string {
  const value = key.split(".").reduce<unknown>((accumulator, segment) => {
    if (typeof accumulator === "object" && accumulator !== null && segment in accumulator) {
      return (accumulator as Record<string, unknown>)[segment];
    }

    return undefined;
  }, dictionary);

  return typeof value === "string" ? value : key;
}

/**
 * Returns typed mobile translation lookup function backed by shared package dictionaries.
 */
export function useMobileTranslations() {
  const locale = useMobilePreferences((state) => state.locale);

  return useMemo(() => {
    const dictionary = dictionaries[locale] || dictionaries.en;

    return (key: string) => getNestedValue(dictionary, key);
  }, [locale]);
}
