import { combinePhoneNumber } from "@bondery/helpers/phone";
import type { EmailEntry, PhoneEntry } from "@bondery/schemas";
import { Linking } from "react-native";
import { copyToClipboard } from "../../lib/clipboard/copyToClipboard";
import type { ShowAppToastInput } from "../../lib/toast/useAppToast";
import { formatDisplayPhone } from "./contactUtils";

type ShowToast = (options: ShowAppToastInput) => void;

export function openPhoneCall(phone: PhoneEntry, showToast: ShowToast, errorTitle: string) {
  if (!phone.value.trim()) {
    return;
  }

  Linking.openURL(`tel:${phone.prefix}${phone.value}`).catch(() => {
    showToast({
      description: "Could not open phone dialer",
      headline: errorTitle,
      type: "error",
    });
  });
}

export function openPhoneSms(phone: PhoneEntry, showToast: ShowToast, errorTitle: string) {
  if (!phone.value.trim()) {
    return;
  }

  Linking.openURL(`sms:${phone.prefix}${phone.value}`).catch(() => {
    showToast({
      description: "Could not open messages",
      headline: errorTitle,
      type: "error",
    });
  });
}

export function openEmailMailto(email: EmailEntry, showToast: ShowToast, errorTitle: string) {
  if (!email.value.trim()) {
    return;
  }

  Linking.openURL(`mailto:${email.value}`).catch(() => {
    showToast({
      description: "Could not open email app",
      headline: errorTitle,
      type: "error",
    });
  });
}

export async function copyPhoneToClipboard(
  phone: PhoneEntry,
  showToast: ShowToast,
  messages: { successTitle: string; successDescription: string; errorTitle: string },
) {
  const text = combinePhoneNumber(phone.prefix || "+1", phone.value);
  if (!phone.value.trim()) {
    return;
  }

  await copyToClipboard(formatDisplayPhone(phone) || text, showToast, {
    errorDescription: "Could not copy phone number",
    errorHeadline: messages.errorTitle,
    successDescription: messages.successDescription,
    successHeadline: messages.successTitle,
  });
}

export async function copyEmailToClipboard(
  email: EmailEntry,
  showToast: ShowToast,
  messages: { successTitle: string; successDescription: string; errorTitle: string },
) {
  if (!email.value.trim()) {
    return;
  }

  await copyToClipboard(email.value.trim(), showToast, {
    errorDescription: "Could not copy email address",
    errorHeadline: messages.errorTitle,
    successDescription: messages.successDescription,
    successHeadline: messages.successTitle,
  });
}
