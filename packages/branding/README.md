# @bondery/branding

Bondery branding assets and icons package.

## Usage

### Import the SVG icon

```typescript
import iconPath from "@bondery/branding/icon";
```

### In Node.js scripts

```javascript
const path = require("path");
const iconPath = path.join(require.resolve("@bondery/branding"), "../icon.svg");
```

## Assets

- `icon.svg` - Main Bondery icon (128x128)

## Open Graph images (`@bondery/branding/og`)

Two layouts: **default** (`OgMarketing`) for site roots, **titled** (`OgTitled`) for pages with a specific title.

- All OG images export as **WebP** (1200×630).
- Titled cards truncate titles longer than **72 characters** (`OG_TITLE_MAX_LENGTH`). Keep titles short and front-load important words — see the blog writing guide.
- Default marketing cards use the tagline: `The open-source personal CRM for building better bonds`

## Brand marks (`src/assets/brands`)

Third-party marks show a platform or app next to a setup step. Each source SVG is plain vector markup. `pnpm run generate:brand-marks` renders them to `brandMarks.generated.ts`.

- `android.svg`: Android robot head, from dashboardicons.com (homarr-labs/dashboard-icons). Android and the Android logo are trademarks of Google LLC. Bondery is not affiliated with or endorsed by Google. One green fill reads on both themes.
- `thunderbird.svg`: Thunderbird logo, from dashboardicons.com (homarr-labs/dashboard-icons). Thunderbird is a trademark of the Mozilla Foundation. Bondery is not affiliated with or endorsed by Mozilla. The blue artwork reads on both themes.

Use a mark only to name the app or platform it stands for.
