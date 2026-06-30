import { useT } from "next-i18next/client";

/**
 * Client translation hook — API-compatible with the former next-intl useTranslations.
 */
export function useWebTranslations(keyPrefix?: string) {
  const { t } = useT(undefined, keyPrefix ? { keyPrefix } : undefined);
  return t;
}
