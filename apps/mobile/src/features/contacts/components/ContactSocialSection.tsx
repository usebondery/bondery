import { useMemo, useState } from "react";
import { Linking, StyleSheet, Text, View } from "react-native";
import { createSocialUrl, type ContactSocialFieldKey } from "@bondery/helpers";
import type { Contact } from "@bondery/schemas";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { MOBILE_TEXT_STYLES } from "../../../theme/tokens";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { ContactSocialButton } from "./ContactSocialButton";
import {
  CONTACT_SOCIAL_PLATFORMS,
  renderContactSocialAddIcon,
} from "./contactSocialConfig";
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
  const t = useMobileTranslations();
  const colors = useMobileThemeColors();
  const { showToast } = useAppToast();
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filledPlatforms = useMemo(
    () => CONTACT_SOCIAL_PLATFORMS.filter((platform) => Boolean(contact[platform.key])),
    [contact],
  );

  const availablePlatforms = useMemo(
    () => CONTACT_SOCIAL_PLATFORMS.filter((platform) => !contact[platform.key]).map((platform) => platform.key),
    [contact],
  );

  const canAdd = availablePlatforms.length > 0;

  function openLink(platform: ContactSocialFieldKey, handle: string) {
    const url = createSocialUrl(platform, handle);
    if (!url) return;

    Linking.openURL(url).catch(() => {
      showToast({
        type: "error",
        headline: "Could not open link",
      });
    });
  }

  function openAddSheet() {
    if (!canAdd) return;
    setSheet({ open: true, mode: "add" });
  }

  function openEditSheet(platform: ContactSocialFieldKey) {
    setSheet({
      open: true,
      mode: "edit",
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
        type: "success",
        headline: value ? "Saved" : "Removed",
        description: value
          ? `${platform.charAt(0).toUpperCase()}${platform.slice(1)} updated`
          : `${platform.charAt(0).toUpperCase()}${platform.slice(1)} removed`,
      });
    } catch {
      showToast({
        type: "error",
        headline: "Could not save",
        description: `Failed to update ${platform}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  const sheetPlatform = sheet.open && sheet.mode === "edit" ? sheet.platform : null;
  const sheetInitialValue = sheet.open && sheet.mode === "edit" ? sheet.value : "";

  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, MOBILE_TEXT_STYLES.sectionLabel, { color: colors.textMuted }]}>
        {t("Socials.Title").toUpperCase()}
      </Text>

      <View accessibilityRole="none" accessibilityLabel="Social links" style={styles.row}>
        {filledPlatforms.map((platform) => {
          const handle = contact[platform.key] as string;
          const nameSuffix = contactFirstName ? ` for ${contactFirstName}` : "";

          return (
            <ContactSocialButton
              key={platform.key}
              color={platform.color}
              icon={platform.renderIcon(platform.color)}
              accessibilityLabel={`${t(platform.accessibilityLabelKey)}${nameSuffix}`}
              accessibilityHint="Long press to edit"
              onPress={() => openLink(platform.key, handle)}
              onLongPress={() => openEditSheet(platform.key)}
            />
          );
        })}

        {canAdd ? (
          <ContactSocialButton
            color={colors.textMuted}
            dashed
            icon={renderContactSocialAddIcon(colors.textMuted)}
            accessibilityLabel="Add social link"
            onPress={openAddSheet}
          />
        ) : null}
      </View>

      <EditSocialSheet
        open={sheet.open}
        mode={sheet.open ? sheet.mode : "add"}
        platform={sheetPlatform}
        initialValue={sheetInitialValue}
        availablePlatforms={availablePlatforms}
        isSubmitting={isSubmitting}
        onOpenChange={(open) => {
          if (!open && !isSubmitting) {
            setSheet({ open: false });
          }
        }}
        onCancel={() => setSheet({ open: false })}
        onSave={(platform, value) => void savePlatform(platform, value)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 24,
    gap: 8,
  },
  sectionTitle: {},
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    alignItems: "center",
  },
});
