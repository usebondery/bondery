import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { generateIcons } from "@bondery/branding/icon-generator";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const icons = [
  { format: "ico" as const, name: "favicon.ico", outDir: "../src/app", size: 48 },
  { format: "png" as const, name: "icon.png", outDir: "../src/app/icons", size: 512 },
  { format: "png" as const, name: "apple-icon.png", outDir: "../src/app/icons", size: 180 },
  { format: "svg" as const, name: "logo.svg", outDir: "../public" },
];

const svgPath = join(__dirname, "../../../packages/branding/src/assets/icon.svg");

generateIcons({
  baseDir: __dirname,
  icons,
  svgPath,
});
