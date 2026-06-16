"use client";

import { Badge, Tooltip } from "@mantine/core";
import { useTranslations } from "next-intl";
import type { SubscriptionStatus } from "@bondery/types";

/**
 * Small badge showing remaining messages.
 * - Free users: shown once at least one message has been used.
 * - Premium users: shown only when ≥80% of the monthly limit is consumed.
 */
export function ChatQuotaBadge({
  subscriptionStatus,
}: {
  subscriptionStatus: SubscriptionStatus;
}) {
  const t = useTranslations("ChatPage");

  if (subscriptionStatus.plan === "premium") {
    const { aiMessagesUsed, aiMessageLimit } = subscriptionStatus;
    if (aiMessageLimit <= 0 || aiMessagesUsed / aiMessageLimit < 0.8)
      return null;

    const remaining = Math.max(0, aiMessageLimit - aiMessagesUsed);
    return (
      <Tooltip
        label={t("premiumQuotaTooltip", { remaining, limit: aiMessageLimit })}
      >
        <Badge
          variant="light"
          color={remaining === 0 ? "red" : "orange"}
          size="sm"
        >
          {t("premiumQuotaBadge", {
            used: aiMessagesUsed,
            limit: aiMessageLimit,
          })}
        </Badge>
      </Tooltip>
    );
  }

  if (subscriptionStatus.aiMessagesUsed === 0) return null;

  const remaining =
    subscriptionStatus.aiMessageLimit - subscriptionStatus.aiMessagesUsed;

  return (
    <Tooltip
      label={t("quotaTooltip", {
        remaining,
        limit: subscriptionStatus.aiMessageLimit,
      })}
    >
      <Badge
        variant="light"
        color={remaining <= 1 ? "red" : remaining <= 2 ? "orange" : "blue"}
        size="sm"
      >
        {t("quotaBadge", {
          remaining,
          limit: subscriptionStatus.aiMessageLimit,
        })}
      </Badge>
    </Tooltip>
  );
}
