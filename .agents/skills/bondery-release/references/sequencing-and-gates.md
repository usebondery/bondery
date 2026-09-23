# Sequencing and gates

## End-to-end order

```text
PR → verify → merge main → stage-images (:sha; :beta only on named RC cuts)
→ RC (optional): package X.Y.Z-rc.N → tag vX.Y.Z-rc.N → GitHub prerelease + staging zip
→ production: drop -rc, dated changelog, sync-version
→ merge main → :sha only
→ git tag vX.Y.Z → CWS + promote :X.Y.Z
→ STOP until user confirms Chrome Web Store listing is live
→ approve production-containers → Dokploy pin BONDERY_INFRA_VERSION=X.Y.Z
→ git push origin main:release  (website CD; not extension-gated)
→ post-release comms (monthly)
```

## Critical ordering rule

**When shipping a production tag:** [`release.yml`](../../../../.github/workflows/release.yml) always runs CWS. Do not approve `production-containers` or update Dokploy until the user **explicitly confirms** the extension is live in the Chrome Web Store.

RC tags (`vX.Y.Z-rc.N`) never run CWS and never touch production-containers.

Agents must **stop and ask** after the production tag's CWS job until the user confirms CWS approval.

## Extension unchanged

A `package.json` version bump still publishes the extension on `vX.Y.Z` (store listing stays current). There is no skip-CWS path on a production tag.

For infra-only work that must not touch the store, do not cut `vX.Y.Z` until you intend to publish.

## Website exception

Marketing website CD is **not** extension-gated.

```bash
git push origin main:release
```

Triggers [`deploy-website.yml`](../../../../.github/workflows/deploy-website.yml) when website-related paths changed. The workflow promotes `website:sha-<short>` → `:production` when the image exists on `main`; otherwise it builds. No per-service `website-X.Y.Z` tag.

You may push website-only changes to `release` without waiting on Chrome Web Store review.

## Product container tags

After the production SHA is on `main`:

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

The tag must point at a commit that was built on `main` so `:sha-<short>` exists. See [ci-triggers.md](ci-triggers.md).

Do **not** use leftover `api-X.Y.Z` / `webapp-X.Y.Z` / `ext-X.Y.Z` tags.

## Human approval before production refs

| Action | Who approves |
|--------|----------------|
| `git push origin main:release` | Human (agent proposes commands) |
| `git push origin vX.Y.Z` / `vX.Y.Z-rc.N` | Human |
| Approve `production-containers` | Human, after CWS live |
| Dokploy pin change + redeploy | Human |
| `force_rebuild: true` on release workflow dispatch | Human |

## Release smoke failure decision tree

Use this when release smoke fails — fix the right layer, not the symptom.

```text
pre_start exits non-zero (e.g. ERR_MODULE_NOT_FOUND)
  → Image packaging / Dockerfile (workspace packages not resolvable at runtime)
  → Fix Dockerfile; re-tag or force_rebuild; do NOT override pre_start in smoke scripts

promote fails "no sha-* image"
  → stage-images did not build that commit (path filter skip or failed build)
  → Move tag to a built SHA, or push a commit that triggers stage-images, or force_rebuild

health check fails after pre_start succeeds
  → Runtime env / DB / SeaweedFS / secrets — not the image build path

PR green but release smoke fails on image
  → Before Phase 1 guardrails: api/webapp images were not built on PR
  → After guardrails: check whether path filters skipped the docker build job
```

### Tag commit requirements

1. Production tags should be on `release` (enforced by [`shared-release-validate.yml`](../../../../.github/workflows/shared-release-validate.yml)). RC tags do **not** require `origin/release`.
2. `ghcr.io/usebondery/api:sha-<7char>` (or webapp) must exist — `stage-images` built that SHA on `main`.
3. Deploy-only or Dockerfile-fix commit after tag → move tag to a built SHA, or use `force_rebuild: true`.

### Smoke contract

- Smoke checks out the **tag ref** for compose/scripts.
- Smoke runs the **full** compose `pre_start` hooks — no overrides.
- Image fixes ship via Dockerfile + re-tag or `force_rebuild`, not smoke script hacks on `main`.

## Sequencing checklist

- [ ] Prerequisites on `main` complete
- [ ] `stage-images` succeeded for services being released
- [ ] Production: CWS live confirmed before `production-containers`
- [ ] `main:release` pushed when website/full stack ready
- [ ] CI green on release workflows (use babysit if needed)
