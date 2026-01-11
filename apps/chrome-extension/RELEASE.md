# Chrome Extension Releases

## Version Naming Convention

The Chrome Extension uses **separate versioning** from the web app:
- Extension releases use tags like `ext-v1.0.0`, `ext-v1.2.3`
- Web app releases use tags like `v1.0.0`, `v1.2.3`

This allows independent version numbering for each component.

## Creating a New Release

To create a new release of the Bondee Chrome Extension:

1. **Update the version** in `apps/chrome-extension/package.json` and `apps/chrome-extension/scripts/generate-manifest.ts`

2. **Commit your changes**:
   ```bash
   git add .
   git commit -m "Bump extension version to X.Y.Z"
   ```

3. **Create and push an extension version tag**:
   ```bash
   git tag ext-v0.2.0
   git push origin ext-v0.2.0
   ```

4. **GitHub Actions will automatically**:
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
- `APP_URL`: Production app URL (configured in GitHub Settings → Secrets and variables → Actions → Variables)

## Installation for End Users

Once a release is created, users can:
1. Go to the [Releases page](https://github.com/YOUR_USERNAME/bondee/releases)
2. Download the latest `bondee-extension-vX.Y.Z.zip` file
3. Extract the zip file
4. Open Chrome and go to `chrome://extensions/`
5. Enable "Developer mode"
6. Click "Load unpacked" and select the extracted folder
