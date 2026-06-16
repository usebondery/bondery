"use client";

import { Alert } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { UpgradeButton } from "@/components/shared";

/**
 * Inline alert shown when the user has exhausted their message quota.
 *
 * - variant="free"    : free limit reached — shows upgrade CTA.
 * - variant="premium" : monthly premium limit reached — shows reset date, no upgrade CTA.
 */
export function ChatQuotaAlert({
  onSuccess,
  variant = "free",
  resetAt,
}: {
  onSuccess?: () => void;
  variant?: "free" | "premium";
  resetAt?: string | null;
}) {
  const t = useTranslations("ChatPage");
  const format = useFormatter();

  if (variant === "premium") {
    const resetDate = resetAt
      ? format.dateTime(new Date(resetAt), { dateStyle: "medium" })
      : null;
    return (
      <Alert
        color="blue"
        title={t("premiumLimitAlertTitle")}
        icon={<IconSparkles size={16} />}
        variant="light"
      >
        {resetDate
          ? t("premiumLimitAlertDescriptionDate", { date: resetDate })
          : t("premiumLimitAlertDescription")}
      </Alert>
    );
  }

  return (
    <Alert
      color="orange"
      title={t("quotaAlertTitle")}
      icon={<IconSparkles size={16} />}
      variant="light"
    >
      {t("quotaAlertDescription")}
      <UpgradeButton
        onSuccess={onSuccess}
        size="xs"
        mt="sm"
        display="block"
        w="fit-content"
      />
    </Alert>
  );
}
