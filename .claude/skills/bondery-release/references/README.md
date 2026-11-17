# bondery-release references

| File | When to read |
|------|----------------|
| [prerequisites.md](prerequisites.md) | RC then production bumps, changelog, openapi, build on `main` |
| [sequencing-and-gates.md](sequencing-and-gates.md) | RC → production tag → CWS → containers; website exception |
| [ci-triggers.md](ci-triggers.md) | What CI does on `main`, `release`, `vX.Y.Z-rc.N`, and `vX.Y.Z` |
| [dokploy-pins.md](dokploy-pins.md) | `BONDERY_INFRA_VERSION` production pin, env codegen, Dokploy redeploy |
| [extension.md](extension.md) | CWS on `vX.Y.Z`, staging zip on RC, rejection path |
| [rollback-hotfix.md](rollback-hotfix.md) | Patch hotfix and production rollback |
| [post-release.md](post-release.md) | Blog and community announce after technical deploy |
