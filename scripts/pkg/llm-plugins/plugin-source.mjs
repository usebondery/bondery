/** Load the plugin source tree from `llm-plugins/src`. */
import { lstatSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export function loadPluginSource(root) {
  const src = join(root, "llm-plugins/src");
  const config = JSON.parse(readFileSync(join(src, "plugin.config.json"), "utf8"));
  const files = new Map();
  files.set("readme.md", readFileSync(join(src, "readme.md"), "utf8"));
  files.set("LICENSE", readFileSync(join(src, "LICENSE")));
  files.set("assets/icon.png", readFileSync(join(src, "assets/icon.png")));
  for (const name of readdirSync(join(src, "skills"))) {
    const skillDir = join(src, "skills", name);
    if (!lstatSync(skillDir).isDirectory()) {
      continue;
    }
    files.set(`skills/${name}/SKILL.md`, readFileSync(join(skillDir, "SKILL.md"), "utf8"));
  }
  return { config, files };
}

export function readRootVersion(root) {
  const pkg = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));
  const version = typeof pkg.version === "string" ? pkg.version.trim() : "";
  if (!version) {
    throw new Error("Root package.json version is missing.");
  }
  return version;
}
