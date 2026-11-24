import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import sharp from "sharp";

function writeFileIfChanged(filePath: string, contents: Buffer): boolean {
  if (existsSync(filePath) && readFileSync(filePath).equals(contents)) {
    return false;
  }
  writeFileSync(filePath, contents);
  return true;
}

async function rasterizeIcon(svgPath: string, size: number, fileName: string): Promise<Buffer> {
  const tempDir = mkdtempSync(join(tmpdir(), "bondery-icon-"));
  try {
    const tempFile = join(tempDir, fileName);
    await sharp(svgPath).resize(size, size).toFile(tempFile);
    return readFileSync(tempFile);
  } finally {
    rmSync(tempDir, { force: true, recursive: true });
  }
}
export interface IconConfig {
  format: "png" | "ico" | "svg";
  name: string;
  outDir: string;
  size?: number;
}

export interface GenerateIconsOptions {
  baseDir: string;
  icons: IconConfig[];
  svgPath: string;
}

/**
 * Generates icons from an SVG source file.
 * Skips the write when the destination already has the same bytes, so Next/Turbo
 * watchers do not treat a no-op regenerate as a source change.
 */
export async function generateIcons(options: GenerateIconsOptions): Promise<void> {
  const { svgPath, icons, baseDir } = options;

  console.log("🎨 Generating icons from SVG...");

  if (!existsSync(svgPath)) {
    console.error("❌ SVG icon not found at:", svgPath);
    process.exitCode = 1;
    return;
  }

  try {
    let wrote = 0;
    for (const icon of icons) {
      const outputPath = join(baseDir, icon.outDir, icon.name);
      const outputDir = dirname(outputPath);

      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true });
      }

      let nextBytes: Buffer;
      if (icon.format === "svg") {
        nextBytes = readFileSync(svgPath);
      } else {
        const { size } = icon;
        if (!size) {
          console.error(`❌ Size is required for ${icon.format} format`);
          process.exitCode = 1;
          return;
        }
        nextBytes = await rasterizeIcon(svgPath, size, icon.name);
      }

      if (writeFileIfChanged(outputPath, nextBytes)) {
        wrote += 1;
        console.log(`✅ Generated ${icon.name} at ${icon.outDir}`);
      } else {
        console.log(`✅ Up to date ${icon.name} at ${icon.outDir}`);
      }
    }

    console.log(
      wrote === 0 ? "✨ All icons already up to date!" : "✨ All icons generated successfully!",
    );
  } catch (error) {
    console.error("❌ Error generating icons:", error);
    process.exitCode = 1;
  }
}
