import type { ContactSocialFieldKey } from "@bondery/helpers";
import type {
  Contact,
  ContactAddressEntry,
  EmailEntry,
  ImportantDate,
  PhoneEntry,
} from "@bondery/schemas";
import { firstZodErrorMessage, replaceImportantDatesSchema } from "@bondery/schemas";
import { useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Linking } from "react-native";
import {
  deleteContact,
  putContactImportantDates,
  updateContact,
} from "../../../lib/domains/contacts";
import { useMobileTranslations } from "../../../lib/i18n/useMobileTranslations";
import { ShareUnavailableError, shareContactVCard } from "../../../lib/share/shareContactVCard";
import { useAppToast } from "../../../lib/toast/useAppToast";
import { normalizeEmailsForSave, normalizePhonesForSave } from "../contactChannelConstants";
import { formatContactName } from "../contactUtils";

interface UseContactDetailHandlersOptions {
  contact: Contact;
  isMyselfMode: boolean;
  onContactUpdated: () => void;
}

export function useContactDetailHandlers({
  contact,
  isMyselfMode,
  onContactUpdated,
}: UseContactDetailHandlersOptions) {
  const router = useRouter();
  const t = useMobileTranslations();
  const { showToast } = useAppToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isShareEmailSheetOpen, setShareEmailSheetOpen] = useState(false);
  const [isIdentitySheetOpen, setIdentitySheetOpen] = useState(false);

  const name = formatContactName(contact);

  const shareContact = useCallback(() => {
    void (async () => {
      setIsSharing(true);

      try {
        await shareContactVCard({
          contact,
          contactId: contact.id,
          dialogTitle: name,
        });
      } catch (err) {
        if (err instanceof ShareUnavailableError) {
          showToast({
            headline: t("ShareUnavailable", { ns: "MobileContactDetail" }),
            type: "error",
          });
          return;
        }

        showToast({
          description: t("ShareFailedDescription", { ns: "MobileContactDetail" }),
          headline: t("ShareFailed", { ns: "MobileContactDetail" }),
          type: "error",
        });
      } finally {
        setIsSharing(false);
      }
    })();
  }, [contact, name, showToast, t]);

  const handleDeleteContact = useCallback(() => {
    void (async () => {
      setIsDeleting(true);

      try {
        deleteContact(contact.id, contact.updatedAt ?? undefined);
        setDeleteConfirmOpen(false);
        router.back();
      } catch {
        showToast({
          description: t("DeleteFailed", { ns: "MobileContactDetail" }),
          headline: t("feedback.errorTitle", { ns: "common" }),
          type: "error",
        });
      } finally {
        setIsDeleting(false);
      }
    })();
  }, [contact.id, contact.updatedAt, router, showToast, t]);

  const handleUpdateSocial = useCallback(
    (platform: ContactSocialFieldKey, value: string) => {
      updateContact(
        contact.id,
        {
          [platform]: value,
        },
        contact.updatedAt ?? undefined,
      );
      onContactUpdated();
    },
    [contact.id, contact.updatedAt, onContactUpdated],
  );

  const handleSavePhones = useCallback(
    (nextPhones: PhoneEntry[]) => {
      updateContact(
        contact.id,
        {
          phones: normalizePhonesForSave(nextPhones),
        },
        contact.updatedAt ?? undefined,
      );
      onContactUpdated();
    },
    [contact.id, contact.updatedAt, onContactUpdated],
  );

  const handleSaveEmails = useCallback(
    (nextEmails: EmailEntry[]) => {
      updateContact(
        contact.id,
        {
          emails: normalizeEmailsForSave(nextEmails),
        },
        contact.updatedAt ?? undefined,
      );
      onContactUpdated();
    },
    [contact.id, contact.updatedAt, onContactUpdated],
  );

  const handleSaveAddresses = useCallback(
    (nextAddresses: ContactAddressEntry[]) => {
      updateContact(
        contact.id,
        {
          addresses: nextAddresses,
        },
        contact.updatedAt ?? undefined,
      );
      onContactUpdated();
    },
    [contact.id, contact.updatedAt, onContactUpdated],
  );

  const openPhone = useCallback(
    (phone: PhoneEntry) => {
      Linking.openURL(`tel:${phone.prefix}${phone.value}`).catch(() => {
        showToast({
          description: "Could not open phone dialer",
          headline: t("feedback.errorTitle", { ns: "common" }),
          type: "error",
        });
      });
    },
    [showToast, t],
  );

  const openSms = useCallback(
    (phone: PhoneEntry) => {
      Linking.openURL(`sms:${phone.prefix}${phone.value}`).catch(() => {
        showToast({
          description: "Could not open messages",
          headline: t("feedback.errorTitle", { ns: "common" }),
          type: "error",
        });
      });
    },
    [showToast, t],
  );

  const openEmail = useCallback(
    (email: EmailEntry) => {
      Linking.openURL(`mailto:${email.value}`).catch(() => {
        showToast({
          description: "Could not open email app",
          headline: t("feedback.errorTitle", { ns: "common" }),
          type: "error",
        });
      });
    },
    [showToast, t],
  );

  const handleSaveImportantDates = useCallback(
    (nextDates: ImportantDate[]): Promise<void> => {
      const payload = nextDates
        .filter((entry) => entry.date)
        .map((entry) => ({
          date: entry.date,
          id: entry.id || undefined,
          note: entry.note,
          notifyDaysBefore: entry.notifyDaysBefore ?? null,
          type: entry.type,
        }));

      const parsed = replaceImportantDatesSchema.safeParse(payload);
      if (!parsed.success) {
        throw new Error(firstZodErrorMessage(parsed.error));
      }

      putContactImportantDates(contact.id, parsed.data);
      onContactUpdated();
      return Promise.resolve();
    },
    [contact.id, onContactUpdated],
  );

  const openNotesEditor = useCallback(() => {
    if (isMyselfMode) {
      router.push("/myself/notes");
    } else {
      router.push(`/contact/${contact.id}/notes`);
    }
  }, [contact.id, isMyselfMode, router]);

  return {
    handleDeleteContact,
    handleSaveAddresses,
    handleSaveEmails,
    handleSaveImportantDates,
    handleSavePhones,
    handleUpdateSocial,
    isDeleteConfirmOpen,
    isDeleting,
    isIdentitySheetOpen,
    isShareEmailSheetOpen,
    isSharing,
    name,
    openEmail,
    openNotesEditor,
    openPhone,
    openSms,
    setDeleteConfirmOpen,
    setIdentitySheetOpen,
    setShareEmailSheetOpen,
    shareContact,
  };
}
