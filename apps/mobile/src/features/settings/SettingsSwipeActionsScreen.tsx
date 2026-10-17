import { getRandomExampleName } from "@bondery/helpers/name";
import type { Contact } from "@bondery/schemas";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { ScrollView } from "react-native";
import { StackNavBar } from "../../components/chrome";
import { Paper } from "../../components/ui/Paper";
import { Select } from "../../components/ui/Select";
import { Stack } from "../../components/ui/Stack";
import { updateSettings } from "../../lib/api/client";
import {
  useCommonTranslations,
  useMobileSettingsTranslations,
} from "../../lib/i18n/generated/hooks";
import { goBackOrReplace } from "../../lib/navigation/goBackOrReplace";
import { getSwipeActionIcon } from "../../lib/preferences/swipeActionIcons";
import type {
  MobilePreferencesState,
  SwipeAction,
} from "../../lib/preferences/useMobilePreferences";
import { useMobilePreferences } from "../../lib/preferences/useMobilePreferences";
import { MOBILE_LAYOUT } from "../../theme/tokens";
import { useMobileThemeColors } from "../../theme/useMobileThemeColors";
import { ContactRow } from "../contacts/components/ContactRow";
import { SettingsPreviewSection } from "./components/SettingsPreviewSection";

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
  const tMobileSettings = useMobileSettingsTranslations();
  const t = useCommonTranslations();
  const router = useRouter();
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
      call: t("actions.call"),
      email: t("actions.email"),
      message: t("actions.message"),
    }),
    [t],
  );

  const swipeOptions = [
    {
      label: t("actions.call"),
      leftSection: { icon: getSwipeActionIcon("call", iconStroke), type: "icon" as const },
      value: "call" as SwipeAction,
    },
    {
      label: t("actions.message"),
      leftSection: { icon: getSwipeActionIcon("message", iconStroke), type: "icon" as const },
      value: "message" as SwipeAction,
    },
    {
      label: t("actions.email"),
      leftSection: { icon: getSwipeActionIcon("email", iconStroke), type: "icon" as const },
      value: "email" as SwipeAction,
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
        onBack={() => goBackOrReplace(router, "/settings")}
        title={tMobileSettings("SwipeActions")}
        variant="elevated"
      />

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingBottom: MOBILE_LAYOUT.spacing.contentBottom,
          paddingHorizontal: MOBILE_LAYOUT.spacing.horizontal,
          paddingTop: MOBILE_LAYOUT.spacing.contentTop,
        }}
        style={{ backgroundColor: colors.appBackground }}
      >
        <Stack gap="lg">
          <Select
            data={swipeOptions}
            label={tMobileSettings("LeftSwipe")}
            onChange={handleLeftSwipeChange}
            value={leftSwipeAction}
          />

          <Select
            data={swipeOptions}
            label={tMobileSettings("RightSwipe")}
            onChange={handleRightSwipeChange}
            value={rightSwipeAction}
          />

          <SettingsPreviewSection description={tMobileSettings("PreviewHintSwipeActions")}>
            <Paper withBorder>
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
            </Paper>
          </SettingsPreviewSection>
        </Stack>
      </ScrollView>
    </>
  );
}
