# Changelog
All notable changes to this project will be documented in this file. On more information about the format, see [Instructions for changelog](.github/instructions/changelog.instructions.md).

## [0.0.1] - 15.02.2026

### ✨ Added

- LinkedIn ZIP/folder importer in Settings → Data management with multi-step modal flow (instructions, upload, preview, selectable import).
- New API endpoints for LinkedIn importer parsing and commit under `/api/contacts/import/linkedin`.
- CSV parsing pipeline that extracts LinkedIn username, contact email, title, and connection date from `Connections.csv`.

### 🔄 Changed

- Moved integration card UI into shared component and added `isLinkable` behavior for chain-chip rendering.
- Extended social media schema with `people_social_media.connected_at` for source connection timestamp tracking.