import { generateIcons } from "@bondery/branding/icon-generator";
import { join } from "path";

const icons = [
  { name: "favicon.ico", size: 48, format: "ico" as const, outDir: "../src/app" },
  { name: "icon.png", size: 512, format: "png" as const, outDir: "../src/app/icons" },
  { name: "apple-icon.png", size: 180, format: "png" as const, outDir: "../src/app/icons" },
  { name: "logo.svg", format: "svg" as const, outDir: "../public" },
];

const svgPath = join(__dirname, "../../../packages/branding/src/assets/icon.svg");

generateIcons({
  svgPath,
  icons,
  baseDir: __dirname,
});
