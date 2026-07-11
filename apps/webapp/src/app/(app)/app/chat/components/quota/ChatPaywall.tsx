"use client";

import type { SubscriptionStatus } from "@bondery/schemas";
import { Progress, Stack, Text } from "@mantine/core";
import { IconLock } from "@tabler/icons-react";
import { UpgradeButton } from "@/components/shared/UpgradeButton";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

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
  const t = useWebTranslations("ChatPage");

  return (
    <Stack align="center" justify="center" maw={480} mx="auto" py="xl">
      <IconLock color="var(--mantine-color-dimmed)" size={48} />
      <Text fw={600} size="xl" ta="center">
        {t("paywallTitle")}
      </Text>
      <Text c="dimmed" style={{ textWrap: "balance" }} ta="center">
        {t("paywallDescription", {
          limit: subscriptionStatus.aiMessageLimit,
          used: subscriptionStatus.aiMessagesUsed,
        })}
      </Text>
      <Progress
        color="red"
        size="lg"
        value={(subscriptionStatus.aiMessagesUsed / subscriptionStatus.aiMessageLimit) * 100}
        w="100%"
      />
      <UpgradeButton onSuccess={onSuccess} size="lg" />
    </Stack>
  );
}
