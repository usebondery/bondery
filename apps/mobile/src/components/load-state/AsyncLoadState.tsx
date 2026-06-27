import type { ReactNode } from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { LoadErrorCard } from "./LoadErrorCard";

export interface AsyncLoadStateProps {
  isLoading: boolean;
  errorTitle?: string | null;
  errorDescription?: string | null;
  onRetry?: () => void;
  children: ReactNode;
  loadingMinHeight?: number;
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
  const resolvedErrorTitle = errorTitle ?? t("MobileApp.Settings.LoadErrorTitle");
  const hasError = Boolean(errorDescription);

  if (isLoading) {
    return (
      <View style={[styles.centered, { minHeight: loadingMinHeight }]}>
        <ActivityIndicator size="small" color={colors.primary} />
      </View>
    );
  }

  if (hasError) {
    return (
      <LoadErrorCard
        title={resolvedErrorTitle}
        description={errorDescription!}
        onRetry={onRetry}
      />
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
