import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import FacebookButton from "./FacebookButton";
import { MantineWrapper } from "../shared/MantineWrapper";

function getFacebookSnapshot() {
  const username = getFacebookUsername();
  if (!username) return null;

  const allH1s = document.querySelectorAll("h1");
  let fullName = username;
  for (const h1 of Array.from(allH1s)) {
    const text = h1.textContent?.trim();
    if (!text) continue;
    if (["Notifications", "Messages", "Menu", "Settings", "Search"].includes(text)) continue;
    if (h1.closest('[role="article"]')) continue;
    fullName = text;
    break;
  }

  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] ?? username;
  const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : undefined;
  const middleName =
    nameParts.length > 2 ? nameParts.slice(1, nameParts.length - 1).join(" ") : undefined;

  const image = document.querySelector("svg image[xlink\\:href]") as SVGImageElement | null;
  const profileImageUrl = image?.getAttribute("xlink:href") || undefined;

  return {
    platform: "facebook" as const,
    handle: username,
    firstName,
    middleName,
    lastName,
    profileImageUrl,
  };
}

// Extract Facebook username from URL
function getFacebookUsername(): string | null {
  const pathname = window.location.pathname;

  // Handle different Facebook URL patterns
  // /username or /profile.php?id=123456
  if (pathname.startsWith("/profile.php")) {
    const params = new URLSearchParams(window.location.search);
    return params.get("id");
  }

  const match = pathname.match(/^\/([^\/]+)\/?$/);

  if (
    match &&
    match[1] &&
    !["marketplace", "groups", "watch", "gaming", "pages", "events", "messages"].includes(match[1])
  ) {
    return match[1];
  }

  return null;
}

// Find the target section and inject the button
function injectBonderyButton() {
  const username = getFacebookUsername();

  console.log("Bondery Facebook: Attempting to inject button", { username });

  if (!username) {
    console.log("Bondery Facebook: No username found in URL");
    return;
  }

  const targetSection = document.querySelector(
    ".x1ifrov1.x1i1uccp.x1stjdt1.x1yaem6q.x4ckvhe.x2k3zez.xjbssrd.x1ltux0g.xrafsqe.xc9uqle.x17quhge",
  );

  console.log("Bondery Facebook: Target section found:", !!targetSection, targetSection);

  if (!targetSection) {
    console.log(
      "Bondery Facebook: Target section not found. Searching for alternative selectors...",
    );
    return;
  }

  // Check if button already exists
  if (document.querySelector("#bondery-fb-button-root")) {
    return;
  }

  // Create container for React component
  const container = document.createElement("div");
  container.id = "bondery-fb-button-root";
  targetSection.appendChild(container);

  // Render React component
  const root = ReactDOM.createRoot(container);
  root.render(
    <StrictMode>
      <MantineWrapper>
        <FacebookButton username={username} />
      </MantineWrapper>
    </StrictMode>,
  );

  console.log("Bondery Extension: Button injected successfully on Facebook");
}

// Observe DOM changes
function setupObserver() {
  const observer = new MutationObserver(() => {
    const username = getFacebookUsername();
    if (username && !document.querySelector("#bondery-fb-button-root")) {
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
  // Safety check: only run on Facebook
  if (!window.location.hostname.includes("facebook.com")) {
    return;
  }

  console.log("Bondery Extension: Initializing Facebook integration");

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
    sendResponse(getFacebookSnapshot());
  }
});

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", init);
} else {
  init();
}
