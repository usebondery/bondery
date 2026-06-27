import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  IconCopy,
  IconMessage,
  IconPencil,
  IconPhone,
  IconPhonePlus,
  IconStar,
  IconTrash,
} from "@tabler/icons-react-native";
import type { PhoneEntry } from "@bondery/schemas";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import {
  copyPhoneToClipboard,
  openPhoneCall,
  openPhoneSms,
} from "../contactChannelActions";
import {
  MAX_CONTACT_CHANNELS,
  applyPreferredPhone,
  createDraftPhone,
} from "../contactChannelConstants";
import { formatDisplayPhone } from "../contactUtils";
import { ContactChannelRow } from "./ContactChannelRow";
import { ContactDetailSectionHeader } from "./ContactDetailSectionHeader";
import { EditPhoneSheet } from "./EditPhoneSheet";
import { contactDetailStyles } from "./contactDetailStyles";

type SheetState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; index: number; entry: PhoneEntry };

interface ContactPhonesSectionProps {
  phones: PhoneEntry[];
  onSavePhones: (phones: PhoneEntry[]) => Promise<void>;
}

export function ContactPhonesSection({ phones, onSavePhones }: ContactPhonesSectionProps) {
  const colors = useMobileThemeColors();
  const t = useMobileTranslations();
  const { showToast } = useAppToast();
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAdd = phones.length < MAX_CONTACT_CHANNELS;
  const errorTitle = t("MobileApp.Common.ErrorTitle");

  function openAddSheet() {
    if (!canAdd) {
      showToast({
        type: "error",
        headline: t("ContactInfo.MaxPhonesReached").replace("{max}", String(MAX_CONTACT_CHANNELS)),
      });
      return;
    }

    setSheet({ open: true, mode: "add" });
  }

  function openEditSheet(index: number) {
    setSheet({ open: true, mode: "edit", index, entry: phones[index] });
  }

  async function persistPhones(nextPhones: PhoneEntry[]) {
    setIsSubmitting(true);

    try {
      await onSavePhones(nextPhones);
      setSheet({ open: false });
    } catch {
      showToast({
        type: "error",
        headline: errorTitle,
        description: t("ContactInfo.PhonesUpdateError"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSaveEntry(entry: PhoneEntry) {
    if (!sheet.open) return;

    let nextPhones: PhoneEntry[];

    if (sheet.mode === "add") {
      nextPhones = [...phones, { ...entry, preferred: phones.length === 0 }];
    } else {
      nextPhones = phones.map((phone, index) =>
        index === sheet.index ? { ...entry, preferred: phone.preferred } : phone,
      );
    }

    void persistPhones(nextPhones);
  }

  function handleDeleteEntry() {
    if (!sheet.open || sheet.mode !== "edit") return;

    const nextPhones = phones.filter((_, index) => index !== sheet.index);
    void persistPhones(nextPhones);
  }

  function handleDeleteAtIndex(index: number) {
    void persistPhones(phones.filter((_, phoneIndex) => phoneIndex !== index));
  }

  function handleSetPreferred(index: number) {
    void persistPhones(applyPreferredPhone(phones, index));
  }

  const sheetEntry =
    sheet.open && sheet.mode === "edit"
      ? sheet.entry
      : sheet.open && sheet.mode === "add"
        ? createDraftPhone(phones.length === 0)
        : null;

  const copyMessages = useMemo(
    () => ({
      successTitle: t("ContactInfo.CopySuccessTitle"),
      successDescription: t("ContactInfo.PhoneCopiedMessage"),
      errorTitle,
    }),
    [errorTitle, t],
  );

  return (
    <View style={contactDetailStyles.section}>
      <ContactDetailSectionHeader
        titleKey="ContactInfo.PhoneNumbers"
        action={
          canAdd
            ? {
                label: t("ContactInfo.Add"),
                accessibilityLabel: t("ContactInfo.AddPhone"),
                icon: <IconPhonePlus size={16} stroke={colors.primary} />,
                onPress: openAddSheet,
              }
            : undefined
        }
      />

      {phones.length === 0 ? (
        <View
          style={[
            contactDetailStyles.card,
            contactDetailStyles.emptyCard,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Text style={[contactDetailStyles.emptyText, { color: colors.textMuted }]}>{t("ContactInfo.NoPhones")}</Text>
        </View>
      ) : (
        phones.map((phone, index) => {
          const typeLabel = phone.type === "work" ? t("ContactInfo.TypeWork") : t("ContactInfo.TypeHome");
          const displayPhone = formatDisplayPhone(phone);
          const accessibilityLabel = `${typeLabel} phone, ${displayPhone}${phone.preferred ? `, ${t("ContactInfo.Preferred")}` : ""}`;

          return (
            <ContactChannelRow
              key={`${phone.prefix}-${phone.value}-${index}`}
              primaryLabel={displayPhone}
              type={phone.type}
              isPreferred={phone.preferred}
              channelIcon={<IconPhone size={16} stroke={colors.iconSecondary} />}
              menuAccessibilityLabel={t("ContactInfo.PhoneNumbers")}
              accessibilityLabel={accessibilityLabel}
              accessibilityHint="Tap to message. Double tap to call. Long press to copy."
              onPress={() => openPhoneSms(phone, showToast, errorTitle)}
              onDoublePress={() => openPhoneCall(phone, showToast, errorTitle)}
              onLongPress={() => {
                void copyPhoneToClipboard(phone, showToast, copyMessages);
              }}
              menuItems={[
                {
                  id: "sms",
                  label: t("ContactInfo.SendSmsAction"),
                  hint: t("ContactInfo.MenuHintPress"),
                  icon: <IconMessage size={18} stroke={colors.iconPrimary} />,
                  disabled: !phone.value.trim(),
                  onPress: () => openPhoneSms(phone, showToast, errorTitle),
                },
                {
                  id: "call",
                  label: t("ContactInfo.CallAction"),
                  hint: t("ContactInfo.MenuHintDoublePress"),
                  icon: <IconPhone size={18} stroke={colors.iconPrimary} />,
                  disabled: !phone.value.trim(),
                  onPress: () => openPhoneCall(phone, showToast, errorTitle),
                },
                {
                  id: "copy",
                  label: t("ContactInfo.CopyAction"),
                  hint: t("ContactInfo.MenuHintHold"),
                  icon: <IconCopy size={18} stroke={colors.iconPrimary} />,
                  disabled: !phone.value.trim(),
                  onPress: () => {
                    void copyPhoneToClipboard(phone, showToast, copyMessages);
                  },
                },
                {
                  id: "edit",
                  label: t("ContactInfo.EditAction"),
                  icon: <IconPencil size={18} stroke={colors.iconPrimary} />,
                  onPress: () => openEditSheet(index),
                },
                {
                  id: "preferred",
                  label: t("ContactInfo.SetAsPreferred"),
                  icon: <IconStar size={18} stroke={colors.iconPrimary} />,
                  disabled: phone.preferred,
                  onPress: () => handleSetPreferred(index),
                },
                {
                  id: "delete",
                  label: t("ContactInfo.DeleteAction"),
                  icon: <IconTrash size={18} stroke={colors.dangerAccent} />,
                  tone: "danger",
                  onPress: () => handleDeleteAtIndex(index),
                },
              ]}
            />
          );
        })
      )}

      <EditPhoneSheet
        open={sheet.open}
        mode={sheet.open ? sheet.mode : "add"}
        initialEntry={sheetEntry}
        isSubmitting={isSubmitting}
        onOpenChange={(open) => {
          if (!open) setSheet({ open: false });
        }}
        onCancel={() => setSheet({ open: false })}
        onSave={handleSaveEntry}
        onDelete={sheet.open && sheet.mode === "edit" ? handleDeleteEntry : undefined}
      />
    </View>
  );
}
