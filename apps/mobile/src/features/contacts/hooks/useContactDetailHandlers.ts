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
import { useState } from "react";
import { Linking } from "react-native";
import {
  useCommonTranslations,
  useMobileContactDetailTranslations,
} from "@/lib/i18n/generated/hooks";
import {
  deleteContact,
  putContactImportantDates,
  updateContact,
} from "../../../lib/domains/contacts";
import { useSheetLocalAction } from "../../../lib/forms/useSheetLocalAction";
import { goBackOrReplace } from "../../../lib/navigation/goBackOrReplace";
import { useAppNavigation } from "../../../lib/navigation/useAppNavigation";
import { ShareUnavailableError, shareContactVCard } from "../../../lib/share/shareContactVCard";
import { notifications } from "../../../lib/toast/notifications";
import { useShowErrorToast } from "../../../lib/toast/useShowErrorToast";
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
  const tMobileContactDetail = useMobileContactDetailTranslations();
  const t = useCommonTranslations();
  const router = useRouter();
  const { openContactNotes, openMyselfNotes } = useAppNavigation();
  const showErrorToast = useShowErrorToast();
  const [isSharing, setIsSharing] = useState(false);
  const [isDeleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [isShareEmailSheetOpen, setShareEmailSheetOpen] = useState(false);
  const [isIdentitySheetOpen, setIdentitySheetOpen] = useState(false);

  const name = formatContactName(contact);

  function shareContact() {
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
          notifications.show({
            title: tMobileContactDetail("ShareUnavailable"),
            type: "error",
          });
          return;
        }

        showErrorToast(err, tMobileContactDetail("ShareFailed"));
      } finally {
        setIsSharing(false);
      }
    })();
  }

  function handleCloseDeleteConfirm() {
    setDeleteConfirmOpen(false);
  }

  function performDeleteContact() {
    deleteContact(contact.id, contact.updatedAt ?? undefined);
  }

  function handleDeleteSuccess() {
    goBackOrReplace(router, "/contacts");
  }

  function handleDeleteError(error: unknown) {
    showErrorToast(error);
  }

  const { isSubmitting: isDeleting, submit: submitDelete } = useSheetLocalAction({
    onClose: handleCloseDeleteConfirm,
    onError: handleDeleteError,
    onSuccess: handleDeleteSuccess,
    perform: performDeleteContact,
  });

  function handleUpdateSocial(platform: ContactSocialFieldKey, value: string) {
    updateContact(
      contact.id,
      {
        [platform]: value,
      },
      contact.updatedAt ?? undefined,
    );
    onContactUpdated();
  }

  function handleSavePhones(nextPhones: PhoneEntry[]) {
    updateContact(
      contact.id,
      {
        phones: normalizePhonesForSave(nextPhones),
      },
      contact.updatedAt ?? undefined,
    );
    onContactUpdated();
  }

  function handleSaveEmails(nextEmails: EmailEntry[]) {
    updateContact(
      contact.id,
      {
        emails: normalizeEmailsForSave(nextEmails),
      },
      contact.updatedAt ?? undefined,
    );
    onContactUpdated();
  }

  function handleSaveAddresses(nextAddresses: ContactAddressEntry[]) {
    updateContact(
      contact.id,
      {
        addresses: nextAddresses,
      },
      contact.updatedAt ?? undefined,
    );
    onContactUpdated();
  }

  function openPhone(phone: PhoneEntry) {
    Linking.openURL(`tel:${phone.prefix}${phone.value}`).catch(() => {
      notifications.show({
        message: "Could not open phone dialer",
        title: t("feedback.errorTitle"),
        type: "error",
      });
    });
  }

  function openSms(phone: PhoneEntry) {
    Linking.openURL(`sms:${phone.prefix}${phone.value}`).catch(() => {
      notifications.show({
        message: "Could not open messages",
        title: t("feedback.errorTitle"),
        type: "error",
      });
    });
  }

  function openEmail(email: EmailEntry) {
    Linking.openURL(`mailto:${email.value}`).catch(() => {
      notifications.show({
        message: "Could not open email app",
        title: t("feedback.errorTitle"),
        type: "error",
      });
    });
  }

  function handleSaveImportantDates(nextDates: ImportantDate[]) {
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
  }

  function openNotesEditor() {
    if (isMyselfMode) {
      openMyselfNotes();
    } else {
      openContactNotes(contact.id);
    }
  }

  return {
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
    submitDelete,
  };
}
