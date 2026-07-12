"use client";

/** Scaled issue 3 variant: many loose t() calls in one module. */
import { Text } from "@mantine/core";

type LooseT = (key: string, options?: Record<string, string>) => string;

function useLooseTranslations(): { t: LooseT; tCommon: LooseT } {
  const t: LooseT = (key) => key;
  const tCommon: LooseT = (key) => key;
  return { t, tCommon };
}

function LooseTranslationBlock({ contactName }: { contactName: string }) {
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

export function Issue3LooseI18nScaled({ contactName }: { contactName: string }) {
  return (
    <>
      <LooseTranslationBlock contactName={contactName} />
      <LooseTranslationBlock contactName={contactName} />
      <LooseTranslationBlock contactName={contactName} />
      <LooseTranslationBlock contactName={contactName} />
      <LooseTranslationBlock contactName={contactName} />
      <LooseTranslationBlock contactName={contactName} />
    </>
  );
}
