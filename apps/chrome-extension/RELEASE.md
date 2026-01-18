# Chrome Extension Releases

## Current Version: 0.4.0

## Version Naming Convention

The Chrome Extension uses **separate versioning** from the web app:
- Extension releases use tags like `ext-v1.0.0`, `ext-v1.2.3`
- Web app releases use tags like `v1.0.0`, `v1.2.3`

This allows independent version numbering for each component.

## Creating a New Release

To create a new release of the Bondery Chrome Extension:

### 1. Update Version Numbers

Update the version in **both** of these files:
- `apps/chrome-extension/package.json` → `"version": "X.Y.Z"`
- `apps/chrome-extension/scripts/generate-manifest.ts` → `version: "X.Y.Z"`

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
4. Click "Run workflow"

## Environment Variables

The workflow uses these repository variables:
- `NEXT_PUBLIC_WEBAPP_URL`: Production app URL (configured in GitHub Settings → Secrets and variables → Actions → Variables)

## Installation for End Users

Once a release is created, users can:
1. Go to the [Releases page](https://github.com/YOUR_USERNAME/bondery/releases)
2. Download the latest `bondery-extension-vX.Y.Z.zip` file
3. Extract the zip file
4. Open Chrome and go to `chrome://extensions/`
5. Enable "Developer mode"
6. Click "Load unpacked" and select the extracted folder
