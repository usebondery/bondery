# Stripe product model

```
Product: Bondery Premium
├── Price: premium_monthly (month, trial_period_days=15)
└── Price: premium_annual  (year, trial_period_days=15)
```

Checkout session:

- `ui_mode: "embedded"`
- `mode: "subscription"`
- `allow_promotion_codes: true`
- `subscription_data.trial_period_days: 15`
- `metadata.bondery_user_id` on session and subscription

Student discount: Stripe Promotion Code at checkout (no third-party verification).
