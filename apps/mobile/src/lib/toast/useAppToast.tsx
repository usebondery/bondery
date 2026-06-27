import {

  IconAlertCircle,

  IconCircleCheck,

  IconInfoCircle,

  IconX,

} from "@tabler/icons-react-native";

import {

  createContext,

  useCallback,

  useContext,

  useEffect,

  useMemo,

  useRef,

  useState,

  type ReactNode,

} from "react";

import { Pressable, StyleSheet, Text, View } from "react-native";

import Animated from "react-native-reanimated";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import { UI_TIMING_MS } from "../config";

import { TOAST_ENTER, TOAST_EXIT } from "../../theme/animations";

import type { MobileThemeColors } from "../../theme/colors";

import { MOBILE_HIT_SLOP, MOBILE_TYPOGRAPHY } from "../../theme/tokens";

import { useMobileThemeColors } from "../../theme/useMobileThemeColors";



/** @deprecated Use `UI_TIMING_MS.toastDuration` from `lib/config`. */

export const DEFAULT_APP_TOAST_DURATION_MS = UI_TIMING_MS.toastDuration;



export type AppToastType = "success" | "error" | "neutral";



export interface ShowAppToastInput {

  type: AppToastType;

  headline: string;

  description?: string;

  durationMs?: number;

}



interface ActiveAppToast {

  id: string;

  type: AppToastType;

  headline: string;

  description?: string;

  durationMs: number;

}



interface AppToastContextValue {

  showToast: (input: ShowAppToastInput) => void;

  hideToast: () => void;

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

    return <IconCircleCheck size={24} color={iconColor} />;

  }



  if (type === "error") {

    return <IconAlertCircle size={24} color={iconColor} />;

  }



  return <IconInfoCircle size={24} color={iconColor} />;

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

          borderColor: toastTheme.borderColor,

          backgroundColor: colors.surface,

          shadowColor: colors.shadow,

        },

      ]}

    >

      <View style={styles.row}>

        <View style={styles.iconSlot}>

          <ToastTypeIcon type={toast.type} iconColor={toastTheme.iconColor} />

        </View>



        <View style={styles.content}>

          <Text style={[styles.headline, { color: colors.textPrimary }]}>

            {toast.headline}

          </Text>



          {toast.description ? (

            <Text style={[styles.description, { color: colors.textSecondary }]}>

              {toast.description}

            </Text>

          ) : null}

        </View>



        <Pressable

          accessibilityRole="button"

          accessibilityLabel="Close notification"

          hitSlop={MOBILE_HIT_SLOP.compact}

          onPress={onDismiss}

          style={styles.closeButton}

        >

          <IconX size={16} color={colors.iconSecondary} />

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

        position: "absolute",

        top: insets.top + 12,

        left: 16,

        right: 16,

        zIndex: 100000,

      }}

    >

      {toast ? (

        <Animated.View key={toast.id} entering={TOAST_ENTER} exiting={TOAST_EXIT}>

          <AppToastBanner toast={toast} onDismiss={onDismiss} />

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

        id: `${Date.now()}`,

        type,

        headline,

        description,

        durationMs: durationMs ?? DEFAULT_APP_TOAST_DURATION_MS,

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

      showToast,

      hideToast,

    }),

    [showToast, hideToast],

  );



  return (

    <AppToastContext.Provider value={value}>

      {children}

      <AppToastOverlay toast={toast} onDismiss={hideToast} />

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

    borderWidth: 1,

    borderRadius: 14,

    paddingHorizontal: 14,

    paddingVertical: 12,

    shadowOffset: { width: 0, height: 4 },

    shadowOpacity: 0.12,

    shadowRadius: 10,

    elevation: 4,

  },

  row: {

    alignItems: "center",

    flexDirection: "row",

    gap: 10,

  },

  iconSlot: {

    alignItems: "center",

    height: 30,

    justifyContent: "center",

    width: 30,

  },

  content: {

    flex: 1,

    gap: 2,

    minWidth: 0,

  },

  headline: {

    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,

    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,

  },

  description: {

    fontSize: MOBILE_TYPOGRAPHY.fontSize.caption,

    lineHeight: 18,

  },

  closeButton: {

    borderRadius: 999,

    padding: 4,

  },

});


