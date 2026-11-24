"use client";

import { Alert } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { UpgradeButton } from "@/components/shared/UpgradeButton";
import { useChatPageTranslations } from "@/lib/i18n/generated/hooks";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";

/**
 * Inline alert shown when the user has exhausted their message quota.
 *
 * Both plans have a monthly allowance with a reset date, so both name it.
 * Only the free plan offers the upgrade call to action.
 *
 * - variant="free"    : free limit reached — shows the reset date and the upgrade CTA.
 * - variant="premium" : premium limit reached — shows the reset date, no upgrade CTA.
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
  const t = useChatPageTranslations();
  const format = useFormatter();
  const resetDate = resetAt ? format.formatDate(new Date(resetAt), "medium") : null;

  if (variant === "premium") {
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
      {resetDate
        ? t("freeLimitAlertDescriptionDate", { date: resetDate })
        : t("quotaAlertDescription")}
      <UpgradeButton display="block" mt="sm" onSuccess={onSuccess} size="xs" w="fit-content" />
    </Alert>
  );
}
