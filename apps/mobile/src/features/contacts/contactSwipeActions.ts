import type { Contact } from "@bondery/schemas";
import type { SwipeAction } from "../../lib/preferences/useMobilePreferences";
import type { ShowAppToastInput } from "../../lib/toast/useAppToast";
import { openEmailMailto, openPhoneCall, openPhoneSms } from "./contactChannelActions";
import { getPrimaryEmailEntry, getPrimaryPhoneEntry } from "./contactUtils";

export function executeContactSwipeAction(
  contact: Contact,
  action: SwipeAction,
  showToast: (input: ShowAppToastInput) => void,
  messages: {
    missingPhone: string;
    missingEmail: string;
    errorTitle: string;
  },
) {
  if (action === "email") {
    const email = getPrimaryEmailEntry(contact);

    if (!email) {
      showToast({
        type: "neutral",
        headline: messages.missingEmail,
      });
      return;
    }

    openEmailMailto(email, showToast, messages.errorTitle);
    return;
  }

  const phone = getPrimaryPhoneEntry(contact);

  if (!phone) {
    showToast({
      type: "neutral",
      headline: messages.missingPhone,
    });
    return;
  }

  if (action === "call") {
    openPhoneCall(phone, showToast, messages.errorTitle);
    return;
  }

  openPhoneSms(phone, showToast, messages.errorTitle);
}
