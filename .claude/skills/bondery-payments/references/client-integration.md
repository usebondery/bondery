# Client integration

Webapp uses `@stripe/stripe-js`:

1. `POST /api/subscriptions/checkout` with `{ interval: "month" | "year" }`
2. `loadStripe(publishableKey)` from runtime config
3. `stripe.initEmbeddedCheckout({ clientSecret })` → mount in modal
4. Poll `GET /api/subscriptions` until `plan === "premium"`

`UpgradeButton` shows interval selector and disables when `upgradesEnabled === false`.

`PaymentFailureModal` blocks UI when `paymentBlocked === true`.
