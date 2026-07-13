/**
 * Webapp Bridge Content Script Entry Point (WXT)
 */
import { defineContentScript } from "#imports";
import { installWebappBridge } from "../../features/webapp-bridge";

export default defineContentScript({
  main() {
    installWebappBridge();
  },
  matches: ["https://app.usebondery.com/*", "http://localhost/*"],
  runAt: "document_idle",
});
