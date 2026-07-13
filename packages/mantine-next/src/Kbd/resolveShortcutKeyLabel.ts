import type { UseOSReturnValue } from "@mantine/hooks";

export type ShortcutKeyToken =
  | "mod"
  | "ctrl"
  | "meta"
  | "cmd"
  | "command"
  | "control"
  | "shift"
  | "alt"
  | "option"
  | "enter"
  | "return"
  | "esc"
  | "escape"
  | "tab"
  | "backspace"
  | "delete"
  | "up"
  | "down"
  | "left"
  | "right"
  | (string & {});

const APPLE_OS = new Set<UseOSReturnValue>(["macos", "ios"]);

function isAppleOs(os: UseOSReturnValue): boolean {
  return APPLE_OS.has(os);
}

/** Maps a shortcut token to a display label for the given OS. */
export function resolveShortcutKeyLabel(token: ShortcutKeyToken, os: UseOSReturnValue): string {
  const lower = token.toLowerCase();
  const apple = isAppleOs(os);

  switch (lower) {
    case "mod":
    case "meta":
    case "cmd":
    case "command":
      return apple ? "⌘" : "Ctrl";
    case "ctrl":
    case "control":
      return "Ctrl";
    case "shift":
      return apple ? "⇧" : "Shift";
    case "alt":
    case "option":
      return apple ? "⌥" : "Alt";
    case "enter":
    case "return":
      return apple ? "↩" : "Enter";
    case "esc":
    case "escape":
      return "Esc";
    case "tab":
      return "Tab";
    case "backspace":
      return apple ? "⌫" : "Backspace";
    case "delete":
      return apple ? "⌦" : "Del";
    case "up":
      return "↑";
    case "down":
      return "↓";
    case "left":
      return "←";
    case "right":
      return "→";
    default:
      return token.length === 1 ? token.toUpperCase() : token;
  }
}

/** Parses `mod+k`-style shortcut strings into display tokens for `Kbd`. */
export function parseShortcutKeys(hotkey: string): ShortcutKeyToken[] {
  return hotkey
    .split("+")
    .map((part) => part.trim())
    .filter(Boolean) as ShortcutKeyToken[];
}
