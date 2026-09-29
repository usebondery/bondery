import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { isChatRoute } from "./isChatRoute";

export const LAST_BROWSE_PATH_STORAGE_KEY = "bondery:last-browse-path";

export function rememberBrowsePath(pathname: string): void {
  if (isChatRoute(pathname)) {
    return;
  }

  try {
    sessionStorage.setItem(LAST_BROWSE_PATH_STORAGE_KEY, pathname);
  } catch {
    // Private browsing / disabled storage.
  }
}

export function readLastBrowsePath(): string {
  try {
    const stored = sessionStorage.getItem(LAST_BROWSE_PATH_STORAGE_KEY);
    if (stored?.startsWith("/") && !isChatRoute(stored)) {
      return stored;
    }
  } catch {
    // Private browsing / disabled storage.
  }

  return WEBAPP_ROUTES.HOME;
}
