import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const packageRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(packageRoot, "../..");
const manifest = JSON.parse(fs.readFileSync(path.join(packageRoot, "manifest.json"), "utf8"));
const catalog = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "packages/schemas/locale/supported-locales.json"), "utf8"),
);

const locales = catalog.supported.map((entry) => entry.code);
const pathPattern = {};

for (const [namespace, entry] of Object.entries(manifest.namespaces)) {
  pathPattern[namespace] = `./packages/translations/src/locales/{locale}/${entry.path}`;
}

const settings = {
  $schema: "https://inlang.com/schema/project-settings",
  baseLocale: catalog.default,
  locales,
  modules: ["https://cdn.jsdelivr.net/npm/@inlang/plugin-i18next@6.2.3/dist/index.js"],
  "plugin.inlang.i18next": {
    pathPattern,
    variableReferencePattern: ["{", "}"],
  },
};

const projectDir = path.join(repoRoot, "project.inlang");
fs.mkdirSync(projectDir, { recursive: true });
fs.writeFileSync(path.join(projectDir, "settings.json"), `${JSON.stringify(settings, null, 2)}\n`);

const gitignore = `*
!settings.json
`;
fs.writeFileSync(path.join(projectDir, ".gitignore"), gitignore);

console.log(
  `Wrote project.inlang/settings.json (${Object.keys(pathPattern).length} namespaces, locales: ${locales.join(", ")})`,
);
