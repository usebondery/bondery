/**
 * Issue 3 — scaled control using generated namespace hooks.
 */
import { useCommonTranslations, usePeoplePageTranslations } from "../src/lib/i18n/generated/hooks";

export function Issue3I18nStrictScaledControl() {
  const t = usePeoplePageTranslations("DeleteContact");
  const tCommon = useCommonTranslations();
  return t("Title") + tCommon("actions.cancel");
}
