---
icon: key
---

# Authentication

The Bondery API supports two authentication methods depending on how you call it.

## Session authentication

Use this when building on top of the webapp or mobile app, or when you have a user's Supabase access token.

1. Sign in at [app.usebondery.com](https://app.usebondery.com).
2. The browser sends session cookies automatically, or you can send the Supabase access token in the `Authorization` header.

```bash
curl -H "Authorization: Bearer YOUR_SUPABASE_ACCESS_TOKEN" \
  https://api.usebondery.com/api/contacts
```

Session auth works on **all** authenticated endpoints, including profile settings, chat, subscriptions, and API key management.

## API keys (integrations)

Use long-lived API keys for scripts, automation tools (e.g. Zapier), and server-side integrations that should not depend on a browser session.

### Create a key

1. Open **Settings** in the webapp.
2. Go to the **API keys** section.
3. Click **Create API key**, choose a label and access level, then copy the key when it is shown.

{% hint style="warning" %}
The full key is shown **once**. Store it somewhere safe (e.g. a secrets manager). You cannot view it again later — only a masked prefix is stored for identification.
{% endhint %}

Each account can have up to **5** API keys. Deleting a key takes effect immediately.

{% hint style="info" %}
**Local development:** API env setup (`PRIVATE_API_KEY_PEPPER`, `PRIVATE_SUPABASE_JWT_SIGNING_JWK`, local `signing_keys.json`) is documented in [Local development setup → API keys](../contributing/local-setup.md#api-keys-long-lived-integration-tokens).
{% endhint %}

### Send the key

API keys use the `bondery_key_` prefix:

```
bondery_key_<keyId>_<secret>
```

Send it as a Bearer token:

```bash
curl -H "Authorization: Bearer bondery_key_abc123_your_secret_here" \
  https://api.usebondery.com/api/contacts
```

### Access levels

Access level is chosen when the key is created and **cannot be changed** afterward. Create a new key if you need a different level.

| Level | HTTP methods | Use when |
| --- | --- | --- |
| **Read only** | `GET`, `HEAD` | Listing or viewing data without creating or updating records |
| **Full access** | All methods | Integrations that create, update, or delete contacts, groups, tags, interactions, etc. |

A read-only key that tries to `POST`, `PATCH`, or `DELETE` receives **403 Forbidden**.

### Routes that accept API keys

API keys work on integration-focused routes:

- `/api/contacts` (and sub-resources)
- `/api/groups`
- `/api/tags`
- `/api/interactions`
- `/api/contacts/share`
- `/api/contacts/import/*` (LinkedIn, Instagram, vCard)
- `/api/geocode`

API keys **do not** work on:

- `/api/me/api-keys` (manage keys with a session only)
- `/api/sync`, `/api/chat`, `/api/admin`, `/api/subscriptions`, `/api/extension`, webhooks, and other account or internal routes

Invalid or deleted keys return **401 Unauthorized**. Requests to disallowed routes return **403 Forbidden**.

## Security best practices

- **Do not commit API keys** to git or paste them in public channels.
- **Prefer read-only keys** when an integration only needs to read data.
- **Delete unused keys** in Settings → API keys.
- **Rotate by creating a new key** — update your integration, confirm it works, then delete the old key. Permission level cannot be changed on an existing key.

## Errors

| Status | Meaning |
| --- | --- |
| `401` | Missing auth, invalid session, or invalid/deleted API key |
| `403` | Valid API key but route or method not allowed for that key's permission |
