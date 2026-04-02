# Changelog
All notable changes to this project will be documented in this file. On more information about the format, see [Instructions for changelog](.github/instructions/changelog.instructions.md).

## [1.4.0] - 01.04.2026

### ✨ Added

- Instagram ZIP importer with follower/following/close-friends parsing and brand detection in Settings → Data management.
- vCard importer with geocoding, timezone enrichment, address validation, embedded photo upload, and important dates support.
- Keep-in-touch feature for managing follow-up reminders by frequency (weekly, biweekly, monthly, quarterly, biannually, yearly) with overdue highlighting.
- "Myself" contact: non-deletable self-contact created automatically on signup with UI protection and MyselfRecommendationCard.
- Blog and announcement pipeline for the website with Discord webhook and Reddit OAuth2 integration.
- Extension version gating: API returns HTTP 426 when the Chrome extension is below the minimum supported version.
- Create new contacts directly via modal from multiple places in the app.

### 🐛 Fixed

- Resolved type conflict in next.config.ts for import modals including gisPoint.
- Improved error messages for myself contact deletion protection.

### 🔄 Changed

- Updated contact model and vCard handling for richer data support.
- Streamlined contributing section in README for clarity.
- Restructured reminder API route to `/api/internal/reminder-digest`.

### 📝 Documentation

- Added release workflow and blog post workflow documentation.
- Added writing guide for blog content creation.

### 📦 Dependencies

- Bumped minimum Chrome extension version to 1.4.0.

## [0.0.1] - 15.02.2026

### ✨ Added

- LinkedIn ZIP/folder importer in Settings → Data management with multi-step modal flow (instructions, upload, preview, selectable import).
- New API endpoints for LinkedIn importer parsing and commit under `/api/contacts/import/linkedin`.
- CSV parsing pipeline that extracts LinkedIn username, contact email, title, and connection date from `Connections.csv`.

### 🔄 Changed

- Moved integration card UI into shared component and added `isLinkable` behavior for chain-chip rendering.
- Extended social media schema with `people_social_media.connected_at` for source connection timestamp tracking.