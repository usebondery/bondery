import { IconMail, IconMessage, IconPhone } from "@tabler/icons-react-native";
import type { ReactNode } from "react";
import type { SwipeAction } from "./useMobilePreferences";

export function getSwipeActionIcon(action: SwipeAction, stroke: string, size = 16): ReactNode {
  if (action === "call") {
    return <IconPhone size={size} stroke={stroke} />;
  }

  if (action === "email") {
    return <IconMail size={size} stroke={stroke} />;
  }

  return <IconMessage size={size} stroke={stroke} />;
}

export function getSwipeActionLabel(
  action: SwipeAction,
  texts: { call: string; message: string; email: string },
): string {
  switch (action) {
    case "call":
      return texts.call;
    case "email":
      return texts.email;
    default:
      return texts.message;
  }
}
