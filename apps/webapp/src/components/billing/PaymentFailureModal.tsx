"use client";

import { API_ROUTES, toBffApiPath } from "@bondery/helpers/globals/paths";
import { Button, Modal, Stack, Text } from "@mantine/core";
import { useCheckoutTranslations } from "@/lib/i18n/generated/hooks";
import { useSubscriptionQuery } from "@/lib/query/hooks/useSubscription";

export function PaymentFailureModal() {
  const t = useCheckoutTranslations();
  const { data: subscriptionStatus } = useSubscriptionQuery();

  const paymentBlocked = subscriptionStatus?.paymentBlocked ?? false;
  const portalUrl = toBffApiPath(API_ROUTES.SUBSCRIPTIONS_PORTAL);

  return (
    <Modal
      centered
      closeOnClickOutside={false}
      closeOnEscape={false}
      onClose={() => {
        // no-op: payment block cannot be dismissed without the portal
      }}
      opened={paymentBlocked}
      title={t("paymentBlockedTitle")}
      withCloseButton={false}
    >
      <Stack gap="md">
        <Text size="sm">{t("paymentBlockedMessage")}</Text>
        <Button component="a" href={portalUrl}>
          {t("paymentBlockedAction")}
        </Button>
      </Stack>
    </Modal>
  );
}
