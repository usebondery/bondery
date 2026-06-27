import { useTranslation } from "react-i18next";

/**
 * Thin wrapper around react-i18next `useTranslation`.
 * Returns `t(key, vars?)` — API-compatible with the previous custom hook.
 */
export function useMobileTranslations() {
  const { t } = useTranslation();
  return t;
}
