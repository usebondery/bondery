"use client";

import { API_ROUTES } from "@bondery/helpers/globals/paths";
import {
  errorNotificationTemplate,
  successNotificationTemplate,
  warningNotificationTemplate,
} from "@bondery/mantine-next";
import { useComputedColorScheme } from "@mantine/core";
import { notifications } from "@mantine/notifications";
import type { PolarEmbedCheckout } from "@polar-sh/checkout/embed";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, clientApiJson } from "@/lib/api/client";
import { isUnauthorizedApiError } from "@/lib/auth/handleUnauthorizedSession";
import { useWebTranslations } from "@/lib/i18n/useWebTranslations";
import { invalidateSubscription } from "@/lib/query/invalidation";
import { createBrowswerSupabaseClient } from "@/lib/supabase/client";

/** Maximum ms to wait for the Polar iframe onLoaded event before resetting loading state. */
const IFRAME_LOAD_TIMEOUT_MS = 15_000;

/** Maximum ms to wait for the webhook to update the DB after checkout success. */
const WEBHOOK_CONFIRM_TIMEOUT_MS = 10_000;

interface UseEmbeddedCheckoutOptions {
  /** Optional callback invoked after the checkout `success` event fires. */
  onSuccess?: () => void;
}

interface UseEmbeddedCheckoutResult {
  /** True while the session is being created or the iframe is loading. */
  isLoading: boolean;
  /** Opens the embedded Polar checkout overlay. */
  openCheckout: () => Promise<void>;
}

/**
 * Hook that creates a Polar checkout session and opens it as an in-app iframe overlay.
 *
 * Flow:
 *  1. POST /api/subscriptions/checkout → get session URL (409 = already subscribed)
 *  2. PolarEmbedCheckout.create(url) → iframe overlay appears
 *  3. `success` event → subscribe to Supabase Realtime on `subscriptions` table
 *  4. When DB row changes to active/canceling → show success notification, call onSuccess, router.refresh()
 *  5. If Realtime doesn't confirm within WEBHOOK_CONFIRM_TIMEOUT_MS → show pending notification
 *  6. `close` event → clean up instance ref, reset loading state
 *
 * @param options.onSuccess Optional callback invoked when the DB confirms the upgrade.
 */
export function useEmbeddedCheckout({
  onSuccess,
}: UseEmbeddedCheckoutOptions = {}): UseEmbeddedCheckoutResult {
  const [isLoading, setIsLoading] = useState(false);
  const checkoutRef = useRef<InstanceType<typeof PolarEmbedCheckout> | null>(null);
  const router = useRouter();
  const queryClient = useQueryClient();
  const colorScheme = useComputedColorScheme("light");
  const t = useWebTranslations("Checkout");

  const handleCheckoutConfirmed = useCallback(() => {
    void invalidateSubscription(queryClient);
    onSuccess?.();
    router.refresh();
  }, [onSuccess, queryClient, router]);

  // Clean up any open checkout when the component using this hook unmounts
  useEffect(() => {
    return () => {
      if (checkoutRef.current) {
        checkoutRef.current.close();
        checkoutRef.current = null;
      }
    };
  }, []);

  const openCheckout = useCallback(async () => {
    setIsLoading(true);

    let url: string;
    try {
      const checkoutSession = await clientApiJson<{ url: string }>(
        API_ROUTES.SUBSCRIPTIONS_CHECKOUT,
        { method: "POST" },
      );
      url = checkoutSession.url;
    } catch (error) {
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

      notifications.show(
        errorNotificationTemplate({
          description: t("errorMessage"),
          title: t("errorTitle"),
        }),
      );
      setIsLoading(false);
      return;
    }

    // Import lazily — this module manipulates the DOM and must only run in the browser
    const { PolarEmbedCheckout } = await import("@polar-sh/checkout/embed");

    let checkout: InstanceType<typeof PolarEmbedCheckout>;

    // Guard: if onLoaded never fires (CSP block, network stall), reset loading after timeout
    const iframeLoadTimeout = setTimeout(() => {
      setIsLoading(false);
    }, IFRAME_LOAD_TIMEOUT_MS);

    try {
      checkout = await PolarEmbedCheckout.create(url, {
        onLoaded: () => {
          clearTimeout(iframeLoadTimeout);
          setIsLoading(false);
        },
        theme: colorScheme === "dark" ? "dark" : "light",
      });
    } catch {
      clearTimeout(iframeLoadTimeout);
      notifications.show(
        errorNotificationTemplate({
          description: t("errorMessage"),
          title: t("errorTitle"),
        }),
      );
      setIsLoading(false);
      return;
    }

    checkoutRef.current = checkout;

    checkout.addEventListener("success", () => {
      // The `success` event fires when Polar shows its own success screen inside the iframe.
      // Leave the iframe open so the user sees the confirmation — we'll close it ourselves
      // once the DB confirms the subscription (or after the timeout fallback).

      // Wait for the webhook to update the DB via Supabase Realtime.
      const supabase = createBrowswerSupabaseClient();

      let webhookTimeout: ReturnType<typeof setTimeout> | null = null;

      // Use a unique channel name so repeated checkouts don't reuse an already-subscribed channel.
      const channel = supabase
        .channel(`checkout-confirmation-${Date.now()}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "subscriptions",
          },
          (payload) => {
            const newStatus = (payload.new as { status?: string } | null)?.status;
            if (newStatus === "active" || newStatus === "canceling") {
              if (webhookTimeout) {
                clearTimeout(webhookTimeout);
              }
              supabase.removeChannel(channel);
              checkout.close();

              notifications.show(
                successNotificationTemplate({
                  description: t("successMessage"),
                  title: t("successTitle"),
                }),
              );

              handleCheckoutConfirmed();
            }
          },
        )
        .subscribe();

      // Fallback: if the webhook doesn't arrive within the timeout, show a pending message
      webhookTimeout = setTimeout(() => {
        supabase.removeChannel(channel);
        checkout.close();
        notifications.show(
          warningNotificationTemplate({
            description: t("upgradePendingMessage"),
            title: t("upgradePendingTitle"),
          }),
        );
        handleCheckoutConfirmed();
      }, WEBHOOK_CONFIRM_TIMEOUT_MS);
    });

    checkout.addEventListener("close", () => {
      checkoutRef.current = null;
      // Reset loading in case it fired before onLoaded (e.g. user closed very quickly)
      clearTimeout(iframeLoadTimeout);
      setIsLoading(false);
    });
  }, [colorScheme, handleCheckoutConfirmed, t]);

  return { isLoading, openCheckout };
}
