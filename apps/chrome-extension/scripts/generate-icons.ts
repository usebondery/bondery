import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateIcons } from "@bondery/branding/icon-generator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const icons = [
  { format: "png" as const, name: "icon16.png", outDir: "../public/icons", size: 16 },
  { format: "png" as const, name: "icon48.png", outDir: "../public/icons", size: 48 },
  { format: "png" as const, name: "icon128.png", outDir: "../public/icons", size: 128 },
];

const svgPath = join(__dirname, "../../../packages/branding/src/assets/icon.svg");

generateIcons({
  baseDir: __dirname,
  icons,
  svgPath,
});
