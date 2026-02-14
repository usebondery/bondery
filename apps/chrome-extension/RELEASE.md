# Chrome Extension Releases


## Version Naming Convention

The Chrome Extension uses **separate versioning** from the web app:
- Extension releases use tags like `ext-v1.0.0`, `ext-v1.2.3`
- Web app releases use tags like `v1.0.0`, `v1.2.3`

This allows independent version numbering for each component.

## Creating a New Release

To create a new release of the Bondery Chrome Extension:

### 1. Update Version Numbers

Update the version in **both** of these files:
1. `apps/chrome-extension/package.json` → `"version": "X.Y.Z"`
2. `apps/chrome-extension/scripts/generate-manifest.ts` → `version: "X.Y.Z"`

### 2. Regenerate Manifest

```bash
cd apps/chrome-extension
npm run generate-manifest
```

### 3. Commit Changes

```bash
git add .
git commit -m "chore(extension): Bump version to X.Y.Z"
git push
```

### 4. Create and Push Tag

```bash
# Replace X.Y.Z with your version number (e.g., 0.4.0)
git tag ext-vX.Y.Z
git push origin ext-vX.Y.Z
```

**Example for version 0.4.0:**
```bash
git tag ext-v0.4.0
git push origin ext-v0.4.0
```

### 5. GitHub Actions Will Automatically

- Build the extension in production mode (extension only, not the web app)
   - Create a GitHub release
   - Upload the extension as a downloadable `.zip` file

## Manual Release (Alternative)

You can also trigger a release manually from the GitHub Actions tab:
1. Go to the "Release Chrome Extension" workflow
2. Click "Run workflow"
3. Select the branch
4. Set `release_tag` in format `ext-vX.Y.Z` (example: `ext-v0.5.7`)
5. Click "Run workflow"

## Environment Variables

The workflow uses these repository variables:
- `NEXT_PUBLIC_WEBAPP_URL`: Production app URL (configured in GitHub Settings → Secrets and variables → Actions → Variables)

The workflow also requires these repository secrets for `chrome-webstore-upload`:
- `PRIVATE_CHROME_EXTENSION_ID`
- `PRIVATE_CHROME_CLIENT_ID`
- `PRIVATE_CHROME_CLIENT_SECRET`
- `PRIVATE_CHROME_REFRESH_TOKEN`
- `PRIVATE_CHROME_PRIVATE_SIGNING_KEY` (PEM private key used to sign CRX packages)

## Installation for End Users

Once a release is created, users can:
1. Go to the [Releases page](https://github.com/YOUR_USERNAME/bondery/releases)
2. Download the latest `bondery-extension-vX.Y.Z.zip` file
3. Extract the zip file
4. Open Chrome and go to `chrome://extensions/`
5. Enable "Developer mode"
6. Click "Load unpacked" and select the extracted folder

# Tips
When you want to push an update, don't bundling listing updates along with your package updated. Eg: don't make listing changes like, title, description, banner images along with your code updates.

If you're rolling out hotfixes, don't bundle manifest permission updates, nor listing updates along with it.

If you want to update your extension's listing, do it separately from your package updates.

Avoid pushing out updates on Friday. Especially manifest permission updates and listing updates.

