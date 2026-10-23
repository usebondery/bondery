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
import { useState } from "react";
import { Text, View } from "react-native";
import { useCommonTranslations, useContactInfoTranslations } from "@/lib/i18n/generated/hooks";
import { notifications } from "../../../lib/toast/notifications";
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
  onSavePhones: (phones: PhoneEntry[]) => void;
  phones: PhoneEntry[];
}

export function ContactPhonesSection({ phones, onSavePhones }: ContactPhonesSectionProps) {
  const t = useCommonTranslations();
  const tContactInfo = useContactInfoTranslations();
  const colors = useMobileThemeColors();
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  const canAdd = phones.length < MAX_CONTACT_CHANNELS;
  const errorTitle = t("feedback.errorTitle");

  function openAddSheet() {
    if (!canAdd) {
      notifications.show({
        title: tContactInfo("MaxPhonesReached").replace("{max}", String(MAX_CONTACT_CHANNELS)),
        type: "error",
      });
      return;
    }

    setSheet({ mode: "add", open: true });
  }

  function openEditSheet(index: number) {
    setSheet({ entry: phones[index], index, mode: "edit", open: true });
  }

  function persistPhones(nextPhones: PhoneEntry[]) {
    try {
      onSavePhones(nextPhones);
    } catch {
      notifications.show({
        message: tContactInfo("PhonesUpdateError"),
        title: errorTitle,
        type: "error",
      });
      throw new Error("Phones update failed");
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

    persistPhones(nextPhones);
  }

  function handleDeleteEntry() {
    if (!sheet.open || sheet.mode !== "edit") {
      return;
    }

    const nextPhones = phones.filter((_, index) => index !== sheet.index);
    persistPhones(nextPhones);
  }

  function handleDeleteAtIndex(index: number) {
    persistPhones(phones.filter((_, phoneIndex) => phoneIndex !== index));
  }

  function handleSetPreferred(index: number) {
    persistPhones(applyPreferredPhone(phones, index));
  }

  const sheetEntry =
    sheet.open && sheet.mode === "edit"
      ? sheet.entry
      : sheet.open && sheet.mode === "add"
        ? createDraftPhone(phones.length === 0)
        : null;

  const copyMessages = {
    errorTitle,
    successDescription: tContactInfo("PhoneCopiedMessage"),
    successTitle: tContactInfo("CopySuccessTitle"),
  };

  return (
    <View style={contactDetailStyles.section}>
      <ContactDetailSectionHeader
        action={
          canAdd
            ? {
                accessibilityLabel: tContactInfo("AddPhone"),
                icon: <IconPhonePlus size={16} stroke={colors.primary} />,
                label: tContactInfo("Add"),
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
            {tContactInfo("NoPhones")}
          </Text>
        </View>
      ) : (
        phones.map((phone, index) => {
          const typeLabel =
            phone.type === "work" ? tContactInfo("TypeWork") : tContactInfo("TypeHome");
          const displayPhone = formatDisplayPhone(phone);
          const accessibilityLabel = `${typeLabel} phone, ${displayPhone}${phone.preferred ? `, ${tContactInfo("Preferred")}` : ""}`;

          return (
            <ContactChannelRow
              accessibilityHint="Tap to message. Double tap to call. Long press to copy."
              accessibilityLabel={accessibilityLabel}
              channelIcon={<IconPhone size={16} stroke={colors.iconSecondary} />}
              isPreferred={phone.preferred}
              key={`${phone.prefix}-${phone.value}`}
              menuAccessibilityLabel={tContactInfo("PhoneNumbers")}
              menuItems={[
                {
                  disabled: !phone.value.trim(),
                  hint: tContactInfo("MenuHintPress"),
                  icon: <IconMessage size={18} stroke={colors.iconPrimary} />,
                  id: "sms",
                  label: tContactInfo("SendSmsAction"),
                  onPress: () => openPhoneSms(phone, errorTitle),
                },
                {
                  disabled: !phone.value.trim(),
                  hint: tContactInfo("MenuHintDoublePress"),
                  icon: <IconPhone size={18} stroke={colors.iconPrimary} />,
                  id: "call",
                  label: tContactInfo("CallAction"),
                  onPress: () => openPhoneCall(phone, errorTitle),
                },
                {
                  disabled: !phone.value.trim(),
                  hint: tContactInfo("MenuHintHold"),
                  icon: <IconCopy size={18} stroke={colors.iconPrimary} />,
                  id: "copy",
                  label: tContactInfo("CopyAction"),
                  onPress: () => {
                    void copyPhoneToClipboard(phone, copyMessages);
                  },
                },
                {
                  icon: <IconPencil size={18} stroke={colors.iconPrimary} />,
                  id: "edit",
                  label: tContactInfo("EditAction"),
                  onPress: () => openEditSheet(index),
                },
                {
                  disabled: phone.preferred,
                  icon: <IconStar size={18} stroke={colors.iconPrimary} />,
                  id: "preferred",
                  label: tContactInfo("SetAsPreferred"),
                  onPress: () => handleSetPreferred(index),
                },
                {
                  icon: <IconTrash size={18} stroke={colors.dangerAccent} />,
                  id: "delete",
                  label: tContactInfo("DeleteAction"),
                  onPress: () => handleDeleteAtIndex(index),
                  tone: "danger",
                },
              ]}
              onDoublePress={() => openPhoneCall(phone, errorTitle)}
              onLongPress={() => {
                void copyPhoneToClipboard(phone, copyMessages);
              }}
              onPress={() => openPhoneSms(phone, errorTitle)}
              primaryLabel={displayPhone}
              type={phone.type}
            />
          );
        })
      )}

      <EditPhoneSheet
        initialEntry={sheetEntry}
        mode={sheet.open ? sheet.mode : "add"}
        onCancel={() => setSheet({ open: false })}
        onDelete={sheet.open && sheet.mode === "edit" ? handleDeleteEntry : undefined}
        onError={() => {
          notifications.show({
            message: tContactInfo("PhonesUpdateError"),
            title: errorTitle,
            type: "error",
          });
        }}
        onOpenChange={(open) => {
          if (!open) {
            setSheet({ open: false });
          }
        }}
        onPersist={handleSaveEntry}
        open={sheet.open}
      />
    </View>
  );
}
