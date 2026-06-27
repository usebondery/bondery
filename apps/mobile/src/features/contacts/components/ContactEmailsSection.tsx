import { useMemo, useState } from "react";
import { Text, View } from "react-native";
import {
  IconCopy,
  IconMail,
  IconMailPlus,
  IconPencil,
  IconStar,
  IconTrash,
} from "@tabler/icons-react-native";
import type { EmailEntry } from "@bondery/schemas";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { useMobileThemeColors } from "../../../theme/useMobileThemeColors";
import {
  copyEmailToClipboard,
  openEmailMailto,
} from "../contactChannelActions";
import {
  MAX_CONTACT_CHANNELS,
  applyPreferredEmail,
  createDraftEmail,
} from "../contactChannelConstants";
import { ContactChannelRow } from "./ContactChannelRow";
import { ContactDetailSectionHeader } from "./ContactDetailSectionHeader";
import { EditEmailSheet } from "./EditEmailSheet";
import { contactDetailStyles } from "./contactDetailStyles";

type SheetState =
  | { open: false }
  | { open: true; mode: "add" }
  | { open: true; mode: "edit"; index: number; entry: EmailEntry };

interface ContactEmailsSectionProps {
  emails: EmailEntry[];
  onSaveEmails: (emails: EmailEntry[]) => Promise<void>;
}

export function ContactEmailsSection({ emails, onSaveEmails }: ContactEmailsSectionProps) {
  const colors = useMobileThemeColors();
  const t = useMobileTranslations();
  const { showToast } = useAppToast();
  const [sheet, setSheet] = useState<SheetState>({ open: false });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canAdd = emails.length < MAX_CONTACT_CHANNELS;
  const errorTitle = t("MobileApp.Common.ErrorTitle");

  function openAddSheet() {
    if (!canAdd) {
      showToast({
        type: "error",
        headline: t("ContactInfo.MaxEmailsReached").replace("{max}", String(MAX_CONTACT_CHANNELS)),
      });
      return;
    }

    setSheet({ open: true, mode: "add" });
  }

  function openEditSheet(index: number) {
    setSheet({ open: true, mode: "edit", index, entry: emails[index] });
  }

  async function persistEmails(nextEmails: EmailEntry[]) {
    setIsSubmitting(true);

    try {
      await onSaveEmails(nextEmails);
      setSheet({ open: false });
    } catch {
      showToast({
        type: "error",
        headline: errorTitle,
        description: t("ContactInfo.EmailsUpdateError"),
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSaveEntry(entry: EmailEntry) {
    if (!sheet.open) return;

    let nextEmails: EmailEntry[];

    if (sheet.mode === "add") {
      nextEmails = [...emails, { ...entry, preferred: emails.length === 0 }];
    } else {
      nextEmails = emails.map((email, index) =>
        index === sheet.index ? { ...entry, preferred: email.preferred } : email,
      );
    }

    void persistEmails(nextEmails);
  }

  function handleDeleteEntry() {
    if (!sheet.open || sheet.mode !== "edit") return;

    const nextEmails = emails.filter((_, index) => index !== sheet.index);
    void persistEmails(nextEmails);
  }

  function handleDeleteAtIndex(index: number) {
    void persistEmails(emails.filter((_, emailIndex) => emailIndex !== index));
  }

  function handleSetPreferred(index: number) {
    void persistEmails(applyPreferredEmail(emails, index));
  }

  const sheetEntry =
    sheet.open && sheet.mode === "edit"
      ? sheet.entry
      : sheet.open && sheet.mode === "add"
        ? createDraftEmail(emails.length === 0)
        : null;

  const copyMessages = useMemo(
    () => ({
      successTitle: t("ContactInfo.CopySuccessTitle"),
      successDescription: t("ContactInfo.EmailCopiedMessage"),
      errorTitle,
    }),
    [errorTitle, t],
  );

  return (
    <View style={contactDetailStyles.section}>
      <ContactDetailSectionHeader
        titleKey="ContactInfo.EmailAddresses"
        action={
          canAdd
            ? {
                label: t("ContactInfo.Add"),
                accessibilityLabel: t("ContactInfo.AddEmail"),
                icon: <IconMailPlus size={16} stroke={colors.primary} />,
                onPress: openAddSheet,
              }
            : undefined
        }
      />

      {emails.length === 0 ? (
        <View
          style={[
            contactDetailStyles.card,
            contactDetailStyles.emptyCard,
            { backgroundColor: colors.surfaceMuted, borderColor: colors.border },
          ]}
        >
          <Text style={[contactDetailStyles.emptyText, { color: colors.textMuted }]}>{t("ContactInfo.NoEmails")}</Text>
        </View>
      ) : (
        emails.map((email, index) => {
          const typeLabel = email.type === "work" ? t("ContactInfo.TypeWork") : t("ContactInfo.TypeHome");
          const accessibilityLabel = `${typeLabel} email, ${email.value}${email.preferred ? `, ${t("ContactInfo.Preferred")}` : ""}`;

          return (
            <ContactChannelRow
              key={`${email.value}-${index}`}
              primaryLabel={email.value}
              type={email.type}
              isPreferred={email.preferred}
              channelIcon={<IconMail size={16} stroke={colors.iconSecondary} />}
              menuAccessibilityLabel={t("ContactInfo.EmailAddresses")}
              accessibilityLabel={accessibilityLabel}
              accessibilityHint="Double tap to send email. Long press to copy."
              onPress={() => openEmailMailto(email, showToast, errorTitle)}
              onLongPress={() => {
                void copyEmailToClipboard(email, showToast, copyMessages);
              }}
              menuItems={[
                {
                  id: "email",
                  label: t("ContactInfo.SendEmailAction"),
                  hint: t("ContactInfo.MenuHintPress"),
                  icon: <IconMail size={18} stroke={colors.iconPrimary} />,
                  disabled: !email.value.trim(),
                  onPress: () => openEmailMailto(email, showToast, errorTitle),
                },
                {
                  id: "copy",
                  label: t("ContactInfo.CopyAction"),
                  hint: t("ContactInfo.MenuHintHold"),
                  icon: <IconCopy size={18} stroke={colors.iconPrimary} />,
                  disabled: !email.value.trim(),
                  onPress: () => {
                    void copyEmailToClipboard(email, showToast, copyMessages);
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
                  disabled: email.preferred,
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

      <EditEmailSheet
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
