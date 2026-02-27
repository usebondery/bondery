# Changelog
All notable changes to this project will be documented in this file. On more information about the format, see [Instructions for changelog](.github/instructions/changelog.instructions.md).

## [Unreleased]

### 🔄 Changed

- Migrated Chrome extension build tooling from Parcel to WXT (wxt.dev) framework, replacing `.parcelrc`, `scripts/generate-manifest.ts`, and Parcel CLI with WXT's file-based entrypoints and Vite-powered build pipeline.
- Chrome extension content scripts are now defined using WXT's `defineContentScript` API in `src/entrypoints/`.
- Build output moved from `dist/` to `.output/chrome-mv3/` following WXT conventions.
- Facebook content script is now included in the extension build.

## [0.0.1] - 15.02.2026

### ✨ Added

- LinkedIn ZIP/folder importer in Settings → Data management with multi-step modal flow (instructions, upload, preview, selectable import).
- New API endpoints for LinkedIn importer parsing and commit under `/api/contacts/import/linkedin`.
- CSV parsing pipeline that extracts LinkedIn username, contact email, title, and connection date from `Connections.csv`.

### 🔄 Changed

- Moved integration card UI into shared component and added `isLinkable` behavior for chain-chip rendering.
- Extended social media schema with `people_social_media.connected_at` for source connection timestamp tracking.