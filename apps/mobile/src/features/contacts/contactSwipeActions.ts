import type { Contact } from "@bondery/schemas";
import type { SwipeAction } from "../../lib/preferences/useMobilePreferences";
import { getContact } from "../../lib/sync/hooks/useSyncQuery";
import { notifications } from "../../lib/toast/notifications";
import { openEmailMailto, openPhoneCall, openPhoneSms } from "./contactChannelActions";
import { getPrimaryEmailEntry, getPrimaryPhoneEntry } from "./contactUtils";

export function executeContactSwipeAction(
  contact: Contact,
  action: SwipeAction,
  messages: {
    missingPhone: string;
    missingEmail: string;
    errorTitle: string;
  },
) {
  const hydrated = getContact(contact.id) ?? contact;

  if (action === "email") {
    const email = getPrimaryEmailEntry(hydrated);

    if (!email) {
      notifications.show({
        title: messages.missingEmail,
        type: "neutral",
      });
      return;
    }

    openEmailMailto(email, messages.errorTitle);
    return;
  }

  const phone = getPrimaryPhoneEntry(hydrated);

  if (!phone) {
    notifications.show({
      title: messages.missingPhone,
      type: "neutral",
    });
    return;
  }

  if (action === "call") {
    openPhoneCall(phone, messages.errorTitle);
    return;
  }

  openPhoneSms(phone, messages.errorTitle);
}
