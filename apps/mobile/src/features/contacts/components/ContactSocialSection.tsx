import { type ContactSocialFieldKey, createSocialUrl } from "@bondery/helpers";
import type { Contact } from "@bondery/schemas";
import { useMemo, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { useCommonTranslations, useSocialsTranslations } from "@/lib/i18n/generated/hooks";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { MOBILE_TEXT_STYLES } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { ContactSocialButton } from "./ContactSocialButton";
import { CONTACT_SOCIAL_PLATFORMS, renderContactSocialAddIcon } from "./contactSocialConfig";
import { EditSocialSheet } from "./EditSocialSheet";

interface ContactSocialSectionProps {
  contact: Contact;
  contactFirstName?: string | null;
  onUpdateSocial: (platform: ContactSocialFieldKey, value: string) => Promise<void>;
}

type SheetState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; platform: ContactSocialFieldKey; value: string };

/**
 * Icon-only social link row with add / edit / remove support.
 */
export function ContactSocialSection({
  contact,
  contactFirstName,
  onUpdateSocial,
}: ContactSocialSectionProps) {
  const tSocials = useSocialsTranslations();
  const t = useCommonTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filledPlatforms = useMemo(
    () => CONTACT_SOCIAL_PLATFORMS.filter((platform) => Boolean(contact[platform.key])),
    [contact],
  );

  const availablePlatforms = useMemo(
    () =>
      CONTACT_SOCIAL_PLATFORMS.filter((platform) => !contact[platform.key]).map(
        (platform) => platform.key,
      ),
    [contact],
  );

  const canAdd = availablePlatforms.length > 0;

  function openLink(platform: ContactSocialFieldKey, handle: string) {
    const url = createSocialUrl(platform, handle);
    if (!url) {
      return;
    }

    Linking.openURL(url).catch(() => {
      showToast({
        headline: "Could not open link",
        type: "error",
      });
    });
  }

  function openAddSheet() {
    if (!canAdd) {
      return;
    }
    setSheet({ mode: "add", open: true });
  }

  function openEditSheet(platform: ContactSocialFieldKey) {
    setSheet({
      mode: "edit",
      open: true,
      platform,
      value: contact[platform] ?? "",
    });
  }

  async function savePlatform(platform: ContactSocialFieldKey, value: string) {
    setIsSubmitting(true);

    try {
      await onUpdateSocial(platform, value);
      setSheet({ open: false });
      showToast({
        description: value
          ? `${platform.charAt(0).toUpperCase()}${platform.slice(1)} updated`
          : `${platform.charAt(0).toUpperCase()}${platform.slice(1)} removed`,
        headline: value ? "Saved" : "Removed",
        type: "success",
      });
    } catch {
      showToast({
        description: `Failed to update ${platform}`,
        headline: "Could not save",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const sheetPlatform = sheet.open && sheet.mode === "edit" ? sheet.platform : null;
  const sheetInitialValue = sheet.open && sheet.mode === "edit" ? sheet.value : "";

  return (
    <View style={styles.section}>
      <Text
        style={[styles.sectionTitle, MOBILE_TEXT_STYLES.sectionLabel, { color: colors.textMuted }]}
      >
        {tSocials("Title").toUpperCase()}
      </Text>

      <View accessibilityLabel="Social links" accessibilityRole="none" style={styles.row}>
        {filledPlatforms.map((platform) => {
          const handle = contact[platform.key] as string;
          const nameSuffix = contactFirstName ? ` for ${contactFirstName}` : "";

          return (
            <ContactSocialButton
              accessibilityHint="Long press to edit"
              accessibilityLabel={`${t(platform.accessibilityLabelKey)}${nameSuffix}`}
              color={platform.color}
              icon={platform.renderIcon(platform.color)}
              key={platform.key}
              onLongPress={() => openEditSheet(platform.key)}
              onPress={() => openLink(platform.key, handle)}
            />
          );
        })}

        {canAdd ? (
          <ContactSocialButton
            accessibilityLabel="Add social link"
            color={colors.textMuted}
            dashed
            icon={renderContactSocialAddIcon(colors.textMuted)}
            onPress={openAddSheet}
          />
        ) : null}
      </View>

      <EditSocialSheet
        availablePlatforms={availablePlatforms}
        initialValue={sheetInitialValue}
        isSubmitting={isSubmitting}
        mode={sheet.open ? sheet.mode : "add"}
        onCancel={() => setSheet({ open: false })}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setSheet({ open: false });
          }
        }}
        onSave={(platform, value) => void savePlatform(platform, value)}
        open={sheet.open}
        platform={sheetPlatform}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  section: {
    gap: 8,
    marginBottom: 24,
  },
  sectionTitle: {},
});
