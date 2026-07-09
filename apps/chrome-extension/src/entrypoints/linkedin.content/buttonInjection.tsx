import type ReactDOM from "react-dom/client";
import type { ShadowRootContentScriptUi } from "wxt/utils/content-script-ui/shadow-root";
import type { ContentScriptContext } from "#imports";
import { getTopcard } from "../../features/linkedin/scrape/sduiProfile";
import LinkedInButton from "../../features/linkedin/ui/LinkedInButton";
import { extLog } from "../../lib/log";
import { renderInShadowRoot } from "../../lib/ui";
import { getLinkedInUsername } from "./username";

let currentUi: ShadowRootContentScriptUi<ReactDOM.Root> | null = null;
let currentInjectedUsername: string | null = null;
let isInjecting = false;

/**
 * Removes the injected button when SPA navigation lands on a different profile.
 */
export function clearStaleButtonIfNeeded(newUsername: string | null): void {
  if (currentUi && currentInjectedUsername !== newUsername) {
    currentUi.remove();
    currentUi = null;
    currentInjectedUsername = null;
  }
}

/**
 * Returns a reference button from the LinkedIn profile action bar, using a
 * cascade of selectors from most-specific to most-generic to remain language-agnostic.
 *
 * LinkedIn's aria-labels are localised. Relying solely on `aria-label^='Message'`
 * breaks for non-English browser locales (e.g. macOS Chrome picks up the system
 * language). We therefore try several strategies in order:
 *   1. Data-control-name attribute (stable across locales)
 *   2. English aria-label (most users)
 *   3. artdeco-button class: LinkedIn's CTA action buttons (Follow, Message, Connect,
 *      More…) always carry the `artdeco-button` CSS class, while the inline company /
 *      school shortcut buttons in the top card do NOT. Filtering on this class ensures
 *      we skip those shortcut buttons and land on the real action row.
 */
function getProfileScope(): Element {
  return getTopcard() ?? document.body;
}

function findProfileActionButton(): HTMLButtonElement | null {
  const profileSection = getProfileScope();

  const byControlName = profileSection.querySelector<HTMLButtonElement>(
    'button[data-control-name="message"]',
  );
  if (byControlName) {
    return byControlName;
  }

  const byEnglishLabel = profileSection.querySelector<HTMLButtonElement>(
    "button[aria-label^='Message']",
  );
  if (byEnglishLabel) {
    return byEnglishLabel;
  }

  const artdecoButtons = Array.from(
    profileSection.querySelectorAll<HTMLButtonElement>("button.artdeco-button"),
  ).filter((btn) => {
    if (btn.closest("[class*='nt-edge']")) {
      return false;
    }
    return true;
  });

  const firstArtdeco = artdecoButtons.find((btn) => !!btn.textContent?.trim());
  if (firstArtdeco) {
    return firstArtdeco;
  }

  const allButtons = Array.from(
    profileSection.querySelectorAll<HTMLButtonElement>("button"),
  ).filter((btn) => !btn.closest("[class*='nt-edge']"));

  return allButtons.find((btn) => !!btn.textContent?.trim()) ?? null;
}

/**
 * Finds the LinkedIn action buttons container and returns it so the Bondery
 * button can be inserted immediately after it.
 */
function findLinkedInAnchor(): Element | null {
  const profileSection = getProfileScope();
  const referenceButton = findProfileActionButton();

  if (!referenceButton) {
    return null;
  }

  let actionButtonsContainer: HTMLElement | null = referenceButton.closest("div");

  while (actionButtonsContainer && actionButtonsContainer !== profileSection) {
    const buttonCount = Array.from(
      actionButtonsContainer.querySelectorAll<HTMLButtonElement>("button.artdeco-button"),
    ).filter((b) => !b.closest("[class*='nt-edge']")).length;
    if (buttonCount >= 2) {
      break;
    }
    actionButtonsContainer = actionButtonsContainer.parentElement;
  }

  if (!actionButtonsContainer || actionButtonsContainer === profileSection) {
    return referenceButton.parentElement;
  }

  return actionButtonsContainer;
}

export async function injectBonderyButton(ctx: ContentScriptContext) {
  if (isInjecting) {
    return;
  }

  const username = getLinkedInUsername();

  extLog.debug("Bondery LinkedIn: Attempting to inject button", { username });

  if (!username) {
    extLog.debug("Bondery LinkedIn: No username found in URL");
    return;
  }

  const anchor = findLinkedInAnchor();

  extLog.debug("Bondery LinkedIn: Target section found:", !!anchor, anchor);

  if (!anchor) {
    extLog.debug("Bondery LinkedIn: Target section not found.");
    return;
  }

  // If button already exists for this exact username, nothing to do.
  // If it exists for a different username (SPA navigation), remove and re-inject.
  if (document.querySelector("bondery-linkedin")) {
    if (currentInjectedUsername === username) {
      return;
    }
    // Different profile — tear down the stale button before re-injecting.
    if (currentUi) {
      currentUi.remove();
      currentUi = null;
      currentInjectedUsername = null;
    }
  }

  // Remove previous shadow root UI if navigating between profiles
  if (currentUi) {
    currentUi.remove();
    currentUi = null;
    currentInjectedUsername = null;
  }

  isInjecting = true;
  try {
    currentUi = await renderInShadowRoot(ctx, {
      anchor,
      append: "after",
      name: "bondery-linkedin",
      position: "inline",
      render: () => <LinkedInButton username={username} />,
    });
    currentInjectedUsername = username;
    extLog.debug("Bondery Extension: Button injected successfully on LinkedIn");
  } finally {
    isInjecting = false;
  }
}

export function setupObserver(ctx: ContentScriptContext) {
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;

  const observer = new MutationObserver(() => {
    if (!ctx.isValid) {
      observer.disconnect();
      return;
    }

    // LinkedIn's profile page is ready when the profile section has at least one
    // artdeco-button (the primary CTA). Using the artdeco-button class avoids a
    // false-positive on the company/school shortcut buttons that appear earlier
    // in the DOM and don't use that class.
    if (
      !getTopcard()?.querySelector("button.artdeco-button, button[data-control-name='message']")
    ) {
      return;
    }

    // Debounce: wait for DOM mutations to settle before trying to inject
    if (debounceTimer !== null) {
      clearTimeout(debounceTimer);
    }
    debounceTimer = setTimeout(() => {
      debounceTimer = null;
      const username = getLinkedInUsername();
      if (username && !document.querySelector("bondery-linkedin")) {
        injectBonderyButton(ctx);
      }
    }, 300);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}

/**
 * Waits for the LinkedIn profile page to be ready by watching for the Message button.
 *
 * @param timeoutMs Maximum time to wait in milliseconds.
 */
function isProfileReady(): boolean {
  const topcard = getTopcard();
  if (!topcard) {
    return false;
  }
  return !!findProfileActionButton();
}

export function _waitForProfileReady(timeoutMs: number): Promise<void> {
  return new Promise((resolve) => {
    if (isProfileReady()) {
      resolve();
      return;
    }

    const observer = new MutationObserver(() => {
      if (isProfileReady()) {
        observer.disconnect();
        clearTimeout(timeoutId);
        resolve();
      }
    });

    const timeoutId = setTimeout(() => {
      observer.disconnect();
      resolve();
    }, timeoutMs);

    observer.observe(document.body, { childList: true, subtree: true });
  });
}
