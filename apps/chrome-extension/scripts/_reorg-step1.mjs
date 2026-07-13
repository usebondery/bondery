import fs from "node:fs";
import path from "node:path";

const root = "C:/Users/msmar/Documents/GitHub/bondery/apps/chrome-extension/src";
const feat = path.join(root, "features/background");

// --- messaging/types.ts ---
const messagesSrc = fs.readFileSync(path.join(root, "utils/messages.ts"), "utf8");
const userSettingsBlock = `
/** Popup -> Service worker: fetch authenticated user settings */
export interface UserSettingsRequest {
  type: "USER_SETTINGS_REQUEST";
}

/** Service worker -> Popup: user settings profile */
export interface UserSettingsResponse {
  type: "USER_SETTINGS_RESPONSE";
  payload: UserSettingsProfile | { error: string; requiresAuth?: boolean };
}

import type { UserSettingsProfile } from "../api/domains/me";
`;

let typesContent = messagesSrc.replace(
  /export type ExtensionMessage =/,
  `${userSettingsBlock}\nexport type ExtensionMessage =`,
);
typesContent = typesContent.replace(
  /(\s+\| VersionCheckResponse;)/,
  "\n  | UserSettingsRequest\n  | UserSettingsResponse$1",
);
// Fix: import should be at top
typesContent = typesContent.replace(userSettingsBlock.trim(), "");
typesContent = `import type { UserSettingsProfile } from "../api/domains/me";\n\n${typesContent}`;
typesContent = typesContent.replace(
  /export type ExtensionMessage =/,
  `/** Popup -> Service worker: fetch authenticated user settings */
export interface UserSettingsRequest {
  type: "USER_SETTINGS_REQUEST";
}

/** Service worker -> Popup: user settings profile */
export interface UserSettingsResponse {
  type: "USER_SETTINGS_RESPONSE";
  payload: UserSettingsProfile | { error: string; requiresAuth?: boolean };
}

export type ExtensionMessage =`,
);
if (!typesContent.includes("UserSettingsRequest")) {
  throw new Error("failed to add UserSettings types");
}
typesContent = typesContent.replace(
  /\| VersionCheckResponse;/,
  "| VersionCheckResponse\n  | UserSettingsRequest\n  | UserSettingsResponse;",
);
fs.writeFileSync(path.join(root, "lib/messaging/types.ts"), typesContent);

// --- lib/ui ---
let render = fs.readFileSync(path.join(root, "lib/ui/renderInShadowRoot.tsx"), "utf8");
render = render.replace("./MantineWrapper", "./MantineWrapper");
if (!render.includes('from "./MantineWrapper"')) {
  render = render.replace(/from "\.\/MantineWrapper"/, 'from "./MantineWrapper"');
}
fs.writeFileSync(path.join(root, "lib/ui/renderInShadowRoot.tsx"), render);
fs.writeFileSync(
  path.join(root, "lib/ui/index.ts"),
  `export { MantineWrapper, useExtensionTheme } from "./MantineWrapper";\nexport { renderInShadowRoot } from "./renderInShadowRoot";\n`,
);

const _bg = fs.readFileSync(path.join(root, "entrypoints/background/index.ts"), "utf8");

// state.ts
fs.writeFileSync(
  path.join(feat, "state.ts"),
  `import type { PersonPreviewData } from "../../lib/messaging/types";

/** Pending person preview to show in popup (set by service worker, read by popup) */
export let pendingPreview: PersonPreviewData | null = null;

/** Lock to prevent concurrent login flows */
export let loginInProgress = false;

/** Pending enrich request (webapp -> LinkedIn tab -> background -> API -> webapp) */
export let pendingEnrich: {
  contactId: string;
  linkedinHandle: string;
  requestId: string;
  linkedinTabId: number;
  senderTabId: number;
} | null = null;

/** Debounce timer for badge indicator updates */
export let indicatorUpdateTimer: ReturnType<typeof setTimeout> | null = null;

export function setPendingPreview(value: PersonPreviewData | null): void {
  pendingPreview = value;
}

export function getAndClearPendingPreview(): PersonPreviewData | null {
  const value = pendingPreview;
  pendingPreview = null;
  return value;
}

export function setLoginInProgress(value: boolean): void {
  loginInProgress = value;
}

export function getLoginInProgress(): boolean {
  return loginInProgress;
}

export function setPendingEnrichState(
  value: typeof pendingEnrich,
): void {
  pendingEnrich = value;
}

export function getPendingEnrich(): typeof pendingEnrich {
  return pendingEnrich;
}

export function setIndicatorUpdateTimer(value: ReturnType<typeof setTimeout> | null): void {
  indicatorUpdateTimer = value;
}

export function getIndicatorUpdateTimer(): ReturnType<typeof setTimeout> | null {
  return indicatorUpdateTimer;
}
`,
);

console.log("wrote types and state");
