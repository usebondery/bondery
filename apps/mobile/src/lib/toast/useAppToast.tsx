import {
  IconAlertCircle,
  IconCircleCheck,
  IconInfoCircle,
  IconX,
} from "@tabler/icons-react-native";

import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { Pressable, StyleSheet, Text, View } from "react-native";

import Animated from "react-native-reanimated";

import { useSafeAreaInsets } from "react-native-safe-area-context";
import { TOAST_ENTER, TOAST_EXIT } from "../../theme/animations";
import type { MobileThemeColors } from "../../theme/colors";
import { MOBILE_HIT_SLOP, MOBILE_TYPOGRAPHY } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { UI_TIMING_MS } from "../config";

/** @deprecated Use `UI_TIMING_MS.toastDuration` from `lib/config`. */

export const DEFAULT_APP_TOAST_DURATION_MS = UI_TIMING_MS.toastDuration;

export type AppToastType = "success" | "error" | "neutral";

export interface ShowAppToastInput {
  description?: string;

  durationMs?: number;

  headline: string;
  type: AppToastType;
}

interface ActiveAppToast {
  description?: string;

  durationMs: number;

  headline: string;
  id: string;

  type: AppToastType;
}

interface AppToastContextValue {
  hideToast: () => void;
  showToast: (input: ShowAppToastInput) => void;
}

interface ToastThemeConfig {
  borderColor: string;

  iconColor: string;
}

const AppToastContext = createContext<AppToastContextValue | null>(null);

function getToastTheme(type: AppToastType, colors: MobileThemeColors): ToastThemeConfig {
  if (type === "success") {
    return {
      borderColor: colors.successSurface,

      iconColor: colors.successAccent,
    };
  }

  if (type === "error") {
    return {
      borderColor: colors.dangerSurface,

      iconColor: colors.dangerAccent,
    };
  }

  return {
    borderColor: colors.border,

    iconColor: colors.textMuted,
  };
}

function ToastTypeIcon({ type, iconColor }: { type: AppToastType; iconColor: string }) {
  if (type === "success") {
    return <IconCircleCheck color={iconColor} size={24} />;
  }

  if (type === "error") {
    return <IconAlertCircle color={iconColor} size={24} />;
  }

  return <IconInfoCircle color={iconColor} size={24} />;
}

function AppToastBanner({
  toast,

  onDismiss,
}: {
  toast: ActiveAppToast;

  onDismiss: () => void;
}) {
  const colors = useMobileThemeColors();

  const toastTheme = getToastTheme(toast.type, colors);

  return (
    <View
      accessibilityLiveRegion="polite"
      style={[
        styles.banner,

        {
          backgroundColor: colors.surface,
          borderColor: toastTheme.borderColor,

          shadowColor: colors.shadow,
        },
      ]}
    >
      <View style={styles.row}>
        <View style={styles.iconSlot}>
          <ToastTypeIcon iconColor={toastTheme.iconColor} type={toast.type} />
        </View>

        <View style={styles.content}>
          <Text style={[styles.headline, { color: colors.textPrimary }]}>{toast.headline}</Text>

          {toast.description ? (
            <Text style={[styles.description, { color: colors.textSecondary }]}>
              {toast.description}
            </Text>
          ) : null}
        </View>

        <Pressable
          accessibilityLabel="Close notification"
          accessibilityRole="button"
          hitSlop={MOBILE_HIT_SLOP.compact}
          onPress={onDismiss}
          style={styles.closeButton}
        >
          <IconX color={colors.iconSecondary} size={16} />
        </Pressable>
      </View>
    </View>
  );
}

function AppToastOverlay({
  toast,

  onDismiss,
}: {
  toast: ActiveAppToast | null;

  onDismiss: () => void;
}) {
  const insets = useSafeAreaInsets();

  return (
    <View
      pointerEvents="box-none"
      style={{
        left: 16,
        position: "absolute",

        right: 16,

        top: insets.top + 12,

        zIndex: 100000,
      }}
    >
      {toast ? (
        <Animated.View entering={TOAST_ENTER} exiting={TOAST_EXIT} key={toast.id}>
          <AppToastBanner onDismiss={onDismiss} toast={toast} />
        </Animated.View>
      ) : null}
    </View>
  );
}

/**

 * Root provider for in-app toast notifications.

 */

export function AppToastProvider({ children }: { children: ReactNode }) {
  const [toast, setToast] = useState<ActiveAppToast | null>(null);

  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearHideTimer = useCallback(() => {
    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);

      hideTimerRef.current = null;
    }
  }, []);

  const hideToast = useCallback(() => {
    clearHideTimer();

    setToast(null);
  }, [clearHideTimer]);

  const showToast = useCallback(
    ({ type, headline, description, durationMs }: ShowAppToastInput) => {
      clearHideTimer();

      setToast({
        description,

        durationMs: durationMs ?? DEFAULT_APP_TOAST_DURATION_MS,

        headline,
        id: `${Date.now()}`,

        type,
      });
    },

    [clearHideTimer],
  );

  useEffect(() => {
    if (!toast) {
      return;
    }

    hideTimerRef.current = setTimeout(() => {
      hideToast();
    }, toast.durationMs);

    return clearHideTimer;
  }, [toast, hideToast, clearHideTimer]);

  const value = useMemo(
    () => ({
      hideToast,
      showToast,
    }),

    [showToast, hideToast],
  );

  return (
    <AppToastContext.Provider value={value}>
      {children}

      <AppToastOverlay onDismiss={hideToast} toast={toast} />
    </AppToastContext.Provider>
  );
}

/**

 * Shared app toast hook used to show consistent notification UI from any screen.

 */

export function useAppToast() {
  const context = useContext(AppToastContext);

  if (!context) {
    throw new Error("useAppToast must be used within AppToastProvider");
  }

  return context;
}

const styles = StyleSheet.create({
  banner: {
    borderRadius: 14,
    borderWidth: 1,

    elevation: 4,

    paddingHorizontal: 14,

    paddingVertical: 12,

    shadowOffset: { height: 4, width: 0 },

    shadowOpacity: 0.12,

    shadowRadius: 10,
  },

  closeButton: {
    borderRadius: 999,

    padding: 4,
  },

  content: {
    flex: 1,

    gap: 2,

    minWidth: 0,
  },

  description: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,

    lineHeight: 18,
  },

  headline: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,

    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
  },

  iconSlot: {
    alignItems: "center",

    height: 30,

    justifyContent: "center",

    width: 30,
  },

  row: {
    alignItems: "center",

    flexDirection: "row",

    gap: 10,
  },
});
