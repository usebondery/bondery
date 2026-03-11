import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import { SOCIAL_PLATFORM_URL_DETAILS } from "@bondery/helpers";
import LinkedInButton from "./LinkedInButton";
import { MantineWrapper } from "../shared/MantineWrapper";

function getLinkedInSnapshot() {
  const username = getLinkedInUsername();
  if (!username) return null;

  const topCard = document.querySelector("section[data-member-id]") || document;
  const nameElement = topCard.querySelector("a[aria-label] > h1") || topCard.querySelector("h1");
  const fullName = nameElement?.textContent?.trim() || username;
  const nameParts = fullName.split(/\s+/).filter(Boolean);

  const firstName = nameParts[0] ?? username;
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined;
  const middleName =
    nameParts.length > 2 ? nameParts.slice(1, nameParts.length - 1).join(" ") : undefined;

  const titleElement = topCard.querySelector("div[data-generated-suggestion-target]");
  const headline = titleElement?.textContent?.trim() || undefined;

  const contactInfoLink = topCard.querySelector("#top-card-text-details-contact-info");
  const placeElement = contactInfoLink?.parentElement?.previousElementSibling || null;
  const place = placeElement?.textContent?.trim() || undefined;

  const profilePhotoImg = topCard.querySelector(
    "button[aria-label*='profile picture'] img",
  ) as HTMLImageElement | null;

  return {
    platform: "linkedin" as const,
    handle: username,
    firstName,
    middleName,
    lastName,
    profileImageUrl: profilePhotoImg?.src || undefined,
    headline,
    place,
  };
}

// Extract LinkedIn username from URL
function getLinkedInUsername(): string | null {
  const pathname = window.location.pathname;
  const match = pathname.match(/^\/in\/([^\/]+)\/?$/);

  if (match && match[1]) {
    return match[1];
  }

  return null;
}

// Find the target section and inject the button
function injectBonderyButton() {
  const username = getLinkedInUsername();

  console.log("Bondery LinkedIn: Attempting to inject button", { username });

  if (!username) {
    console.log("Bondery LinkedIn: No username found in URL");
    return;
  }

  const targetSection = (() => {
    const profileSection = document.querySelector("section[data-member-id]") || document.body;
    const messageButton = profileSection.querySelector("button[aria-label^='Message']");

    if (!messageButton) {
      return null;
    }

    let actionButtonsContainer: HTMLElement | null = messageButton.closest("div");

    while (actionButtonsContainer && actionButtonsContainer !== profileSection) {
      const hasMessage = !!actionButtonsContainer.querySelector("button[aria-label^='Message']");
      const hasMoreActions = !!actionButtonsContainer.querySelector(
        "button[aria-label='More actions']",
      );

      if (hasMessage && hasMoreActions) {
        break;
      }

      actionButtonsContainer = actionButtonsContainer.parentElement;
    }

    if (!actionButtonsContainer || actionButtonsContainer === profileSection) {
      return null;
    }

    const insertParent = actionButtonsContainer.parentElement;

    if (!insertParent) {
      return null;
    }

    const existing = insertParent.querySelector("#bondery-li-button-root");
    if (existing) {
      return existing;
    }

    const container = document.createElement("div");
    container.id = "bondery-li-button-root";
    container.style.display = "flex";
    container.style.flexDirection = "column";

    insertParent.insertBefore(container, actionButtonsContainer.nextSibling);
    return container;
  })();

  console.log("Bondery LinkedIn: Target section found:", !!targetSection, targetSection);

  if (!targetSection) {
    console.log("Bondery LinkedIn: Target section not found.");
    return;
  }

  // Render React component
  const root = ReactDOM.createRoot(targetSection);
  root.render(
    <StrictMode>
      <MantineWrapper>
        <LinkedInButton username={username} />
      </MantineWrapper>
    </StrictMode>,
  );

  console.log("Bondery Extension: Button injected successfully on LinkedIn");
}

// Observe DOM changes
function setupObserver() {
  const observer = new MutationObserver(() => {
    const username = getLinkedInUsername();
    if (username && !document.querySelector("#bondery-li-button-root")) {
      injectBonderyButton();
    }
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return observer;
}

// Initialize
function init() {
  // Safety check: only run on LinkedIn
  if (!window.location.hostname.includes(SOCIAL_PLATFORM_URL_DETAILS.linkedin.domain)) {
    return;
  }

  console.log("Bondery Extension: Initializing LinkedIn integration");

  injectBonderyButton();
  setupObserver();

  setTimeout(() => {
    injectBonderyButton();
  }, 2000);

  // Listen for URL changes
  let lastUrl = window.location.href;
  setInterval(() => {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      setTimeout(() => {
        injectBonderyButton();
      }, 1000);
    }
  }, 500);
}

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message?.type === "GET_SCRAPED_PROFILE") {
    sendResponse(getLinkedInSnapshot());
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
