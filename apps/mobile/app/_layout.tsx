import "react-native-gesture-handler";
import React from "react";
import { Stack, useRouter, useSegments } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { useAuthSession } from "../src/lib/auth/useAuthSession";

type RootErrorBoundaryState = {
  hasError: boolean;
  message: string;
};

class RootErrorBoundary extends React.Component<React.PropsWithChildren, RootErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
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
    if (this.state.hasError) {
      return (
        <View style={styles.errorScreen}>
          <Text style={styles.errorTitle}>Mobile app runtime error</Text>
          <Text style={styles.errorMessage}>{this.state.message || "Unknown error"}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

export default function RootLayout() {
  const { session, isLoadingSession } = useAuthSession();
  const router = useRouter();
  const segments = useSegments();

  React.useEffect(() => {
    if (isLoadingSession) {
      return;
    }

    const firstSegment = segments[0] || "";
    const secondSegment = segments[1] || "";
    const isAuthRoute =
      firstSegment === "login" || (firstSegment === "auth" && secondSegment === "callback");

    if (!session && !isAuthRoute) {
      router.replace("/login");
      return;
    }

    if (session && isAuthRoute) {
      router.replace("/(tabs)/contacts");
    }
  }, [isLoadingSession, router, segments, session]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <RootErrorBoundary>
          {isLoadingSession ? (
            <View style={styles.loadingScreen}>
              <ActivityIndicator size="large" color="#111827" />
            </View>
          ) : (
            <Stack screenOptions={{ headerShown: false }} />
          )}
        </RootErrorBoundary>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  errorScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 16,
    backgroundColor: "#ffffff",
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: "#991b1b",
    textAlign: "center",
  },
  loadingScreen: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#ffffff",
  },
});
