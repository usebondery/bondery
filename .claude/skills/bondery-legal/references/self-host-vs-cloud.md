# Self-host vs. cloud

Bondery supports both **hosted cloud** (Bondery-operated) and **self-hosted** deployments. Legal obligations differ — do not conflate them in docs, marketing, or agent guidance.

## Data controller roles

| Deployment | Data controller (user CRM data) | Data processor |
|------------|----------------------------------|----------------|
| **Hosted cloud** | User (for their contacts) | Bondery / Sveetech (platform) — [legal-entity.md](./legal-entity.md) |
| **Self-hosted** | **Operator** (the person/org running the instance) | N/A — operator runs the stack |

Privacy Policy language ("we collect…", subprocessors table, retention windows) describes **Bondery's hosted cloud instance**, not an arbitrary self-hosted deployment.

## What the hosted Privacy Policy covers

Applies to users of `app.usebondery.com` (or Bondery-operated instances):

- Subprocessor list (Hetzner, PostHog, Anthropic, etc.)
- Retention claims (30-day backup purge, 90-day IP logs)
- GDPR rights contact (`team@usebondery.com`)
- Cookie and analytics descriptions

## What self-hosters must own

Operators who deploy via `deploy/bondery/` ([`docs/deploy/installation.mdx`](../../../../docs/deploy/installation.mdx)):

- **Their own** subprocessors (if they use external SMTP, S3, etc.)
- **Their own** privacy policy / terms for their users
- **Their own** backup and log retention practices
- Database, Redis, and storage under their infrastructure control
- OAuth client registration for their domains (`provision-oauth-clients`)

Self-hosters are **not** bound by Bondery's published subprocessor table unless they configure the same vendors.

## Product implications for agents

| Action | Hosted | Self-host |
|--------|--------|-----------|
| Link to `/privacy` from login | Correct | Operator should link to **their** policy |
| Assume PostHog analytics | If key configured | Optional — operator choice |
| Assume Stripe billing | Bondery cloud | Operator may omit |
| Retention jobs in code | Should match hosted policy when Bondery runs them | Operator configures backups/logs |

## Documented gap

[`docs/deploy/installation.mdx`](../../../../docs/deploy/installation.mdx) does not yet explicitly state that self-hosters are their own data controller and that the website Privacy Policy does not apply to their instance.

**Flag for follow-up** — document in self-host guide, not in hosted Privacy.tsx.

## Marketing claims

`apps/website/src/components/landing/Features.tsx` — "hosted on EU servers" and self-host with Docker Compose. Both are accurate; neither replaces operator legal obligations for self-host.

## Self-host checklist

- [ ] Docs/marketing do not imply hosted Privacy Policy applies to self-hosted operators
- [ ] Self-host README mentions operator as controller (when gap is closed)
- [ ] New env vars for optional vendors documented for operators, not assumed in hosted policy
- [ ] Feature that phones home to Bondery analytics flagged as hosted-only
