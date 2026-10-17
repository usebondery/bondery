import { combinePhoneNumber } from "@bondery/helpers/phone";
import type { EmailEntry, PhoneEntry } from "@bondery/schemas";
import { Linking } from "react-native";
import { copyToClipboard } from "../../lib/clipboard/copyToClipboard";
import { notifications } from "../../lib/toast/notifications";
import { formatDisplayPhone } from "./contactUtils";

export function openPhoneCall(phone: PhoneEntry, errorTitle: string) {
  if (!phone.value.trim()) {
    return;
  }

  Linking.openURL(`tel:${phone.prefix}${phone.value}`).catch(() => {
    notifications.show({
      message: "Could not open phone dialer",
      title: errorTitle,
      type: "error",
    });
  });
}

export function openPhoneSms(phone: PhoneEntry, errorTitle: string) {
  if (!phone.value.trim()) {
    return;
  }

  Linking.openURL(`sms:${phone.prefix}${phone.value}`).catch(() => {
    notifications.show({
      message: "Could not open messages",
      title: errorTitle,
      type: "error",
    });
  });
}

export function openEmailMailto(email: EmailEntry, errorTitle: string) {
  if (!email.value.trim()) {
    return;
  }

  Linking.openURL(`mailto:${email.value}`).catch(() => {
    notifications.show({
      message: "Could not open email app",
      title: errorTitle,
      type: "error",
    });
  });
}

export async function copyPhoneToClipboard(
  phone: PhoneEntry,
  messages: { successTitle: string; successDescription: string; errorTitle: string },
) {
  const text = combinePhoneNumber(phone.prefix || "+1", phone.value);
  if (!phone.value.trim()) {
    return;
  }

  await copyToClipboard(formatDisplayPhone(phone) || text, {
    errorDescription: "Could not copy phone number",
    errorHeadline: messages.errorTitle,
    successDescription: messages.successDescription,
    successHeadline: messages.successTitle,
  });
}

export async function copyEmailToClipboard(
  email: EmailEntry,
  messages: { successTitle: string; successDescription: string; errorTitle: string },
) {
  if (!email.value.trim()) {
    return;
  }

  await copyToClipboard(email.value.trim(), {
    errorDescription: "Could not copy email address",
    errorHeadline: messages.errorTitle,
    successDescription: messages.successDescription,
    successHeadline: messages.successTitle,
  });
}
