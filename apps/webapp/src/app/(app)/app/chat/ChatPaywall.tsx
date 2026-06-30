"use client";

import { Stack, Text, Progress } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import type { SubscriptionStatus } from "@bondery/schemas";
import { UpgradeButton } from "@/components/shared";

/**
 * Full-screen paywall displayed when a free-tier user exhausts their chat quota.
 * Shows usage stats and a CTA to upgrade to Premium via embedded checkout.
 */
export function ChatPaywall({
  subscriptionStatus,
  onSuccess,
}: {
  subscriptionStatus: SubscriptionStatus;
  onSuccess?: () => void;
}) {
  const t = useTranslations("ChatPage");

  return (
    <Stack align="center" justify="center" py="xl" maw={480} mx="auto">
      <IconLock size={48} color="var(--mantine-color-dimmed)" />
      <Text size="xl" fw={600} ta="center">
        {t("paywallTitle")}
      </Text>
      <Text c="dimmed" ta="center" style={{ textWrap: "balance" }}>
        {t("paywallDescription", {
          used: subscriptionStatus.aiMessagesUsed,
          limit: subscriptionStatus.aiMessageLimit,
        })}
      </Text>
      <Progress
        value={(subscriptionStatus.aiMessagesUsed / subscriptionStatus.aiMessageLimit) * 100}
        size="lg"
        w="100%"
        color="red"
      />
      <UpgradeButton onSuccess={onSuccess} size="lg" />
    </Stack>
  );
}
