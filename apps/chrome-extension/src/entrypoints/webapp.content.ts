import { defineContentScript } from "wxt/utils/define-content-script";

const EXTENSION_PING_TYPE = "BONDERY_EXTENSION_PING";
const EXTENSION_PONG_TYPE = "BONDERY_EXTENSION_PONG";

const appUrl: string = import.meta.env.NEXT_PUBLIC_WEBAPP_URL || "http://localhost:3000";

function getOriginPattern(url: string): string {
  try {
    return `${new URL(url).origin}/*`;
  } catch {
    return `${url}/*`;
  }
}

export default defineContentScript({
  matches: [getOriginPattern(appUrl)],
  main() {
    window.addEventListener("message", (event: MessageEvent) => {
      if (event.source !== window) {
        return;
      }

      if (event.data?.type !== EXTENSION_PING_TYPE) {
        return;
      }

      window.postMessage(
        {
          type: EXTENSION_PONG_TYPE,
          requestId: event.data.requestId,
          source: "bondery-extension",
        },
        "*",
      );
    });
  },
});
