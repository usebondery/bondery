import { browser } from "wxt/browser";
import {
  hrefWebapp,
  hrefWebappHome,
  hrefWebappPerson,
  hrefWebappPersonAddInteraction,
} from "./hrefWebapp";

function resolveWebappUrl(pathOrAbsoluteUrl: string): string {
  if (/^https?:\/\//i.test(pathOrAbsoluteUrl)) {
    return pathOrAbsoluteUrl;
  }
  return hrefWebapp(pathOrAbsoluteUrl);
}

/** Open a webapp path (or absolute URL) in a new tab — popup / background. */
export function openWebappTab(pathOrAbsoluteUrl: string) {
  return browser.tabs.create({ url: resolveWebappUrl(pathOrAbsoluteUrl) });
}

/** Open a webapp path via `window.open` — content scripts (no tabs API needed). */
export function openWebappWindow(pathOrAbsoluteUrl: string): Window | null {
  return window.open(resolveWebappUrl(pathOrAbsoluteUrl), "_blank");
}

export function openWebappHomeTab() {
  return openWebappTab(hrefWebappHome());
}

export function openWebappPersonTab(personId: string) {
  return openWebappTab(hrefWebappPerson(personId));
}

export function openWebappPersonAddInteractionTab(personId: string) {
  return openWebappTab(hrefWebappPersonAddInteraction(personId));
}

export function openWebappPersonWindow(personId: string): Window | null {
  return openWebappWindow(hrefWebappPerson(personId));
}
