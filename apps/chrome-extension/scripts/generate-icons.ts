import { generateIcons } from "@bondery/branding/icon-generator";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const icons = [
  { name: "icon16.png", size: 16, format: "png" as const, outDir: "../public/icons" },
  { name: "icon48.png", size: 48, format: "png" as const, outDir: "../public/icons" },
  { name: "icon128.png", size: 128, format: "png" as const, outDir: "../public/icons" },
];

const svgPath = join(__dirname, "../../../packages/branding/src/assets/icon.svg");

generateIcons({
  svgPath,
  icons,
  baseDir: __dirname,
});
