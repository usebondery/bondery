import { transform } from "@svgr/core";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    staticId: true,
  },
  {
    input: "src/assets/logotype-white.svg",
    output: "src/react/BonderyLogotypeWhite.tsx",
    componentName: "BonderyLogotypeWhite",
    staticId: true,
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

      // Check if SVG uses IDs (for gradients, masks, etc.)
      const hasIds = svgCode.includes('id="');

      const options: any = {
        typescript: true,
        plugins: ["@svgr/plugin-jsx", "@svgr/plugin-prettier"],
        icon: false,
        exportType: "named",
        namedExport: file.componentName,
        memo: false,
      };

      let jsCode = await transform(svgCode, options, {
        componentName: file.componentName,
      });

      if (hasIds) {
        if (file.staticId) {
          // For logotype components, use static id 'paint0_linear_12_150'
          jsCode = jsCode.replace(/id="([^"]+)"/g, "id={'paint0_linear_12_150'}");
          jsCode = jsCode.replace(/="url\(#([^)]+)\)"/g, "={'url(#paint0_linear_12_150)'}");
        } else {
          // Replace static IDs with dynamic ones using the injected uniqueId
          jsCode = jsCode.replace(/id="([^"]+)"/g, (_match, id) => `id={\`${id}-\${uniqueId}\`}`);
          jsCode = jsCode.replace(
            /="url\(#([^)]+)\)"/g,
            (_match, id) => `={\`url(#${id}-\${uniqueId})\`}`,
          );

          // Inject uniqueId declaration into the component body
          jsCode = jsCode.replace(
            /=>\s*\(\s*\n/,
            '=> {\n  const uniqueId = React.useId().replace(/:/g, "");\n\n  return (\n',
          );
          jsCode = jsCode.replace(
            /\);\s*\nexport \{/, // close the newly opened block before exports
            ");\n};\n\nexport {",
          );
        }
      }

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
