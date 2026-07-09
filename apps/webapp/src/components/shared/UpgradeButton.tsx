"use client";

import type { ButtonProps } from "@mantine/core";
import { Button } from "@mantine/core";
import { IconSparkles } from "@tabler/icons-react";
import { useEmbeddedCheckout } from "@/hooks/useEmbeddedCheckout";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";

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
  const t = useWebTranslations("Checkout");
  const { openCheckout, isLoading } = useEmbeddedCheckout({ onSuccess });

  return (
    <Button
      leftSection={<IconSparkles size={16} />}
      loading={isLoading}
      onClick={openCheckout}
      {...rest}
    >
      {t("upgradeToPremium")}
    </Button>
  );
}
