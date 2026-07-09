import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { LoadErrorCard } from "./LoadErrorCard";

export interface AsyncLoadStateProps {
  children: ReactNode;
  errorDescription?: string | null;
  errorTitle?: string | null;
  isLoading: boolean;
  loadingMinHeight?: number;
  onRetry?: () => void;
}

export function AsyncLoadState({
  isLoading,
  errorTitle,
  errorDescription,
  onRetry,
  children,
  loadingMinHeight = 80,
}: AsyncLoadStateProps) {
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const resolvedErrorTitle = errorTitle ?? t("LoadErrorTitle", { ns: "MobileSettings" });
  const hasError = Boolean(errorDescription);

  if (isLoading) {
    return (
      <View style={[styles.centered, { minHeight: loadingMinHeight }]}>
        <ActivityIndicator color={colors.primary} size="small" />
      </View>
    );
  }

  if (hasError && errorDescription) {
    return (
      <LoadErrorCard description={errorDescription} onRetry={onRetry} title={resolvedErrorTitle} />
    );
  }

  return children;
}

const styles = StyleSheet.create({
  centered: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
});
