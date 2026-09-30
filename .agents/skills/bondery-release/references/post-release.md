# Post-release communications

Run only after technical deploy is confirmed (CI smoke green, Dokploy healthy, manual smoke passed).

## Monthly product release

1. **Blog post** — follow [`.agents/workflows/blog/BLOG-POST.md`](../../../workflows/blog/BLOG-POST.md). Use the curated `docs/changelog/X.Y.Z.mdx` section as source material; do not paste raw commit logs.

2. **Community announce** — Discord and Reddit via the announce CLI (`pnpm` script in website package — see blog workflow).

3. **Roadmap** — community posts can link to [the public roadmap](https://usebondery.com/roadmap) for what's next.

4. **(Future)** In-app notification for the new version.

## Patch / hotfix

Blog post is optional. Changelog entry is still required on `main` per `bondery-changelog`. Announce only if the fix is user-visible and material.

## Post-release checklist

- [ ] Login + one authenticated mutation verified on production
- [ ] Blog published (monthly releases)
- [ ] Community channels updated if applicable
