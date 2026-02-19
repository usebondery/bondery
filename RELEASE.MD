When running a release workflow:

# Steps
## Commits
Refer to the [commit message guidelines](.github/instructions/changelog.instructions.md) to ensure your commit messages are properly formatted for automatic changelog generation.

## Chrome extension
If there were changes to the chrome extension, refer also to the `apps/chrome-extension/RELEASE.md` instructions for extension-specific release steps.

## Supabase
Generate types by:

```bash
cd apps/supabase-db
npm run gen-types
```

Then to push migrations to the production database run:

```bash
cd apps/supabase-db
npx supabase db push
```
