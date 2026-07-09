import { useTranslation } from "react-i18next";

export function useMobileTranslations(namespace: string = "common", keyPrefix?: string) {
  const { t } = useTranslation(namespace, { keyPrefix });
  return t;
}

export function useCommonTranslations(keyPrefix?: string) {
  return useMobileTranslations("common", keyPrefix);
}

export function useValidationTranslations(keyPrefix?: string) {
  return useMobileTranslations("validation", keyPrefix);
}
