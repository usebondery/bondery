import * as Clipboard from "expo-clipboard";
import { notifications } from "../toast/notifications";

export async function copyToClipboard(
  text: string,
  options: {
    successHeadline: string;
    successDescription?: string;
    errorHeadline: string;
    errorDescription: string;
  },
): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    notifications.show({
      message: options.successDescription ?? text,
      title: options.successHeadline,
      type: "success",
    });
    return true;
  } catch {
    notifications.show({
      message: options.errorDescription,
      title: options.errorHeadline,
      type: "error",
    });
    return false;
  }
}
