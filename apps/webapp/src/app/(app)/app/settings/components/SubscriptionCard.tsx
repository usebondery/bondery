"use client";

import {
  Badge,
  Button,
  CardSection,
  Group,
  Progress,
  Stack,
  Text,
} from "@mantine/core";
import { IconCreditCard, IconExternalLink } from "@tabler/icons-react";
import { useFormatter, useTranslations } from "next-intl";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import { SettingsSection } from "./SettingsSection";
import type { SubscriptionStatus } from "@bondery/schemas";
import { UpgradeButton } from "@/components/shared";

/**
 * Settings card showing the user's current subscription plan
 * with upgrade/manage actions.
 */
export function SubscriptionCard({
  subscriptionStatus,
}: {
  subscriptionStatus: SubscriptionStatus;
}) {
  const t = useTranslations("SettingsPage.Subscription");
  const format = useFormatter();
  const isPremium = subscriptionStatus.plan === "premium";
  const portalUrl = API_ROUTES.SUBSCRIPTIONS_PORTAL;

  const formatDate = (value: string | null): string | null => {
    if (!value) return null;
    return format.dateTime(new Date(value), { dateStyle: "medium" });
  };

  const formatAmount = (
    amountMinor: number | null,
    currency: string | null,
  ): string | null => {
    if (amountMinor == null || !currency) return null;
    const upperCurrency = currency.toUpperCase();

    let fractionDigits = 2;
    try {
      fractionDigits =
        new Intl.NumberFormat(undefined, {
          style: "currency",
          currency: upperCurrency,
        }).resolvedOptions().maximumFractionDigits ?? 2;
    } catch {
      fractionDigits = 2;
    }

    const majorAmount = amountMinor / 10 ** fractionDigits;

    try {
      return format.number(majorAmount, {
        style: "currency",
        currency: upperCurrency,
      });
    } catch {
      return `${majorAmount.toFixed(2)} ${upperCurrency}`;
    }
  };

  const trialEndsAt = formatDate(subscriptionStatus.trialEndsAt);
  const periodEndsAt = formatDate(subscriptionStatus.currentPeriodEnd);
  const renewalAmount = formatAmount(
    subscriptionStatus.amount,
    subscriptionStatus.currency,
  );
  const monthlyResetAt = formatDate(subscriptionStatus.aiMonthlyResetAt);

  const getSubscriptionDescription = (): { text: string; color: string } => {
    const polarStatus = subscriptionStatus.polarStatus;

    if (!isPremium) {
      if (
        polarStatus === "past_due" ||
        polarStatus === "unpaid" ||
        polarStatus === "incomplete"
      ) {
        return { text: t("PaymentIssue"), color: "red" };
      }

      if (polarStatus === "canceled" || polarStatus === "incomplete_expired") {
        if (periodEndsAt) {
          return {
            text: t("SubscriptionExpiredDate", { date: periodEndsAt }),
            color: "orange",
          };
        }
        return { text: t("SubscriptionExpired"), color: "orange" };
      }

      return {
        text: t("FreeDescription", {
          used: subscriptionStatus.aiMessagesUsed,
          limit: subscriptionStatus.aiMessageLimit,
        }),
        color: "dimmed",
      };
    }

    if (polarStatus === "trialing") {
      if (subscriptionStatus.cancelAtPeriodEnd) {
        if (trialEndsAt) {
          return {
            text: t("TrialExpiresNoRenewDate", { date: trialEndsAt }),
            color: "orange",
          };
        }
        return { text: t("TrialExpiresNoRenew"), color: "orange" };
      }

      if (trialEndsAt && renewalAmount) {
        return {
          text: t("TrialRenewsWithCharge", {
            date: trialEndsAt,
            amount: renewalAmount,
          }),
          color: "teal",
        };
      }

      if (trialEndsAt) {
        return { text: t("TrialRenews", { date: trialEndsAt }), color: "teal" };
      }

      return { text: t("TrialActive"), color: "teal" };
    }

    if (polarStatus === "active") {
      if (subscriptionStatus.cancelAtPeriodEnd) {
        if (periodEndsAt) {
          return {
            text: t("SubscriptionExpiresNoRenewDate", { date: periodEndsAt }),
            color: "orange",
          };
        }
        return { text: t("SubscriptionExpiresNoRenew"), color: "orange" };
      }

      if (periodEndsAt) {
        return { text: t("RenewsOn", { date: periodEndsAt }), color: "dimmed" };
      }

      return { text: t("ActivePlan"), color: "dimmed" };
    }

    if (
      polarStatus === "past_due" ||
      polarStatus === "unpaid" ||
      polarStatus === "incomplete"
    ) {
      return { text: t("PaymentIssue"), color: "red" };
    }

    if (polarStatus === "canceled" || polarStatus === "incomplete_expired") {
      if (periodEndsAt) {
        return {
          text: t("SubscriptionExpiredDate", { date: periodEndsAt }),
          color: "orange",
        };
      }
      return { text: t("SubscriptionExpired"), color: "orange" };
    }

    if (subscriptionStatus.cancelAtPeriodEnd) {
      if (periodEndsAt) {
        return {
          text: t("SubscriptionExpiresNoRenewDate", { date: periodEndsAt }),
          color: "orange",
        };
      }
      return { text: t("SubscriptionExpiresNoRenew"), color: "orange" };
    }

    if (periodEndsAt) {
      return { text: t("RenewsOn", { date: periodEndsAt }), color: "dimmed" };
    }

    return { text: t("ActivePlan"), color: "dimmed" };
  };

  const description = getSubscriptionDescription();
  const planLabel = isPremium
    ? (subscriptionStatus.productName ?? t("PremiumPlan"))
    : t("FreePlan");

  return (
    <SettingsSection icon={<IconCreditCard size={20} />} title={t("Title")}>
      <CardSection inheritPadding py="md">
        <Stack gap="md">
          <Group justify="space-between" align="flex-start">
            <div>
              <Group gap="xs">
                <Text fw={500}>{t("CurrentPlan")}</Text>
                <Badge variant="light" color={isPremium ? "violet" : "gray"}>
                  {planLabel}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed" mt={4}>
                {description.text}
              </Text>
            </div>
            {isPremium ? (
              <Button
                component="a"
                href={portalUrl}
                variant="light"
                leftSection={<IconExternalLink size={16} />}
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
                <Text size="xs" c="dimmed">
                  {t("MonthlyUsageLabel", {
                    used: subscriptionStatus.aiMessagesUsed,
                    limit: subscriptionStatus.aiMessageLimit,
                  })}
                </Text>
                {monthlyResetAt && (
                  <Text size="xs" c="dimmed">
                    {t("MonthlyUsageReset", { date: monthlyResetAt })}
                  </Text>
                )}
              </Group>
              <Progress
                value={
                  (subscriptionStatus.aiMessagesUsed /
                    subscriptionStatus.aiMessageLimit) *
                  100
                }
                color={
                  subscriptionStatus.aiMessagesUsed >=
                  subscriptionStatus.aiMessageLimit
                    ? "red"
                    : subscriptionStatus.aiMessagesUsed /
                          subscriptionStatus.aiMessageLimit >=
                        0.8
                      ? "orange"
                      : "violet"
                }
                size="sm"
                radius="xl"
              />
            </div>
          )}
        </Stack>
      </CardSection>
    </SettingsSection>
  );
}
