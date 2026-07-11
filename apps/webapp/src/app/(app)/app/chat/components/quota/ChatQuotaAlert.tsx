"use client";

import { Alert } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { UpgradeButton } from "@/components/shared/UpgradeButton";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

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
  const t = useWebTranslations("ChatPage");
  const format = useFormatter();

  if (variant === "premium") {
    const resetDate = resetAt ? format.dateTime(new Date(resetAt), { dateStyle: "medium" }) : null;
    return (
      <Alert
        color="blue"
        icon={<IconSparkles size={16} />}
        title={t("premiumLimitAlertTitle")}
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
      icon={<IconSparkles size={16} />}
      title={t("quotaAlertTitle")}
      variant="light"
    >
      {t("quotaAlertDescription")}
      <UpgradeButton display="block" mt="sm" onSuccess={onSuccess} size="xs" w="fit-content" />
    </Alert>
  );
}
