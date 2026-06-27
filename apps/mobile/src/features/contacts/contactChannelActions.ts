import { Linking } from "react-native";
import type { EmailEntry, PhoneEntry } from "@bondery/schemas";
import { combinePhoneNumber } from "@bondery/helpers/phone";
import type { ShowAppToastInput } from "../../lib/toast/useAppToast";
import { copyToClipboard } from "../../lib/clipboard/copyToClipboard";
import { formatDisplayPhone } from "./contactUtils";

type ShowToast = (options: ShowAppToastInput) => void;

export function openPhoneCall(phone: PhoneEntry, showToast: ShowToast, errorTitle: string) {
  if (!phone.value.trim()) return;

  Linking.openURL(`tel:${phone.prefix}${phone.value}`).catch(() => {
    showToast({
      type: "error",
      headline: errorTitle,
      description: "Could not open phone dialer",
    });
  });
}

export function openPhoneSms(phone: PhoneEntry, showToast: ShowToast, errorTitle: string) {
  if (!phone.value.trim()) return;

  Linking.openURL(`sms:${phone.prefix}${phone.value}`).catch(() => {
    showToast({
      type: "error",
      headline: errorTitle,
      description: "Could not open messages",
    });
  });
}

export function openEmailMailto(email: EmailEntry, showToast: ShowToast, errorTitle: string) {
  if (!email.value.trim()) return;

  Linking.openURL(`mailto:${email.value}`).catch(() => {
    showToast({
      type: "error",
      headline: errorTitle,
      description: "Could not open email app",
    });
  });
}

export async function copyPhoneToClipboard(
  phone: PhoneEntry,
  showToast: ShowToast,
  messages: { successTitle: string; successDescription: string; errorTitle: string },
) {
  const text = combinePhoneNumber(phone.prefix || "+1", phone.value);
  if (!phone.value.trim()) return;

  await copyToClipboard(formatDisplayPhone(phone) || text, showToast, {
    successHeadline: messages.successTitle,
    successDescription: messages.successDescription,
    errorHeadline: messages.errorTitle,
    errorDescription: "Could not copy phone number",
  });
}

export async function copyEmailToClipboard(
  email: EmailEntry,
  showToast: ShowToast,
  messages: { successTitle: string; successDescription: string; errorTitle: string },
) {
  if (!email.value.trim()) return;

  await copyToClipboard(email.value.trim(), showToast, {
    successHeadline: messages.successTitle,
    successDescription: messages.successDescription,
    errorHeadline: messages.errorTitle,
    errorDescription: "Could not copy email address",
  });
}
