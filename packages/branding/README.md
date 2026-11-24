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
