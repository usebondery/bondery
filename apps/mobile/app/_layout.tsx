import "react-native-get-random-values";
import "react-native-gesture-handler";
import "@tamagui/native/setup-teleport";
import React, { useEffect } from "react";
import { Stack } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { TamaguiProvider, Theme } from "@tamagui/core";
import { PortalProvider } from "@tamagui/portal";
import { StyleSheet, Text, View } from "react-native";
import { I18nextProvider } from "react-i18next";
import { AuthProvider } from "../src/lib/auth/AuthProvider";
import { useAuth } from "../src/lib/auth/useAuth";
import { SyncProvider } from "../src/lib/sync/SyncProvider";
import { useAndroidKeyboardResizeMode } from "../src/lib/hooks/useAndroidKeyboardResizeMode";
import { AppToastProvider } from "../src/lib/toast/useAppToast";
import type { MobileThemeColors } from "../src/theme/colors";
import tamaguiConfig from "../src/theme/tamagui.config";
import { useMobileThemeColors } from "../src/theme/useMobileThemeColors";
import { useResolvedMobileTheme } from "../src/theme/useResolvedMobileTheme";
import { AppNavigationBar, AppStatusBar } from "../src/components/chrome";
import { MOBILE_LAYOUT, MOBILE_TYPOGRAPHY } from "../src/theme/tokens";
import i18n from "../src/lib/i18n/i18n";
import { useMobilePreferences } from "../src/lib/preferences/useMobilePreferences";

type RootErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

type RootErrorBoundaryProps = React.PropsWithChildren<{
  colors: MobileThemeColors;
}>;

class RootErrorBoundary extends React.Component<
  RootErrorBoundaryProps,
  RootErrorBoundaryState
> {
  constructor(props: RootErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: unknown): RootErrorBoundaryState {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : String(error),
    };
  }

  render() {
    const { colors } = this.props;

    if (this.state.hasError) {
      return (
        <View
          style={[
            styles.errorScreen,
            { backgroundColor: colors.appBackground },
          ]}
        >
          <Text style={[styles.errorTitle, { color: colors.textPrimary }]}>
            Mobile app runtime error
          </Text>
          <Text style={[styles.errorMessage, { color: colors.dangerText }]}>
            {this.state.message || "Unknown error"}
          </Text>
        </View>
      );
    }

    return this.props.children;
  }
}

function RootNavigator() {
  const { isAuthenticated, isLoadingSession } = useAuth();

  if (isLoadingSession) {
    return null;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!isAuthenticated}>
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
      <Stack.Protected guard={isAuthenticated}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

function LocaleSync() {
  const locale = useMobilePreferences((s) => s.locale);
  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale]);
  return null;
}

export default function RootLayout() {
  const resolvedTheme = useResolvedMobileTheme();
  const colors = useMobileThemeColors();
  useAndroidKeyboardResizeMode();

  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LocaleSync />
        <SafeAreaProvider>
          <KeyboardProvider preload={false}>
            <TamaguiProvider
              config={tamaguiConfig}
              defaultTheme={resolvedTheme}
            >
              <Theme name={resolvedTheme}>
                <AppStatusBar />
                <AppNavigationBar />
                <AppToastProvider>
                  <PortalProvider>
                    <AuthProvider>
                      <SyncProvider>
                        <RootErrorBoundary colors={colors}>
                          <RootNavigator />
                        </RootErrorBoundary>
                      </SyncProvider>
                    </AuthProvider>
                  </PortalProvider>
                </AppToastProvider>
              </Theme>
            </TamaguiProvider>
          </KeyboardProvider>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
  },
  errorTitle: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.sheetTitle,
    fontWeight: MOBILE_TYPOGRAPHY.fontWeight.bold,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: MOBILE_TYPOGRAPHY.fontSize.body,
    textAlign: "center",
  },
});
