// Minimal Bondery service worker
// Required for PWA installability (Chrome requires a registered SW).
// No fetch handler — all network requests flow through unchanged.

self.addEventListener("install", (event) => {
  // Take control immediately without waiting for existing tabs to close
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  // Claim all existing clients so the new SW takes effect without a reload
  event.waitUntil(self.clients.claim());
});
