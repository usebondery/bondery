# @bondee/icon-generator

A utility package for generating PNG and ICO icons from SVG source files using Sharp.

## Features

- Generate multiple icon sizes from a single SVG source
- Support for PNG and ICO formats
- Automatic directory creation
- Type-safe configuration with TypeScript
- Shared across multiple apps in the monorepo

## Installation

```bash
npm install @bondee/icon-generator
```

## Usage

```typescript
import { generateIcons } from '@bondee/icon-generator';
import { join } from 'path';

const icons = [
  { name: 'icon16.png', size: 16, format: 'png' as const, outDir: '../public/icons' },
  { name: 'icon48.png', size: 48, format: 'png' as const, outDir: '../public/icons' },
  { name: 'icon128.png', size: 128, format: 'png' as const, outDir: '../public/icons' },
  { name: 'favicon.ico', size: 48, format: 'ico' as const, outDir: '../src/app' },
];

const svgPath = join(__dirname, '../../../packages/branding/src/assets/icon.svg');

generateIcons({
  svgPath,
  icons,
  baseDir: __dirname,
});
```

## API

### `generateIcons(options: GenerateIconsOptions): Promise<void>`

Generates icons from an SVG source file.

#### Options

- **`svgPath`** (string): Absolute path to the source SVG file
- **`icons`** (IconConfig[]): Array of icon configurations to generate
- **`baseDir`** (string): Base directory for resolving relative output paths (typically `__dirname` from the calling script)

#### IconConfig

```typescript
interface IconConfig {
  name: string;        // Output filename (e.g., 'icon.png', 'favicon.ico')
  size: number;        // Icon size in pixels (width and height)
  format: 'png' | 'ico'; // Output format
  outDir: string;      // Output directory relative to baseDir
}
```

## Examples

### Web App (Next.js)

Generate favicon and app icons for Next.js metadata:

```typescript
const icons = [
  { name: 'favicon.ico', size: 48, format: 'ico' as const, outDir: '../src/app' },
  { name: 'icon.png', size: 512, format: 'png' as const, outDir: '../src/app/icons' },
  { name: 'apple-icon.png', size: 180, format: 'png' as const, outDir: '../src/app/icons' },
];
```

### Chrome Extension

Generate extension icons:

```typescript
const icons = [
  { name: 'icon16.png', size: 16, format: 'png' as const, outDir: '../public/icons' },
  { name: 'icon48.png', size: 48, format: 'png' as const, outDir: '../public/icons' },
  { name: 'icon128.png', size: 128, format: 'png' as const, outDir: '../public/icons' },
];
```

## Integration with Build Scripts

Add to your `package.json`:

```json
{
  "scripts": {
    "generate-icons": "tsx scripts/generate-icons.ts",
    "predev": "npm run generate-icons",
    "prebuild": "npm run generate-icons"
  }
}
```

This ensures icons are generated before development and production builds.

## Dependencies

- [sharp](https://sharp.pixelplumbing.com/) - High-performance image processing
