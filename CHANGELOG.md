# Changelog
All notable changes to this project will be documented in this file. On more information about the format, see [Instructions for changelog](.github/instructions/changelog.instructions.md).

## [Unreleased]

### 🔄 Changed

- Migrated Chrome extension build tooling from Parcel to [WXT](https://wxt.dev) (Vite-based next-gen web extension framework).
  - Replaced `.parcelrc` and manual `generate-manifest.ts` script with `wxt.config.ts` for declarative manifest generation.
  - Entrypoints reorganised under `src/entrypoints/` using WXT's file-based routing conventions.
  - Environment variables are now loaded by Vite (via WXT) using `import.meta.env.*` instead of `process.env.*`.
  - Build output moved from `dist/` to `.output/chrome-mv3/` (standard WXT output layout).
  - Added `wxt zip` script for convenient Chrome Web Store ZIP creation.

## [0.0.1] - 15.02.2026

### ✨ Added

- LinkedIn ZIP/folder importer in Settings → Data management with multi-step modal flow (instructions, upload, preview, selectable import).
- New API endpoints for LinkedIn importer parsing and commit under `/api/contacts/import/linkedin`.
- CSV parsing pipeline that extracts LinkedIn username, contact email, title, and connection date from `Connections.csv`.

### 🔄 Changed

- Moved integration card UI into shared component and added `isLinkable` behavior for chain-chip rendering.
- Extended social media schema with `people_social_media.connected_at` for source connection timestamp tracking.