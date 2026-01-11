import { generateIcons } from '@bondee/icon-generator';
import { join } from 'path';

const icons = [
  { name: 'icon16.png', size: 16, format: 'png' as const, outDir: '../public/icons' },
  { name: 'icon48.png', size: 48, format: 'png' as const, outDir: '../public/icons' },
  { name: 'icon128.png', size: 128, format: 'png' as const, outDir: '../public/icons' },
];

const svgPath = join(__dirname, '../../../packages/branding/src/assets/icon.svg');

generateIcons({
  svgPath,
  icons,
  baseDir: __dirname,
});
