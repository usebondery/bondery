import { getRandomExampleName } from "@bondery/helpers/name";
import type { Contact } from "@bondery/schemas";
import { useRouter } from "expo-router";
import type { ReactNode } from "react";
import { useMemo } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { updateSettings } from "../../lib/api/client";
import { useMobileTranslations } from "../../lib/i18n/useMobileTranslations";
import { getSwipeActionIcon } from "../../lib/preferences/swipeActionIcons";
import type {
  MobilePreferencesState,
  SwipeAction,
} from "../../lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ContactRow } from "../contacts/components/ContactRow";
import { SettingsFieldLabel } from "./components/SettingsFieldLabel";
import { SettingsPreviewSection } from "./components/SettingsPreviewSection";
import { SettingsSelect } from "./components/SettingsSelect";

const PREVIEW_CONTACT_ID = "swipe-actions-preview";

function createPreviewContact(name: ReturnType<typeof getRandomExampleName>): Contact {
  return {
    avatar: null,
    createdAt: new Date(0).toISOString(),
    emails: null,
    facebook: null,
    firstName: name.firstName,
    gisPoint: null,
    headline: null,
    id: PREVIEW_CONTACT_ID,
    instagram: null,
    keepFrequencyDays: null,
    language: null,
    lastInteraction: null,
    lastInteractionActivityId: null,
    lastName: name.lastName,
    latitude: null,
    linkedin: null,
    location: null,
    longitude: null,
    middleName: name.middleName,
    myself: false,
    notes: null,
    phones: null,
    signal: null,
    timezone: null,
    updatedAt: new Date(0).toISOString(),
    userId: "preview",
    website: null,
    whatsapp: null,
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

  const previewContact = useMemo(() => createPreviewContact(getRandomExampleName()), []);

  const swipeTexts = useMemo(
    () => ({
      call: t("actions.call", { ns: "common" }),
      email: t("actions.email", { ns: "common" }),
      message: t("actions.message", { ns: "common" }),
    }),
    [t],
  );

  const swipeOptions: Array<{
    value: SwipeAction;
    label: string;
    icon: ReactNode;
  }> = [
    {
      icon: getSwipeActionIcon("call", iconStroke),
      label: t("actions.call", { ns: "common" }),
      value: "call",
    },
    {
      icon: getSwipeActionIcon("message", iconStroke),
      label: t("actions.message", { ns: "common" }),
      value: "message",
    },
    {
      icon: getSwipeActionIcon("email", iconStroke),
      label: t("actions.email", { ns: "common" }),
      value: "email",
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
        onBack={() => router.back()}
        title={t("SwipeActions", { ns: "MobileSettings" })}
        variant="elevated"
      />

      <ScrollView
        contentContainerStyle={styles.content}
        style={[styles.screen, { backgroundColor: colors.appBackground }]}
      >
        <SettingsFieldLabel>{t("LeftSwipe", { ns: "MobileSettings" })}</SettingsFieldLabel>
        <SettingsSelect
          label={t("LeftSwipe", { ns: "MobileSettings" })}
          onValueChange={handleLeftSwipeChange}
          options={swipeOptions}
          value={leftSwipeAction}
        />

        <SettingsFieldLabel>{t("RightSwipe", { ns: "MobileSettings" })}</SettingsFieldLabel>
        <SettingsSelect
          label={t("RightSwipe", { ns: "MobileSettings" })}
          onValueChange={handleRightSwipeChange}
          options={swipeOptions}
          value={rightSwipeAction}
        />

        <SettingsPreviewSection caption={t("PreviewHintSwipeActions", { ns: "MobileSettings" })}>
          <View
            style={[
              styles.previewCard,
              { backgroundColor: colors.surface, borderColor: colors.borderStrong },
            ]}
          >
            <ContactRow
              contact={previewContact}
              leftSwipeAction={leftSwipeAction}
              onEnterSelection={noop}
              onExecuteAction={noop}
              onToggleSelect={noop}
              previewMode
              rightSwipeAction={rightSwipeAction}
              selected={false}
              selectionMode={false}
              texts={swipeTexts}
            />
          </View>
        </SettingsPreviewSection>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
    paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
    paddingTop: MOBILE_LAYOUT.spacing.contentTop,
  },
  previewCard: {
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  screen: {
    flex: 1,
  },
});
