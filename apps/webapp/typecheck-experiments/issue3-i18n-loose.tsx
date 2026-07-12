"use client";

/**
 * Issue 3 — variant: loose translation function (no per-call Resources resolution).
 */
import { Text } from "@mantine/core";

type LooseT = (key: string, options?: Record<string, string>) => string;

function useLooseTranslations(): { t: LooseT; tCommon: LooseT } {
  const t: LooseT = (key, _options) => key;
  const tCommon: LooseT = (key, _options) => key;
  return { t, tCommon };
}

export function Issue3LooseI18n({ contactName }: { contactName: string }) {
  const { t, tCommon } = useLooseTranslations();

  return (
    <>
      <Text>{t("Title", { name: contactName })}</Text>
      <Text>{t("Message", { name: contactName })}</Text>
      <Text>{t("LoadingTitle")}</Text>
      <Text>{t("LoadingDescription")}</Text>
      <Text>{t("SuccessDescription")}</Text>
      <Text>{tCommon("confirm.yesDelete")}</Text>
      <Text>{tCommon("confirm.noCancel")}</Text>
      <Text>{tCommon("feedback.successTitle")}</Text>
      <Text>{tCommon("feedback.errorTitle")}</Text>
    </>
  );
}
