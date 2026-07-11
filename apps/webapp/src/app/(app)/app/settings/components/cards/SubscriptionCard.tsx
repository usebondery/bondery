"use client";

import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { SubscriptionStatus } from "@bondery/schemas";
import { Badge, Button, CardSection, Group, Progress, Stack, Text } from "@mantine/core";
import { IconCreditCard, IconExternalLink } from "@tabler/icons-react";
import { UpgradeButton } from "@/components/shared/UpgradeButton";
import { useDateFormatter as useFormatter } from "@/lib/i18n/useDateFormatter";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { useSubscriptionQuery } from "@/lib/query/hooks/useSubscription";
import { SettingsSection } from "./SettingsSection";

function SubscriptionCardContent({
  subscriptionStatus,
}: {
  subscriptionStatus: SubscriptionStatus;
}) {
  const t = useWebTranslations("SettingsPage", "Subscription");
  const format = useFormatter();
  const isPremium = subscriptionStatus.plan === "premium";
  const portalUrl = API_ROUTES.SUBSCRIPTIONS_PORTAL;

  const formatDate = (value: string | null): string | null => {
    if (!value) {
      return null;
    }
    return format.dateTime(new Date(value), { dateStyle: "medium" });
  };

  const formatAmount = (amountMinor: number | null, currency: string | null): string | null => {
    if (amountMinor == null || !currency) {
      return null;
    }
    const upperCurrency = currency.toUpperCase();

    let fractionDigits = 2;
    try {
      fractionDigits =
        new Intl.NumberFormat(undefined, {
          currency: upperCurrency,
          style: "currency",
        }).resolvedOptions().maximumFractionDigits ?? 2;
    } catch {
      fractionDigits = 2;
    }

    const majorAmount = amountMinor / 10 ** fractionDigits;

    try {
      return format.number(majorAmount, {
        currency: upperCurrency,
        style: "currency",
      });
    } catch {
      return `${majorAmount.toFixed(2)} ${upperCurrency}`;
    }
  };

  const trialEndsAt = formatDate(subscriptionStatus.trialEndsAt);
  const periodEndsAt = formatDate(subscriptionStatus.currentPeriodEnd);
  const renewalAmount = formatAmount(subscriptionStatus.amount, subscriptionStatus.currency);
  const monthlyResetAt = formatDate(subscriptionStatus.aiMonthlyResetAt);

  const getSubscriptionDescription = (): { text: string; color: string } => {
    const polarStatus = subscriptionStatus.polarStatus;

    if (!isPremium) {
      if (polarStatus === "past_due" || polarStatus === "unpaid" || polarStatus === "incomplete") {
        return { color: "red", text: t("PaymentIssue") };
      }

      if (polarStatus === "canceled" || polarStatus === "incomplete_expired") {
        if (periodEndsAt) {
          return {
            color: "orange",
            text: t("SubscriptionExpiredDate", { date: periodEndsAt }),
          };
        }
        return { color: "orange", text: t("SubscriptionExpired") };
      }

      return {
        color: "dimmed",
        text: t("FreeDescription", {
          limit: subscriptionStatus.aiMessageLimit,
          used: subscriptionStatus.aiMessagesUsed,
        }),
      };
    }

    if (polarStatus === "trialing") {
      if (subscriptionStatus.cancelAtPeriodEnd) {
        if (trialEndsAt) {
          return {
            color: "orange",
            text: t("TrialExpiresNoRenewDate", { date: trialEndsAt }),
          };
        }
        return { color: "orange", text: t("TrialExpiresNoRenew") };
      }

      if (trialEndsAt && renewalAmount) {
        return {
          color: "teal",
          text: t("TrialRenewsWithCharge", {
            amount: renewalAmount,
            date: trialEndsAt,
          }),
        };
      }

      if (trialEndsAt) {
        return { color: "teal", text: t("TrialRenews", { date: trialEndsAt }) };
      }

      return { color: "teal", text: t("TrialActive") };
    }

    if (polarStatus === "active") {
      if (subscriptionStatus.cancelAtPeriodEnd) {
        if (periodEndsAt) {
          return {
            color: "orange",
            text: t("SubscriptionExpiresNoRenewDate", { date: periodEndsAt }),
          };
        }
        return { color: "orange", text: t("SubscriptionExpiresNoRenew") };
      }

      if (periodEndsAt) {
        return { color: "dimmed", text: t("RenewsOn", { date: periodEndsAt }) };
      }

      return { color: "dimmed", text: t("ActivePlan") };
    }

    if (polarStatus === "past_due" || polarStatus === "unpaid" || polarStatus === "incomplete") {
      return { color: "red", text: t("PaymentIssue") };
    }

    if (polarStatus === "canceled" || polarStatus === "incomplete_expired") {
      if (periodEndsAt) {
        return {
          color: "orange",
          text: t("SubscriptionExpiredDate", { date: periodEndsAt }),
        };
      }
      return { color: "orange", text: t("SubscriptionExpired") };
    }

    if (subscriptionStatus.cancelAtPeriodEnd) {
      if (periodEndsAt) {
        return {
          color: "orange",
          text: t("SubscriptionExpiresNoRenewDate", { date: periodEndsAt }),
        };
      }
      return { color: "orange", text: t("SubscriptionExpiresNoRenew") };
    }

    if (periodEndsAt) {
      return { color: "dimmed", text: t("RenewsOn", { date: periodEndsAt }) };
    }

    return { color: "dimmed", text: t("ActivePlan") };
  };

  const description = getSubscriptionDescription();
  const planLabel = isPremium
    ? (subscriptionStatus.productName ?? t("PremiumPlan"))
    : t("FreePlan");

  return (
    <SettingsSection icon={<IconCreditCard size={20} />} title={t("Title")}>
      <CardSection inheritPadding py="md">
        <Stack gap="md">
          <Group align="flex-start" justify="space-between">
            <div>
              <Group gap="xs">
                <Text fw={500}>{t("CurrentPlan")}</Text>
                <Badge color={isPremium ? "violet" : "gray"} variant="light">
                  {planLabel}
                </Badge>
              </Group>
              <Text c="dimmed" mt={4} size="sm">
                {description.text}
              </Text>
            </div>
            {isPremium ? (
              <Button
                component="a"
                href={portalUrl}
                leftSection={<IconExternalLink size={16} />}
                variant="light"
              >
                {t("ManageSubscription")}
              </Button>
            ) : (
              <UpgradeButton />
            )}
          </Group>
          {isPremium && subscriptionStatus.aiMessageLimit > 0 && (
            <div>
              <Group justify="space-between" mb={6}>
                <Text c="dimmed" size="xs">
                  {t("MonthlyUsageLabel", {
                    limit: subscriptionStatus.aiMessageLimit,
                    used: subscriptionStatus.aiMessagesUsed,
                  })}
                </Text>
                {monthlyResetAt && (
                  <Text c="dimmed" size="xs">
                    {t("MonthlyUsageReset", { date: monthlyResetAt })}
                  </Text>
                )}
              </Group>
              <Progress
                color={
                  subscriptionStatus.aiMessagesUsed >= subscriptionStatus.aiMessageLimit
                    ? "red"
                    : subscriptionStatus.aiMessagesUsed / subscriptionStatus.aiMessageLimit >= 0.8
                      ? "orange"
                      : "violet"
                }
                radius="xl"
                size="sm"
                value={
                  (subscriptionStatus.aiMessagesUsed / subscriptionStatus.aiMessageLimit) * 100
                }
              />
            </div>
          )}
        </Stack>
      </CardSection>
    </SettingsSection>
  );
}

export function SubscriptionCard() {
  const { data: subscriptionStatus } = useSubscriptionQuery();

  if (!subscriptionStatus) {
    return null;
  }

  return <SubscriptionCardContent subscriptionStatus={subscriptionStatus} />;
}
