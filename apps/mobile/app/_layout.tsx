import "react-native-get-random-values";
import "react-native-gesture-handler";
import "../global.css";
import { BottomSheetModalProvider } from "@gorhom/bottom-sheet";
import { Stack, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { I18nextProvider } from "react-i18next";
import { BackHandler, Platform } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AppNavigationBar, AppStatusBar } from "../src/components/chrome";
import { RootErrorBoundary } from "../src/components/RootErrorBoundary";
import { AuthProvider } from "../src/lib/auth/AuthProvider";
import {
  readLocalAccessToken,
  resolveBootAuthGate,
  subscribeLocalSessionEnded,
} from "../src/lib/auth/session";
import { useAuth } from "../src/lib/auth/useAuth";
import { KeyboardRoot } from "../src/lib/boot/KeyboardRoot";
import { hideNativeSplash, keepNativeSplashVisible } from "../src/lib/boot/nativeSplash";
import i18n from "../src/lib/i18n/i18n";
import { useMobilePreferences } from "../src/lib/preferences/useMobilePreferences";
import { AppToaster } from "../src/lib/toast/AppToaster";
import { useMobileThemeColors } from "../src/theme/useMobileThemeColors";

keepNativeSplashVisible();

/** Hung SecureStore only. Never treat this as logout while a cookie exists. */
const LOCAL_CREDENTIAL_WAIT_MS = 2_000;

function loadLocalCookieToken(onToken: (token: string | null) => void): () => void {
  let cancelled = false;
  void readLocalAccessToken()
    .then((token) => {
      if (!cancelled) {
        onToken(token);
      }
    })
    .catch(() => {
      if (!cancelled) {
        onToken(null);
      }
    });

  return () => {
    cancelled = true;
  };
}

function RootNavigator() {
  const { isAuthenticated } = useAuth();
  const colors = useMobileThemeColors();
  const [cookieToken, setCookieToken] = useState<string | null | undefined>(undefined);
  const [cookieReadTimedOut, setCookieReadTimedOut] = useState(false);
  const { hasLocalCredential, isReady } = resolveBootAuthGate({
    cookieReadTimedOut,
    cookieToken,
    isAuthenticated,
  });

  useEffect(() => {
    const timeout = setTimeout(() => {
      setCookieReadTimedOut(true);
    }, LOCAL_CREDENTIAL_WAIT_MS);
    const cancelCookieRead = loadLocalCookieToken(setCookieToken);

    return () => {
      cancelCookieRead();
      clearTimeout(timeout);
    };
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    return loadLocalCookieToken(setCookieToken);
  }, [isAuthenticated]);

  useEffect(() => {
    return subscribeLocalSessionEnded(() => {
      setCookieToken(null);
    });
  }, []);

  useEffect(() => {
    if (isReady) {
      hideNativeSplash();
    }
  }, [isReady]);

  if (!isReady) {
    return null;
  }

  return (
    <>
      <Stack
        screenOptions={{
          contentStyle: { backgroundColor: colors.appBackground },
          headerShown: false,
        }}
      >
        <Stack.Protected guard={!hasLocalCredential} redirectTo="/contacts">
          <Stack.Screen name="(auth)" />
        </Stack.Protected>
        <Stack.Protected guard={hasLocalCredential} redirectTo="/login">
          <Stack.Screen name="(app)" />
        </Stack.Protected>
      </Stack>
      <ConsumeRootHardwareBack />
    </>
  );
}

/**
 * Android system back on a root screen dispatches GO_BACK. No navigator
 * handles that action. Consume it and run the activity default (move to back).
 */
function ConsumeRootHardwareBack() {
  const router = useRouter();
  const routerRef = useRef(router);

  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    if (Platform.OS !== "android") {
      return;
    }

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (routerRef.current.canGoBack()) {
        return false;
      }

      BackHandler.exitApp();
      return true;
    });

    return () => {
      subscription.remove();
    };
  }, []);

  return null;
}

function LocaleSync() {
  const locale = useMobilePreferences((s) => s.locale);
  useEffect(() => {
    void i18n.changeLanguage(locale);
  }, [locale]);
  return null;
}

export default function RootLayout() {
  const colors = useMobileThemeColors();

  return (
    <I18nextProvider i18n={i18n}>
      <GestureHandlerRootView style={{ flex: 1 }}>
        <LocaleSync />
        <SafeAreaProvider>
          <KeyboardRoot>
            <BottomSheetModalProvider>
              <AppStatusBar />
              <AppNavigationBar />
              <AuthProvider>
                <RootErrorBoundary colors={colors}>
                  <RootNavigator />
                </RootErrorBoundary>
              </AuthProvider>
              <AppToaster />
            </BottomSheetModalProvider>
          </KeyboardRoot>
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </I18nextProvider>
  );
}
