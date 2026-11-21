import { mkdirSync, readFileSync, rmSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { expect, type Locator, type Page, test } from "@playwright/test";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../..");
const outputDir = join(repoRoot, "tmp/cws-shots");

const SHOTS = [
  { file: "01-open-source.png", slug: "open-source" },
  { file: "02-save-a-profile.png", slug: "save-a-profile" },
  { file: "03-remember.png", slug: "remember" },
  { file: "04-stay-organized.png", slug: "stay-organized" },
  { file: "05-every-surface.png", slug: "every-surface" },
] as const;

type Shot = (typeof SHOTS)[number];

function readPngHeader(filePath: string): { colorType: number; height: number; width: number } {
  const header = readFileSync(filePath).subarray(0, 26);
  return {
    colorType: header[25],
    height: header.readUInt32BE(20),
    width: header.readUInt32BE(16),
  };
}

async function gotoShot(page: Page, shot: Shot): Promise<Locator> {
  await page.goto(`/dev/store-shots/${shot.slug}`);
  return page.locator("[data-store-shot]");
}

async function screenshotShot(frame: Locator, shot: Shot): Promise<string> {
  const filePath = join(outputDir, shot.file);
  await frame.screenshot({
    animations: "disabled",
    omitBackground: false,
    path: filePath,
    type: "png",
  });
  return filePath;
}

test.beforeAll(() => {
  mkdirSync(outputDir, { recursive: true });
  for (const shot of SHOTS) {
    rmSync(join(outputDir, shot.file), { force: true });
  }
});

for (const shot of SHOTS) {
  if (shot.slug === "stay-organized") {
    test(`export ${shot.file}`, async ({ page }) => {
      const frame = await gotoShot(page, shot);
      await expect(frame).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator(".leaflet-container")).toBeVisible();
      await expect.poll(() => page.locator(".leaflet-marker-icon").count()).toBeGreaterThan(0);
      await expect.poll(() => page.locator(".leaflet-marker-icon img").count()).toBeGreaterThan(0);
      await expect
        .poll(async () =>
          page.locator("img.leaflet-tile").evaluateAll((tiles) => {
            if (tiles.length === 0) {
              return false;
            }
            return tiles.every((tile) => {
              const image = tile as HTMLImageElement;
              return image.complete && image.naturalWidth > 0;
            });
          }),
        )
        .toBe(true);

      const { colorType, height, width } = readPngHeader(await screenshotShot(frame, shot));
      expect(width, `${shot.file} width`).toBe(1280);
      expect(height, `${shot.file} height`).toBe(800);
      expect(colorType, `${shot.file} PNG color type (2=RGB, 6=RGBA)`).toBe(2);
    });
    continue;
  }

  test(`export ${shot.file}`, async ({ page }) => {
    const frame = await gotoShot(page, shot);
    await expect(frame).toBeVisible();
    await page.evaluate(() => document.fonts.ready);

    const { colorType, height, width } = readPngHeader(await screenshotShot(frame, shot));
    expect(width, `${shot.file} width`).toBe(1280);
    expect(height, `${shot.file} height`).toBe(800);
    expect(colorType, `${shot.file} PNG color type (2=RGB, 6=RGBA)`).toBe(2);
  });
}
