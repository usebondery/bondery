"use client";

import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  successNotificationTemplate,
  warningNotificationTemplate,
} from "@bondery/mantine-next";
import type { SubscriptionStatus } from "@bondery/schemas";
import { notifications } from "@mantine/notifications";
import type { StripeEmbeddedCheckout } from "@stripe/stripe-js";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ApiError, clientApiJson } from "@/lib/api/client";
import { getSubscriptionStatus } from "@/lib/api/domains/subscription";
import { isUnauthorizedApiError } from "@/lib/auth/handleUnauthorizedSession";
import { useCheckoutTranslations } from "@/lib/i18n/generated/hooks";
import { useWebappRuntimeConfig } from "@/lib/platform/runtimeConfig.client";
import { invalidateSubscription } from "@/lib/query/invalidation";

const CHECKOUT_POLL_INTERVAL_MS = 800;
const WEBHOOK_CONFIRM_TIMEOUT_MS = 10_000;
const MOUNT_WAIT_FRAMES = 60;

interface UseEmbeddedCheckoutOptions {
  checkoutMountId: string;
  onSuccess?: () => void;
}

interface UseEmbeddedCheckoutResult {
  closeCheckout: () => void;
  isLoading: boolean;
  isModalOpen: boolean;
  openCheckout: () => Promise<void>;
}

function isCheckoutConfirmed(status: SubscriptionStatus | null): boolean {
  return status?.plan === "premium";
}

function teardownCheckout(checkout: StripeEmbeddedCheckout | null): void {
  if (!checkout) {
    return;
  }
  try {
    checkout.unmount();
  } catch {
    // Not mounted yet, or already unmounted.
  }
  try {
    checkout.destroy();
  } catch {
    // Already destroyed.
  }
}

async function waitForMountNode(id: string): Promise<HTMLElement | null> {
  for (let frame = 0; frame < MOUNT_WAIT_FRAMES; frame += 1) {
    const node = document.getElementById(id);
    if (node) {
      return node;
    }
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  }
  return document.getElementById(id);
}

export function useEmbeddedCheckout({
  checkoutMountId,
  onSuccess,
}: UseEmbeddedCheckoutOptions): UseEmbeddedCheckoutResult {
  const [isLoading, setIsLoading] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const checkoutRef = useRef<StripeEmbeddedCheckout | null>(null);
  const pollTimerRef = useRef<number | null>(null);
  const openGenerationRef = useRef(0);
  const router = useRouter();
  const queryClient = useQueryClient();
  const t = useCheckoutTranslations();
  const { stripePublishableKey } = useWebappRuntimeConfig();

  const handleCheckoutConfirmed = () => {
    void invalidateSubscription(queryClient);
    onSuccess?.();
    router.refresh();
  };

  const stopPolling = () => {
    if (pollTimerRef.current != null) {
      window.clearInterval(pollTimerRef.current);
      pollTimerRef.current = null;
    }
  };

  const closeCheckout = () => {
    openGenerationRef.current += 1;
    stopPolling();
    teardownCheckout(checkoutRef.current);
    checkoutRef.current = null;
    setIsModalOpen(false);
    setIsLoading(false);
  };

  useEffect(() => {
    return () => {
      closeCheckout();
    };
  }, [closeCheckout]);

  const showCheckoutError = () => {
    notifications.show(
      errorNotificationTemplate({
        description: t("errorMessage"),
        title: t("errorTitle"),
      }),
    );
  };

  const openCheckout = async () => {
    if (!stripePublishableKey) {
      showCheckoutError();
      return;
    }

    const generation = openGenerationRef.current + 1;
    openGenerationRef.current = generation;
    stopPolling();
    teardownCheckout(checkoutRef.current);
    checkoutRef.current = null;
    setIsLoading(true);

    let clientSecret: string;
    try {
      const checkoutSession = await clientApiJson<{ clientSecret: string }>(
        API_ROUTES.SUBSCRIPTIONS_CHECKOUT,
        {
          method: "POST",
        },
      );
      clientSecret = checkoutSession.clientSecret;
    } catch (error) {
      if (generation !== openGenerationRef.current) {
        return;
      }
      if (error instanceof ApiError && error.status === 409) {
        notifications.show(
          warningNotificationTemplate({
            description: t("alreadySubscribedMessage"),
            title: t("alreadySubscribedTitle"),
          }),
        );
        setIsLoading(false);
        return;
      }

      if (isUnauthorizedApiError(error)) {
        setIsLoading(false);
        return;
      }

      showCheckoutError();
      setIsLoading(false);
      return;
    }

    if (generation !== openGenerationRef.current) {
      return;
    }

    const { loadStripe } = await import("@stripe/stripe-js");
    const stripe = await loadStripe(stripePublishableKey);

    if (generation !== openGenerationRef.current) {
      return;
    }

    if (!stripe) {
      showCheckoutError();
      setIsLoading(false);
      return;
    }

    setIsModalOpen(true);
    const mountNode = await waitForMountNode(checkoutMountId);
    if (generation !== openGenerationRef.current) {
      return;
    }

    if (!mountNode) {
      showCheckoutError();
      setIsLoading(false);
      setIsModalOpen(false);
      return;
    }

    try {
      const checkout = await stripe.createEmbeddedCheckoutPage({
        fetchClientSecret: async () => clientSecret,
      });
      if (generation !== openGenerationRef.current) {
        teardownCheckout(checkout);
        return;
      }

      checkoutRef.current = checkout;
      checkout.mount(mountNode);
      setIsLoading(false);

      const started = Date.now();
      pollTimerRef.current = window.setInterval(() => {
        void (async () => {
          if (generation !== openGenerationRef.current) {
            return;
          }

          if (Date.now() - started > WEBHOOK_CONFIRM_TIMEOUT_MS) {
            return;
          }

          try {
            const status = await getSubscriptionStatus();
            if (generation !== openGenerationRef.current || !isCheckoutConfirmed(status)) {
              return;
            }

            closeCheckout();
            notifications.show(
              successNotificationTemplate({
                description: t("successMessage"),
                title: t("successTitle"),
              }),
            );
            handleCheckoutConfirmed();
          } catch {
            // Keep polling while checkout is open.
          }
        })();
      }, CHECKOUT_POLL_INTERVAL_MS);
    } catch {
      if (generation !== openGenerationRef.current) {
        return;
      }
      closeCheckout();
      showCheckoutError();
    }
  };

  return { closeCheckout, isLoading, isModalOpen, openCheckout };
}
