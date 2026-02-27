# Bondery Chrome Extension

A Chrome extension built with **React**, **TypeScript**, and **[WXT](https://wxt.dev)** to enhance the Bondery experience.

## Tech Stack

- **[WXT](https://wxt.dev)** – Next-gen web extension framework (Vite-based, replaces Parcel)
- **React 19** – UI rendering in popup, welcome page, and content scripts
- **TypeScript** – Full type safety
- **Mantine** – UI component library

## Project Structure

```
apps/chrome-extension/
├── wxt.config.ts          # WXT configuration (manifest, env vars, Vite settings)
├── public/
│   └── icons/             # Extension icons (generated – see generate-icons script)
├── src/
│   ├── entrypoints/       # WXT entrypoints (file-based routing)
│   │   ├── background.ts              # Service worker
│   │   ├── popup/                     # Browser action popup
│   │   │   ├── index.html
│   │   │   └── main.tsx
│   │   ├── welcome/                   # First-install welcome page
│   │   │   ├── index.html
│   │   │   └── main.tsx
│   │   ├── instagram.content.tsx      # Instagram content script
│   │   ├── instagram-network.content.ts  # Instagram network interceptor (MAIN world)
│   │   ├── linkedin.content.tsx       # LinkedIn content script
│   │   ├── facebook.content.tsx       # Facebook content script
│   │   └── webapp-bridge.content.ts   # Webapp bridge content script
│   ├── popup/             # Popup React components
│   ├── welcome/           # Welcome page React components
│   ├── instagram/         # Instagram button component
│   ├── linkedin/          # LinkedIn button component
│   ├── facebook/          # Facebook button component
│   ├── shared/            # Shared components (MantineWrapper, etc.)
│   ├── utils/             # Utility functions (auth, api, messages)
│   └── config.ts          # Extension configuration (env vars)
└── scripts/
    └── generate-icons.ts  # Generates PNG icons from SVG
```

## Development Setup

### 1. Create environment file

Copy the example and fill in the values:

```sh
cp .env.development.example .env.development.local
```

Required variables:
- `NEXT_PUBLIC_WEBAPP_URL` – URL of the Bondery web app
- `PUBLIC_SUPABASE_URL` – Supabase project URL
- `PRIVATE_SUPABASE_OAUTH_CLIENT_ID` – OAuth 2.1 client ID

### 2. Start development mode

```sh
npm run dev
```

This will:
1. Generate icons from the SVG source
2. Start WXT in watch mode with HMR

### 3. Load the extension in Chrome

1. Open `chrome://extensions/`
2. Enable **Developer mode**
3. Click **Load unpacked** and select `.output/chrome-mv3/`

## Building for Production

```sh
cp .env.production.example .env.production.local
# fill in production values

npm run build
```

The built extension will be in `.output/chrome-mv3/`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start WXT development mode with HMR |
| `npm run build` | Build for production |
| `npm run check-types` | TypeScript type checking |
| `npm run lint` | ESLint |
| `npm run zip` | Build and create a ZIP for Chrome Web Store submission |
| `npm run generate-icons` | Generate PNG icons from SVG source |

## Environment Variables

WXT (via Vite) automatically loads environment files:
- `.env.development.local` – for `npm run dev`
- `.env.production.local` – for `npm run build`

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_WEBAPP_URL` | ✅ | Bondery web app base URL |
| `PUBLIC_SUPABASE_URL` | ✅ | Supabase project URL |
| `PRIVATE_SUPABASE_OAUTH_CLIENT_ID` | ✅ | OAuth 2.1 client ID |


