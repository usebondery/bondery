/**
 * Webapp Bridge Content Script Entry Point (WXT)
 */
import { defineContentScript } from "#imports";
import { installWebappBridge } from "../../features/webapp-bridge";
import { webappContentMatches } from "../../lib/webapp-content-matches";

export default defineContentScript({
  main() {
    installWebappBridge();
  },
  matches: webappContentMatches(),
  runAt: "document_idle",
});
