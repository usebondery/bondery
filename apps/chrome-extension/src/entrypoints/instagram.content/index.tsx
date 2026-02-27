import { defineContentScript } from "wxt/utils/define-content-script";
import React, { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import InstagramButton from "../../instagram/InstagramButton";
import { MantineWrapper } from "../../shared/MantineWrapper";

export default defineContentScript({
  matches: ["https://www.instagram.com/*"],
  main() {
    // Extract Instagram username from URL
    function getInstagramUsername(): string | null {
      const pathname = window.location.pathname;
      const match = pathname.match(/^\/([^\/]+)\/?$/);

      if (
        match &&
        match[1] &&
        !["explore", "reels", "stories", "direct", "accounts", "settings"].includes(match[1])
      ) {
        return match[1];
      }

      return null;
    }

    // Find the target section and inject the button
    function injectBonderyButton() {
      const username = getInstagramUsername();

      if (!username) {
        return;
      }

      const targetSection = document.querySelector(".x14vqqas");

      if (!targetSection) {
        return;
      }

      // Check if button already exists
      if (document.querySelector("#bondery-ig-button-root")) {
        return;
      }

      // Create container for React component
      const container = document.createElement("div");
      container.id = "bondery-ig-button-root";
      targetSection.appendChild(container);

      // Render React component
      const root = ReactDOM.createRoot(container);
      root.render(
        <StrictMode>
          <MantineWrapper>
            <InstagramButton username={username} />
          </MantineWrapper>
        </StrictMode>,
      );

      console.log("Bondery Extension: Button injected successfully");
    }

    // Observe DOM changes
    function setupObserver() {
      const observer = new MutationObserver(() => {
        const username = getInstagramUsername();
        if (username && !document.querySelector("#bondery-ig-button-root")) {
          injectBonderyButton();
        }
      });

      observer.observe(document.body, {
        childList: true,
        subtree: true,
      });

      return observer;
    }

    // Safety check: only run on Instagram
    if (!window.location.hostname.includes("instagram.com")) {
      return;
    }

    console.log("Bondery Extension: Initializing Instagram integration");

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
  },
});
