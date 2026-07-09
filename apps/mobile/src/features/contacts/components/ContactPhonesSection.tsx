import type { PhoneEntry } from "@bondery/schemas";
import {
  IconCopy,
  IconMessage,
  IconPencil,
  IconPhone,
  IconPhonePlus,
  IconStar,
  IconTrash,
} from "@tabler/icons-react-native";
import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { copyPhoneToClipboard, openPhoneCall, openPhoneSms } from "../contactChannelActions";
import {
  applyPreferredPhone,
  createDraftPhone,
  MAX_CONTACT_CHANNELS,
} from "../contactChannelConstants";
import { formatDisplayPhone } from "../contactUtils";
import { ContactChannelRow } from "./ContactChannelRow";
import { ContactDetailSectionHeader } from "./ContactDetailSectionHeader";
import { contactDetailStyles } from "./contactDetailStyles";
import { EditPhoneSheet } from "./EditPhoneSheet";

type SheetState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; index: number; entry: PhoneEntry };

interface ContactPhonesSectionProps {
  onSavePhones: (phones: PhoneEntry[]) => Promise<void>;
  phones: PhoneEntry[];
}

export function ContactPhonesSection({ phones, onSavePhones }: ContactPhonesSectionProps) {
  const colors = useMobileThemeColors();
  const t = useMobileTranslations();
  const { showToast } = useAppToast();
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAdd = phones.length < MAX_CONTACT_CHANNELS;
  const errorTitle = t("feedback.errorTitle", { ns: "common" });

  function openAddSheet() {
    if (!canAdd) {
      showToast({
        headline: t("MaxPhonesReached", { ns: "ContactInfo" }).replace(
          "{max}",
          String(MAX_CONTACT_CHANNELS),
        ),
        type: "error",
      });
      return;
    }

    setSheet({ mode: "add", open: true });
  }

  function openEditSheet(index: number) {
    setSheet({ entry: phones[index], index, mode: "edit", open: true });
  }

  async function persistPhones(nextPhones: PhoneEntry[]) {
    setIsSubmitting(true);

    try {
      await onSavePhones(nextPhones);
      setSheet({ open: false });
    } catch {
      showToast({
        description: t("PhonesUpdateError", { ns: "ContactInfo" }),
        headline: errorTitle,
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSaveEntry(entry: PhoneEntry) {
    if (!sheet.open) {
      return;
    }

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
    if (!sheet.open || sheet.mode !== "edit") {
      return;
    }

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
      errorTitle,
      successDescription: t("PhoneCopiedMessage", { ns: "ContactInfo" }),
      successTitle: t("CopySuccessTitle", { ns: "ContactInfo" }),
    }),
    [errorTitle, t],
  );

  return (
    <View style={contactDetailStyles.section}>
      <ContactDetailSectionHeader
        action={
          canAdd
            ? {
                accessibilityLabel: t("AddPhone", { ns: "ContactInfo" }),
                icon: <IconPhonePlus size={16} stroke={colors.primary} />,
                label: t("Add", { ns: "ContactInfo" }),
                onPress: openAddSheet,
              }
            : undefined
        }
        titleKey="PhoneNumbers"
        titleNamespace="ContactInfo"
      />

      {phones.length === 0 ? (
        <View
          style={[
            contactDetailStyles.card,
            contactDetailStyles.emptyCard,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Text style={[contactDetailStyles.emptyText, { color: colors.textMuted }]}>
            {t("NoPhones", { ns: "ContactInfo" })}
          </Text>
        </View>
      ) : (
        phones.map((phone) => {
          const typeLabel =
            phone.type === "work"
              ? t("TypeWork", { ns: "ContactInfo" })
              : t("TypeHome", { ns: "ContactInfo" });
          const displayPhone = formatDisplayPhone(phone);
          const accessibilityLabel = `${typeLabel} phone, ${displayPhone}${phone.preferred ? `, ${t("Preferred", { ns: "ContactInfo" })}` : ""}`;

          return (
            <ContactChannelRow
              accessibilityHint="Tap to message. Double tap to call. Long press to copy."
              accessibilityLabel={accessibilityLabel}
              channelIcon={<IconPhone size={16} stroke={colors.iconSecondary} />}
              isPreferred={phone.preferred}
              key={`${phone.prefix}-${phone.value}`}
              menuAccessibilityLabel={t("PhoneNumbers", { ns: "ContactInfo" })}
              menuItems={[
                {
                  disabled: !phone.value.trim(),
                  hint: t("MenuHintPress", { ns: "ContactInfo" }),
                  icon: <IconMessage size={18} stroke={colors.iconPrimary} />,
                  id: "sms",
                  label: t("SendSmsAction", { ns: "ContactInfo" }),
                  onPress: () => openPhoneSms(phone, showToast, errorTitle),
                },
                {
                  disabled: !phone.value.trim(),
                  hint: t("MenuHintDoublePress", { ns: "ContactInfo" }),
                  icon: <IconPhone size={18} stroke={colors.iconPrimary} />,
                  id: "call",
                  label: t("CallAction", { ns: "ContactInfo" }),
                  onPress: () => openPhoneCall(phone, showToast, errorTitle),
                },
                {
                  disabled: !phone.value.trim(),
                  hint: t("MenuHintHold", { ns: "ContactInfo" }),
                  icon: <IconCopy size={18} stroke={colors.iconPrimary} />,
                  id: "copy",
                  label: t("CopyAction", { ns: "ContactInfo" }),
                  onPress: () => {
                    void copyPhoneToClipboard(phone, showToast, copyMessages);
                  },
                },
                {
                  icon: <IconPencil size={18} stroke={colors.iconPrimary} />,
                  id: "edit",
                  label: t("EditAction", { ns: "ContactInfo" }),
                  onPress: () => openEditSheet(index),
                },
                {
                  disabled: phone.preferred,
                  icon: <IconStar size={18} stroke={colors.iconPrimary} />,
                  id: "preferred",
                  label: t("SetAsPreferred", { ns: "ContactInfo" }),
                  onPress: () => handleSetPreferred(index),
                },
                {
                  icon: <IconTrash size={18} stroke={colors.dangerAccent} />,
                  id: "delete",
                  label: t("DeleteAction", { ns: "ContactInfo" }),
                  onPress: () => handleDeleteAtIndex(index),
                  tone: "danger",
                },
              ]}
              onDoublePress={() => openPhoneCall(phone, showToast, errorTitle)}
              onLongPress={() => {
                void copyPhoneToClipboard(phone, showToast, copyMessages);
              }}
              onPress={() => openPhoneSms(phone, showToast, errorTitle)}
              primaryLabel={displayPhone}
              type={phone.type}
            />
          );
        })
      )}

      <EditPhoneSheet
        initialEntry={sheetEntry}
        isSubmitting={isSubmitting}
        mode={sheet.open ? sheet.mode : "add"}
        onCancel={() => setSheet({ open: false })}
        onDelete={sheet.open && sheet.mode === "edit" ? handleDeleteEntry : undefined}
        onOpenChange={(open) => {
          if (!open) {
            setSheet({ open: false });
          }
        }}
        onSave={handleSaveEntry}
        open={sheet.open}
      />
    </View>
  );
}
