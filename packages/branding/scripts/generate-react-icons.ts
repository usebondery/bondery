import { transform } from "@svgr/core";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";

const svgFiles = [
  {
    input: "src/assets/icon.svg",
    output: "src/react/BonderyIcon.tsx",
    componentName: "BonderyIcon",
  },
  {
    input: "src/assets/icon-white.svg",
    output: "src/react/BonderyIconWhite.tsx",
    componentName: "BonderyIconWhite",
  },
  {
    input: "src/assets/logotype-black.svg",
    output: "src/react/BonderyLogotypeBlack.tsx",
    componentName: "BonderyLogotypeBlack",
  },
  {
    input: "src/assets/logotype-white.svg",
    output: "src/react/BonderyLogotypeWhite.tsx",
    componentName: "BonderyLogotypeWhite",
  },
];

async function generateReactIcons() {
  console.log("🎨 Generating React icons from SVG...");

  for (const file of svgFiles) {
    const inputPath = join(__dirname, "..", file.input);
    const outputPath = join(__dirname, "..", file.output);

    try {
      // Ensure output directory exists
      const outputDir = dirname(outputPath);
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      const svgCode = readFileSync(inputPath, "utf-8");

      const jsCode = await transform(
        svgCode,
        {
          typescript: true,
          plugins: ["@svgr/plugin-jsx", "@svgr/plugin-prettier"],
          icon: false,
          exportType: "named",
          namedExport: file.componentName,
          memo: false,
        },
        { componentName: file.componentName },
      );

      writeFileSync(outputPath, jsCode);
      console.log(`✅ Generated ${file.output}`);
    } catch (error) {
      console.error(`❌ Error generating ${file.output}:`, error);
      process.exit(1);
    }
  }

  console.log("✨ All React icons generated successfully!");
}

generateReactIcons();
