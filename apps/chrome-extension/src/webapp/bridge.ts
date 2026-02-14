const EXTENSION_PING_TYPE = "BONDERY_EXTENSION_PING";
const EXTENSION_PONG_TYPE = "BONDERY_EXTENSION_PONG";

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
