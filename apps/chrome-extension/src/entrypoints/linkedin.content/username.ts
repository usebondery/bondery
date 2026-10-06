import { getLinkedInUsernameFromPathname } from "../../features/linkedin/handle";

/** Extracts the LinkedIn vanity handle from the current profile URL. */

export function getLinkedInUsername(): string | null {
  return getLinkedInUsernameFromPathname(window.location.pathname);
}
