import type { EmailEntry } from "@bondery/schemas";
import {
  IconCopy,
  IconMail,
  IconMailPlus,
  IconPencil,
  IconStar,
  IconTrash,
} from "@tabler/icons-react-native";
import { useState } from "react";
import { Text, View } from "react-native";
import { useCommonTranslations, useContactInfoTranslations } from "@/lib/i18n/generated/hooks";
import { notifications } from "../../../lib/toast/notifications";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import { copyEmailToClipboard, openEmailMailto } from "../contactChannelActions";
import {
  applyPreferredEmail,
  createDraftEmail,
  MAX_CONTACT_CHANNELS,
} from "../contactChannelConstants";
import { ContactChannelRow } from "./ContactChannelRow";
import { ContactDetailSectionHeader } from "./ContactDetailSectionHeader";
import { contactDetailStyles } from "./contactDetailStyles";
import { EditEmailSheet } from "./EditEmailSheet";

type SheetState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; index: number; entry: EmailEntry };

interface ContactEmailsSectionProps {
  emails: EmailEntry[];
  onSaveEmails: (emails: EmailEntry[]) => void;
}

export function ContactEmailsSection({ emails, onSaveEmails }: ContactEmailsSectionProps) {
  const t = useCommonTranslations();
  const tContactInfo = useContactInfoTranslations();
  const colors = useMobileThemeColors();
  const [sheet, setSheet] = useState<SheetState>({ open: false });

  const canAdd = emails.length < MAX_CONTACT_CHANNELS;
  const errorTitle = t("feedback.errorTitle");

  function openAddSheet() {
    if (!canAdd) {
      notifications.show({
        title: tContactInfo("MaxEmailsReached").replace("{max}", String(MAX_CONTACT_CHANNELS)),
        type: "error",
      });
      return;
    }

    setSheet({ mode: "add", open: true });
  }

  function openEditSheet(index: number) {
    setSheet({ entry: emails[index], index, mode: "edit", open: true });
  }

  function persistEmails(nextEmails: EmailEntry[]) {
    try {
      onSaveEmails(nextEmails);
    } catch {
      notifications.show({
        message: tContactInfo("EmailsUpdateError"),
        title: errorTitle,
        type: "error",
      });
      throw new Error("Emails update failed");
    }
  }

  function handleSaveEntry(entry: EmailEntry) {
    if (!sheet.open) {
      return;
    }

    let nextEmails: EmailEntry[];

    if (sheet.mode === "add") {
      nextEmails = [...emails, { ...entry, preferred: emails.length === 0 }];
    } else {
      nextEmails = emails.map((email, index) =>
        index === sheet.index ? { ...entry, preferred: email.preferred } : email,
      );
    }

    persistEmails(nextEmails);
  }

  function handleDeleteEntry() {
    if (!sheet.open || sheet.mode !== "edit") {
      return;
    }

    const nextEmails = emails.filter((_, index) => index !== sheet.index);
    persistEmails(nextEmails);
  }

  function handleDeleteAtIndex(index: number) {
    persistEmails(emails.filter((_, emailIndex) => emailIndex !== index));
  }

  function handleSetPreferred(index: number) {
    persistEmails(applyPreferredEmail(emails, index));
  }

  const sheetEntry =
    sheet.open && sheet.mode === "edit"
      ? sheet.entry
      : sheet.open && sheet.mode === "add"
        ? createDraftEmail(emails.length === 0)
        : null;

  const copyMessages = {
    errorTitle,
    successDescription: tContactInfo("EmailCopiedMessage"),
    successTitle: tContactInfo("CopySuccessTitle"),
  };

  return (
    <View style={contactDetailStyles.section}>
      <ContactDetailSectionHeader
        action={
          canAdd
            ? {
                accessibilityLabel: tContactInfo("AddEmail"),
                icon: <IconMailPlus size={16} stroke={colors.primary} />,
                label: tContactInfo("Add"),
                onPress: openAddSheet,
              }
            : undefined
        }
        titleKey="EmailAddresses"
        titleNamespace="ContactInfo"
      />

      {emails.length === 0 ? (
        <View
          style={[
            contactDetailStyles.card,
            contactDetailStyles.emptyCard,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Text style={[contactDetailStyles.emptyText, { color: colors.textMuted }]}>
            {tContactInfo("NoEmails")}
          </Text>
        </View>
      ) : (
        emails.map((email, index) => {
          const typeLabel =
            email.type === "work" ? tContactInfo("TypeWork") : tContactInfo("TypeHome");
          const accessibilityLabel = `${typeLabel} email, ${email.value}${email.preferred ? `, ${tContactInfo("Preferred")}` : ""}`;

          return (
            <ContactChannelRow
              accessibilityHint="Double tap to send email. Long press to copy."
              accessibilityLabel={accessibilityLabel}
              channelIcon={<IconMail size={16} stroke={colors.iconSecondary} />}
              isPreferred={email.preferred}
              key={`${email.type}-${email.value}`}
              menuAccessibilityLabel={tContactInfo("EmailAddresses")}
              menuItems={[
                {
                  disabled: !email.value.trim(),
                  hint: tContactInfo("MenuHintPress"),
                  icon: <IconMail size={18} stroke={colors.iconPrimary} />,
                  id: "email",
                  label: tContactInfo("SendEmailAction"),
                  onPress: () => openEmailMailto(email, errorTitle),
                },
                {
                  disabled: !email.value.trim(),
                  hint: tContactInfo("MenuHintHold"),
                  icon: <IconCopy size={18} stroke={colors.iconPrimary} />,
                  id: "copy",
                  label: tContactInfo("CopyAction"),
                  onPress: () => {
                    void copyEmailToClipboard(email, copyMessages);
                  },
                },
                {
                  icon: <IconPencil size={18} stroke={colors.iconPrimary} />,
                  id: "edit",
                  label: tContactInfo("EditAction"),
                  onPress: () => openEditSheet(index),
                },
                {
                  disabled: email.preferred,
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
              onLongPress={() => {
                void copyEmailToClipboard(email, copyMessages);
              }}
              onPress={() => openEmailMailto(email, errorTitle)}
              primaryLabel={email.value}
              type={email.type}
            />
          );
        })
      )}

      <EditEmailSheet
        initialEntry={sheetEntry}
        mode={sheet.open ? sheet.mode : "add"}
        onCancel={() => setSheet({ open: false })}
        onDelete={sheet.open && sheet.mode === "edit" ? handleDeleteEntry : undefined}
        onError={() => {
          notifications.show({
            message: tContactInfo("EmailsUpdateError"),
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
