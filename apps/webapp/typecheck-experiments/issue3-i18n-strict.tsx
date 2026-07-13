/**
 * Issue 3 — control: strict i18next Resources typing via generated namespace hooks.
 */
import { useCommonTranslations, usePeoplePageTranslations } from "../src/lib/i18n/generated/hooks";

export function Issue3I18nStrictControl() {
  const t = usePeoplePageTranslations("DeleteContact");
  const tCommon = useCommonTranslations();
  return t("Title") + tCommon("actions.cancel");
}
