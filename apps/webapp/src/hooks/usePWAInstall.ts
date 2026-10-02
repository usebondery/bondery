"use client";

import { useEffect, useRef, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const PWA_INSTALLED_KEY = "bondery_pwa_installed";

interface UsePWAInstallResult {
  /**
   * Triggers the native browser install prompt.
   * Returns `true` if `prompt()` ran; `false` if no deferred event was captured.
   */
  install: () => Promise<boolean>;
  /** True when running in a Chromium-based desktop browser (Chrome, Edge, Brave, Opera, etc.) */
  isChromiumDesktop: boolean;
  /**
   * True when the PWA was previously installed but the user is currently on the
   * regular browser tab (not in standalone mode). Detected via localStorage flag
   * that is persisted when the `appinstalled` event fires or when running standalone.
   */
  isInstalledFromBrowser: boolean;
  /** True when the app is running as an installed PWA (standalone display mode) */
  isPWAInstalled: boolean;
}

/**
 * Captures the browser's `beforeinstallprompt` event so the app can
 * trigger a PWA install prompt imperatively from the Settings page.
 *
 * All state is derived inside a single `useEffect` so that `isChromiumDesktop`,
 * `isPWAInstalled`, and `isInstalledFromBrowser` are always updated atomically,
 * preventing intermediate renders with mismatched state.
 *
 * Uses `localStorage` to remember across sessions whether the PWA was installed,
 * showing a connected (but unclickable) tile when the user is back in the regular browser tab.
 */
export function usePWAInstall(): UsePWAInstallResult {
  const [isChromiumDesktop, setIsChromiumDesktop] = useState(false);
  const [isPWAInstalled, setIsPWAInstalled] = useState(false);
  const [isInstalledFromBrowser, setIsInstalledFromBrowser] = useState(false);
  const deferredPrompt = useRef<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const nav = navigator as Navigator & { userAgentData?: { mobile: boolean } };
    const isMobile =
      nav.userAgentData?.mobile ?? /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const isChromium = typeof (window as Window & { chrome?: unknown }).chrome !== "undefined";
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches;
    const hadPreviousInstall = localStorage.getItem(PWA_INSTALLED_KEY) === "true";

    setIsChromiumDesktop(isChromium && !isMobile);
    setIsPWAInstalled(isStandalone);

    if (isStandalone) {
      // Persist the flag so future browser-tab visits know the PWA is installed
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
    } else if (isChromium && !isMobile && hadPreviousInstall) {
      setIsInstalledFromBrowser(true);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      deferredPrompt.current = e as BeforeInstallPromptEvent;

      if (!isStandalone && !isMobile) {
        // Chrome only fires this when the app is NOT installed, so clear any stale flag
        localStorage.removeItem(PWA_INSTALLED_KEY);
        setIsInstalledFromBrowser(false);
      }
    };

    const handleAppInstalled = () => {
      deferredPrompt.current = null;
      localStorage.setItem(PWA_INSTALLED_KEY, "true");
      setIsInstalledFromBrowser(true);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const install = async () => {
    const promptEvent = deferredPrompt.current;
    if (!promptEvent) {
      return false;
    }

    try {
      await promptEvent.prompt();
      deferredPrompt.current = null;
      await promptEvent.userChoice;
      return true;
    } catch {
      deferredPrompt.current = null;
      return false;
    }
  };

  return { install, isChromiumDesktop, isInstalledFromBrowser, isPWAInstalled };
}
