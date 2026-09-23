---
name: bondery-release
description: >
  Bondery release operator runbook — RC then production CalVer, extension gates,
  unified vX.Y.Z tags, Dokploy BONDERY_INFRA_VERSION pin, rollback, and hotfix sequencing.
  Use when cutting a monthly or patch release, tagging vX.Y.Z-rc.N or vX.Y.Z,
  pinning product version, promoting to production, or rolling back.
metadata:
  version: "1.0.0"
  namespace: bondery
---

# Bondery Release

## When to use

- Cutting a named RC (`X.Y.Z-rc.N`) then a production CalVer (`X.Y.Z`)
- Tagging `vX.Y.Z-rc.N` (GitHub prerelease + staging zip) or `vX.Y.Z` (CWS + production images)
- Setting `BONDERY_INFRA_VERSION` in Dokploy after a tested production deploy
- Rolling back production or self-host pins (paired api + webapp)
- Coordinating Chrome extension publish before production containers

## When not to use

- Changelog wording or version math — use `bondery-changelog`
- CI workflow YAML or tag semantics detail — use [`.github/workflows/README.md`](../../../.github/workflows/README.md)
- Pre-merge quality gates on a PR — use `bondery-verification-loop`
- Post-push CI triage — use Cursor `babysit` skill
- API compatibility policy — use `bondery-api` → `references/versioning.md`

## Non-negotiables

1. **`:sha-<short>` must exist on `main`** before `vX.Y.Z` or `vX.Y.Z-rc.N` — merge first; [`stage-images.yml`](../../../.github/workflows/stage-images.yml) builds `:sha` on every main push. `:beta` moves only on **named RC cuts** (package.json changed to `X.Y.Z-rc.N`).
2. **Product tags promote, they do not rebuild** — [`release.yml`](../../../.github/workflows/release.yml) / [`rc-release.yml`](../../../.github/workflows/rc-release.yml) promote `ghcr.io/usebondery/{api,webapp}:sha-<short>`. Production promote is always a **new SHA** after dropping `-rc` — do not retag an RC image as `1.9.1`.
3. **Extension gate (production):** do not approve `production-containers` or update Dokploy until the user confirms the Chrome Web Store listing is live. CWS runs on `vX.Y.Z` only — never on RC tags.
4. **Website exception:** `git push origin main:release` is **not** extension-gated — marketing CD only ([`deploy-website.yml`](../../../.github/workflows/deploy-website.yml)).
5. **Pin `BONDERY_INFRA_VERSION`** in Dokploy (and `.env.example` via `sync-version`) to production **`X.Y.Z` only** — never an RC string. Pins **both** api and webapp; redeploy together. RC is not a self-host channel.
6. **CI truth:** [`.github/workflows/README.md`](../../../.github/workflows/README.md) overrides remembered release folklore.

## Related skills and docs

| Concern | Owner |
|---------|--------|
| Version scheme, `Unreleased` → dated section | [`bondery-changelog`](../bondery-changelog/SKILL.md) |
| Public roadmap state updates (Ready for Release → Released) | [`bondery-roadmap`](../bondery-roadmap/SKILL.md) |
| CI triggers, Docker channels, promote semantics | [`.github/workflows/README.md`](../../../.github/workflows/README.md) |
| Execute file edits and commits | Cursor implementer agent |
| Watch `release-*` / `deploy-website` CI | Cursor babysit skill |
| Extension local dev / OAuth / listing graphics | [`bondery-chrome-extension`](../bondery-chrome-extension/SKILL.md); [`apps/chrome-extension/README.md`](../../../apps/chrome-extension/README.md); [OAuth workflow](../../workflows/CHROME-EXTENSION-OAUTH.md) |
| Release blog post | [`.agents/workflows/blog/BLOG-POST.md`](../../workflows/blog/BLOG-POST.md) |

## Decision tree

| Task | Read |
|------|------|
| Pre-release bumps, openapi, build on `main` | [references/prerequisites.md](references/prerequisites.md) |
| Order of RC → production tag → CWS → containers | [references/sequencing-and-gates.md](references/sequencing-and-gates.md) |
| What GitHub runs on push/tag (operator view) | [references/ci-triggers.md](references/ci-triggers.md) |
| Manifest pins, Dokploy product stack | [references/dokploy-pins.md](references/dokploy-pins.md) |
| CWS wait/reject, staging zip sideload | [references/extension.md](references/extension.md) |
| Hotfix or production rollback | [references/rollback-hotfix.md](references/rollback-hotfix.md) |
| Blog, Discord, Reddit after deploy | [references/post-release.md](references/post-release.md) |
| Calculate `X.Y.Z`, cut changelog | [bondery-changelog versioning](../bondery-changelog/references/versioning-and-release.md) |

Full index: [references/README.md](references/README.md).

## Release operator checklist

- [ ] RC cut (`X.Y.Z-rc.N`) merged and tagged when testing on beta (`vX.Y.Z-rc.N`)
- [ ] Production drop-`-rc` prerequisites on `main` complete ([prerequisites.md](references/prerequisites.md))
- [ ] Changelog dated section cut (`bondery-changelog`) for production only
- [ ] Target commit merged to `main`; `stage-images` produced `:sha-<short>` for changed services
- [ ] `vX.Y.Z` tagged; CWS job succeeded; **user confirmed CWS live** before approving `production-containers`
- [ ] `main:release` pushed when website (or full stack) ready
- [ ] `BONDERY_INFRA_VERSION` is production `X.Y.Z`; Dokploy updated; api + webapp redeployed together
- [ ] Manual smoke: login + one authenticated mutation on product stack
- [ ] ROADMAP cards updated (Ready for Release → Released) per [`bondery-roadmap`](../bondery-roadmap/SKILL.md)
- [ ] Post-release comms if monthly release ([post-release.md](references/post-release.md))
