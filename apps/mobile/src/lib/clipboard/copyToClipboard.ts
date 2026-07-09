import * as Clipboard from "expo-clipboard";
import type { ShowAppToastInput } from "../toast/useAppToast";

export async function copyToClipboard(
  text: string,
  showToast: (options: ShowAppToastInput) => void,
  options: {
    successHeadline: string;
    successDescription?: string;
    errorHeadline: string;
    errorDescription: string;
  },
): Promise<boolean> {
  try {
    await Clipboard.setStringAsync(text);
    showToast({
      description: options.successDescription ?? text,
      headline: options.successHeadline,
      type: "success",
    });
    return true;
  } catch {
    showToast({
      description: options.errorDescription,
      headline: options.errorHeadline,
      type: "error",
    });
    return false;
  }
}
