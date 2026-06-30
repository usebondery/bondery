"use client";

import type { ButtonProps } from "@mantine/core";
import { Button } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useWebTranslations as useTranslations } from "@/lib/i18n/useWebTranslations";
import { useEmbeddedCheckout } from "@/hooks/useEmbeddedCheckout";

type UpgradeButtonProps = Omit<ButtonProps, "onClick" | "loading"> & {
  onSuccess?: () => void;
};

/**
 * Shared CTA button for upgrading to Premium via embedded Polar checkout.
 * Handles checkout session creation and loading state internally.
 *
 * @param onSuccess - Optional callback invoked after a successful checkout.
 * @param rest - Any Mantine ButtonProps (e.g. size, mt, display, w) passed through.
 */
export function UpgradeButton({ onSuccess, ...rest }: UpgradeButtonProps) {
  const t = useTranslations("Checkout");
  const { openCheckout, isLoading } = useEmbeddedCheckout({ onSuccess });

  return (
    <Button
      onClick={openCheckout}
      loading={isLoading}
      leftSection={<IconSparkles size={16} />}
      {...rest}
    >
      {t("upgradeToPremium")}
    </Button>
  );
}
