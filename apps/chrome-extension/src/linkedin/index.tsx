import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import LinkedInButton from "./LinkedInButton";
import { MantineWrapper } from "../shared/MantineWrapper";

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

    let actionButtonsContainer = messageButton.closest("div");

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
  if (!window.location.hostname.includes("linkedin.com")) {
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

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
