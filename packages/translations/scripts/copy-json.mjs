import fs from "node:fs";
import path from "node:path";

const srcLocales = path.join("src", "locales");
const distLocales = path.join("dist", "locales");
const srcManifest = "manifest.json";
const distManifest = path.join("dist", "manifest.json");

function copyRecursive(src, dest) {
  if (!fs.existsSync(src)) {
    return;
  }
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyRecursive(srcPath, destPath);
    } else if (entry.name.endsWith(".json")) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyRecursive(srcLocales, distLocales);
if (fs.existsSync(srcManifest)) {
  fs.mkdirSync(path.dirname(distManifest), { recursive: true });
  fs.copyFileSync(srcManifest, distManifest);
}
