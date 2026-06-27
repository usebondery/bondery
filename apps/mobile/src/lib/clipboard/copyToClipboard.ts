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
      type: "success",
      headline: options.successHeadline,
      description: options.successDescription ?? text,
    });
    return true;
  } catch {
    showToast({
      type: "error",
      headline: options.errorHeadline,
      description: options.errorDescription,
    });
    return false;
  }
}
