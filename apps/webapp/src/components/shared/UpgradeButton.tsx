"use client";

import { detachPromise } from "@bondery/helpers/async";
import type { ButtonProps } from "@mantine/core";
import { Button, Modal, Tooltip } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useId } from "react";
import { useEmbeddedCheckout } from "@/hooks/useEmbeddedCheckout";
import { useCheckoutTranslations } from "@/lib/i18n/generated/hooks";
import { useSubscriptionQuery } from "@/lib/query/hooks/useSubscription";

type UpgradeButtonProps = Omit<ButtonProps, "onClick" | "loading"> & {
  onSuccess?: () => void;
};

export function UpgradeButton({ onSuccess, ...rest }: UpgradeButtonProps) {
  const t = useCheckoutTranslations();
  const checkoutMountId = `stripe-embedded-checkout-${useId().replace(/:/gu, "")}`;
  const { data: subscriptionStatus } = useSubscriptionQuery();
  const { closeCheckout, openCheckout, isLoading, isModalOpen } = useEmbeddedCheckout({
    checkoutMountId,
    onSuccess,
  });

  const upgradesEnabled = subscriptionStatus?.upgradesEnabled ?? false;

  const button = (
    <Button
      disabled={!upgradesEnabled}
      leftSection={<IconSparkles size={16} />}
      loading={isLoading}
      onClick={() => detachPromise(openCheckout())}
      {...rest}
    >
      {t("upgradeToPremium")}
    </Button>
  );

  return (
    <>
      {upgradesEnabled ? button : <Tooltip label={t("upgradesDisabledTooltip")}>{button}</Tooltip>}
      <Modal
        centered
        keepMounted
        onClose={closeCheckout}
        opened={isModalOpen}
        size="lg"
        title="Checkout"
      >
        <div id={checkoutMountId} />
      </Modal>
    </>
  );
}
