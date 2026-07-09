"use client";

import type { SubscriptionStatus } from "@bondery/schemas";
import { Badge, Tooltip } from "@mantine/core";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

/**
 * Small badge showing remaining messages.
 * - Free users: shown once at least one message has been used.
 * - Premium users: shown only when ≥80% of the monthly limit is consumed.
 */
export function ChatQuotaBadge({ subscriptionStatus }: { subscriptionStatus: SubscriptionStatus }) {
  const t = useWebTranslations("ChatPage");

  if (subscriptionStatus.plan === "premium") {
    const { aiMessagesUsed, aiMessageLimit } = subscriptionStatus;
    if (aiMessageLimit <= 0 || aiMessagesUsed / aiMessageLimit < 0.8) {
      return null;
    }

    const remaining = Math.max(0, aiMessageLimit - aiMessagesUsed);
    return (
      <Tooltip label={t("premiumQuotaTooltip", { limit: aiMessageLimit, remaining })}>
        <Badge color={remaining === 0 ? "red" : "orange"} size="sm" variant="light">
          {t("premiumQuotaBadge", {
            limit: aiMessageLimit,
            used: aiMessagesUsed,
          })}
        </Badge>
      </Tooltip>
    );
  }

  if (subscriptionStatus.aiMessagesUsed === 0) {
    return null;
  }

  const remaining = subscriptionStatus.aiMessageLimit - subscriptionStatus.aiMessagesUsed;

  return (
    <Tooltip
      label={t("quotaTooltip", {
        limit: subscriptionStatus.aiMessageLimit,
        remaining,
      })}
    >
      <Badge
        color={remaining <= 1 ? "red" : remaining <= 2 ? "orange" : "blue"}
        size="sm"
        variant="light"
      >
        {t("quotaBadge", {
          limit: subscriptionStatus.aiMessageLimit,
          remaining,
        })}
      </Badge>
    </Tooltip>
  );
}
