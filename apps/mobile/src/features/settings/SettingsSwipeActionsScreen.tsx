import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import type { Contact } from "@bondery/schemas";
import { getRandomExampleName } from "@bondery/helpers/name";
import { updateSettings } from "../../lib/api/client";
import { ContactRow } from "../contacts/components/ContactRow";
import { getSwipeActionIcon } from "../../lib/preferences/swipeActionIcons";
import type {
  MobilePreferencesState,
  SwipeAction,
} from "../../lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { StackNavBar } from "../../components/chrome";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { SettingsFieldLabel } from "./components/SettingsFieldLabel";
import { SettingsPreviewSection } from "./components/SettingsPreviewSection";
import { SettingsSelect } from "./components/SettingsSelect";

const PREVIEW_CONTACT_ID = "swipe-actions-preview";

function createPreviewContact(name: ReturnType<typeof getRandomExampleName>): Contact {
  return {
    id: PREVIEW_CONTACT_ID,
    userId: "preview",
    firstName: name.firstName,
    middleName: name.middleName,
    lastName: name.lastName,
    headline: null,
    location: null,
    notes: null,
    avatar: null,
    lastInteraction: null,
    lastInteractionActivityId: null,
    keepFrequencyDays: null,
    createdAt: new Date(0).toISOString(),
    phones: null,
    emails: null,
    linkedin: null,
    instagram: null,
    whatsapp: null,
    facebook: null,
    website: null,
    signal: null,
    myself: false,
    language: null,
    timezone: null,
    gisPoint: null,
    latitude: null,
    longitude: null,
  };
}

const noop = () => {};

export function SettingsSwipeActionsScreen() {
  const router = useRouter();
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const iconStroke = colors.iconSecondary;

  const leftSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.leftSwipeAction,
  );
  const rightSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.rightSwipeAction,
  );
  const setLeftSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.setLeftSwipeAction,
  );
  const setRightSwipeAction = useMobilePreferences(
    (state: MobilePreferencesState) => state.setRightSwipeAction,
  );

  const previewContact = useMemo(
    () => createPreviewContact(getRandomExampleName()),
    [],
  );

  const swipeTexts = useMemo(
    () => ({
      call: t("MobileApp.Common.Call"),
      message: t("MobileApp.Common.Message"),
      email: t("MobileApp.Common.Email"),
    }),
    [t],
  );

  const swipeOptions: Array<{
    value: SwipeAction;
    label: string;
    icon: ReactNode;
  }> = [
    {
      value: "call",
      label: t("MobileApp.Common.Call"),
      icon: getSwipeActionIcon("call", iconStroke),
    },
    {
      value: "message",
      label: t("MobileApp.Common.Message"),
      icon: getSwipeActionIcon("message", iconStroke),
    },
    {
      value: "email",
      label: t("MobileApp.Common.Email"),
      icon: getSwipeActionIcon("email", iconStroke),
    },
  ];

  const handleLeftSwipeChange = (nextAction: SwipeAction) => {
    if (nextAction === leftSwipeAction) {
      return;
    }

    setLeftSwipeAction(nextAction);
    void updateSettings({ leftSwipeAction: nextAction });
  };

  const handleRightSwipeChange = (nextAction: SwipeAction) => {
    if (nextAction === rightSwipeAction) {
      return;
    }

    setRightSwipeAction(nextAction);
    void updateSettings({ rightSwipeAction: nextAction });
  };

  return (
    <>
      <StackNavBar
        variant="elevated"
        title={t("MobileApp.Settings.SwipeActions")}
        onBack={() => router.back()}
      />

      <ScrollView
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
        contentContainerStyle={styles.content}
      >
        <SettingsFieldLabel>{t("MobileApp.Settings.LeftSwipe")}</SettingsFieldLabel>
        <SettingsSelect
          label={t("MobileApp.Settings.LeftSwipe")}
          options={swipeOptions}
          value={leftSwipeAction}
          onValueChange={handleLeftSwipeChange}
        />

        <SettingsFieldLabel>{t("MobileApp.Settings.RightSwipe")}</SettingsFieldLabel>
        <SettingsSelect
          label={t("MobileApp.Settings.RightSwipe")}
          options={swipeOptions}
          value={rightSwipeAction}
          onValueChange={handleRightSwipeChange}
        />

        <SettingsPreviewSection caption={t("MobileApp.Settings.PreviewHintSwipeActions")}>
          <View
            style={[
              styles.previewCard,
              { backgroundColor: colors.surface, borderColor: colors.borderStrong },
            ]}
          >
            <ContactRow
              contact={previewContact}
              selected={false}
              selectionMode={false}
              previewMode
              leftSwipeAction={leftSwipeAction}
              rightSwipeAction={rightSwipeAction}
              texts={swipeTexts}
              onToggleSelect={noop}
              onEnterSelection={noop}
              onExecuteAction={noop}
            />
          </View>
        </SettingsPreviewSection>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingTop: MOBILE_LAYOUT.spacing.contentTop,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
    gap: 16,
  },
  previewCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
});
