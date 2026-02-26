import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import type { UserSettingsResponse } from "@bondery/types";
import { fetchSettings } from "../../lib/api/client";
import {
  MobilePreferencesState,
  MobileLocale,
  SwipeAction,
  useMobilePreferences,
} from "../../lib/preferences/useMobilePreferences";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";

function ChoiceGroup<T extends string>({
  options,
  selected,
  onChange,
}: {
  options: Array<{ value: T; label: string }>;
  selected: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choiceGroup}>
      {options.map((option) => {
        const active = option.value === selected;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={[styles.choiceChip, active && styles.choiceChipActive]}
          >
            <Text style={[styles.choiceChipText, active && styles.choiceChipTextActive]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SettingsScreen() {
  const t = useMobileTranslations();
  const locale = useMobilePreferences((state: MobilePreferencesState) => state.locale);
  const leftSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.leftSwipeAction,
  );
  const rightSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.rightSwipeAction,
  );
  const setLocale = useMobilePreferences((state: MobilePreferencesState) => state.setLocale);
  const setLeftSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.setLeftSwipeAction,
  );
  const setRightSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.setRightSwipeAction,
  );

  const [loadingSettings, setLoadingSettings] = useState(true);
  const [settingsResponse, setSettingsResponse] = useState<UserSettingsResponse | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const response = await fetchSettings();
        setSettingsResponse(response);
      } finally {
        setLoadingSettings(false);
      }
    };

    loadSettings();
  }, []);

  const swipeOptions: Array<{ value: SwipeAction; label: string }> = [
    { value: "call", label: t("MobileApp.Common.Call") },
    { value: "message", label: t("MobileApp.Common.Message") },
  ];

  const localeOptions: Array<{ value: MobileLocale; label: string }> = [
    { value: "en", label: t("MobileApp.Settings.English") },
    { value: "cs", label: t("MobileApp.Settings.Czech") },
  ];

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.title}>{t("MobileApp.Settings.Title")}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("MobileApp.Settings.Account")}</Text>
        {loadingSettings ? (
          <ActivityIndicator size="small" color="#111827" />
        ) : (
          <>
            <Text style={styles.accountText}>
              {settingsResponse?.data?.email || t("MobileApp.Settings.NoEmail")}
            </Text>
            <Text style={styles.accountSubText}>{settingsResponse?.data?.timezone || "UTC"}</Text>
          </>
        )}
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("MobileApp.Settings.SwipeActions")}</Text>

        <Text style={styles.label}>{t("MobileApp.Settings.LeftSwipe")}</Text>
        <ChoiceGroup
          options={swipeOptions}
          selected={leftSwipeAction}
          onChange={setLeftSwipeAction}
        />

        <Text style={styles.label}>{t("MobileApp.Settings.RightSwipe")}</Text>
        <ChoiceGroup
          options={swipeOptions}
          selected={rightSwipeAction}
          onChange={setRightSwipeAction}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t("MobileApp.Settings.Language")}</Text>
        <ChoiceGroup options={localeOptions} selected={locale} onChange={setLocale} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  content: {
    paddingTop: 54,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  card: {
    borderRadius: 14,
    backgroundColor: "#ffffff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    padding: 14,
    gap: 10,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  accountText: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "500",
  },
  accountSubText: {
    fontSize: 13,
    color: "#6b7280",
  },
  label: {
    marginTop: 2,
    fontSize: 13,
    color: "#4b5563",
    fontWeight: "600",
  },
  choiceGroup: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  choiceChip: {
    borderRadius: 999,
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceChipActive: {
    backgroundColor: "#111827",
  },
  choiceChipText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  choiceChipTextActive: {
    color: "#ffffff",
  },
});
