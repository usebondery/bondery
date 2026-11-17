# Chrome extension release (unified product release)

Extension releases are **sequential and blocking** on production tags. See [sequencing-and-gates.md](sequencing-and-gates.md).

## Production tag and CI

```bash
git tag vX.Y.Z
git push origin vX.Y.Z
```

[`release.yml`](../../../../.github/workflows/release.yml) **always** runs the extension job on `vX.Y.Z` (CWS, Infisical production, **omit** `manifest.key`). Production GitHub releases have **no** extension zip.

## RC / beta zip

```bash
git tag vX.Y.Z-rc.N
git push origin vX.Y.Z-rc.N
```

[`rc-release.yml`](../../../../.github/workflows/rc-release.yml) builds the **staging** flavor (Infisical staging, **include** `manifest.key`, matches include the baked beta origin + localhost). CWS does **not** run. The zip `bondery-extension-X.Y.Z-rc.N-sha-<short>.zip` is attached to the GitHub **prerelease**.

Testers: disable the Chrome Web Store listing (same extension id), then Load unpacked from the zip.

## Stop for Chrome Web Store (production only)

After pushing `vX.Y.Z`:

1. **Stop.** Do not approve `production-containers` or pin Dokploy.
2. Wait until the user confirms Google's review is complete and the extension is **live** in the Chrome Web Store.

## Rejection

If Google rejects the submission:

1. Fix issues on `main`.
2. Cut a new production patch (`vX.Y.Z+1`) after an RC if needed.
3. Re-submit via CI on the new `vX.Y.Z` tag.
4. Do **not** approve production containers until the extension is live.

Do not invent `ext-X.Y.Z` tags.

## Listing and permission changes

Keep hotfixes small. Avoid bundling Chrome Web Store listing or permission changes with unrelated code fixes — they slow review and increase rejection risk.

## Local development

OAuth setup, unpacked extension loading, 426 simulation, and beta zip sideload: [`bondery-chrome-extension`](../../bondery-chrome-extension/SKILL.md) → [local-dev.md](../../bondery-chrome-extension/references/local-dev.md); human README: [`apps/chrome-extension/README.md`](../../../../apps/chrome-extension/README.md).

Listing screenshots (1280×800 store-shots generator): [store-listing.md](../../bondery-chrome-extension/references/store-listing.md). This file still owns CWS wait/reject sequencing.

## Extension checklist

- [ ] Production: `vX.Y.Z` extension job succeeded (CWS)
- [ ] RC: staging zip attached to the GitHub prerelease
- [ ] User confirmed extension live in CWS before production-containers
- [ ] `MIN_EXTENSION_VERSION` comes from `sync-version` (previous production), not a hand-edit
