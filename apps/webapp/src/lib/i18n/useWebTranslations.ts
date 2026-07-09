import { useT } from "next-i18next/client";

/**
 * Client translation hook — explicit namespace + optional nested key prefix.
 */
export function useWebTranslations(namespace: string, keyPrefix?: string) {
  const { t } = useT(namespace, keyPrefix ? { keyPrefix } : undefined);
  return t;
}

export function useCommonTranslations(keyPrefix?: string) {
  return useWebTranslations("common", keyPrefix);
}

export function useValidationTranslations(keyPrefix?: string) {
  return useWebTranslations("validation", keyPrefix);
}
