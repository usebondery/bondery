/**
 * Regenerates compiled-package exports in package.json files.
 * Wildcard hybrid (Turborepo): types → src, default → dist.
 * Scans src/ for directory barrels (index.ts/tsx) and adds explicit subpath entries.
 *
 * Run after adding new public subpaths: npm run sync-exports
 */
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, join, posix, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const HASH_IMPORTS = {
  "#*": [
    "./dist/*",
    "./dist/*.js",
    "./dist/*/index.js",
    "./src/*",
    "./src/*.ts",
    "./src/*.tsx",
    "./src/*/index.ts",
    "./src/*/index.tsx",
  ],
};

const HYBRID_ENTRY = (srcPath, distPath) => ({
  types: srcPath,
  default: distPath,
});

const PACKAGE_CONFIGS = {
  "packages/schemas/package.json": {
    srcDir: "src",
    extraExports: {
      "./database": {
        types: "./src/supabase.types.ts",
        default: "./dist/supabase.types.js",
      },
    },
  },
  "packages/helpers/package.json": { srcDir: "src" },
  "packages/vcard/package.json": { srcDir: "src" },
  "packages/emails/package.json": { srcDir: "src" },
  "packages/branding/package.json": { srcDir: "src" },
  "packages/mantine-next/package.json": { srcDir: "src" },
  "packages/translations/package.json": { srcDir: "src", jsonWildcard: true },
};

async function collectModuleSubpaths(srcDir) {
  const modules = new Set();
  const srcRoot = join(root, srcDir);

  async function walk(dir, prefix = "") {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(full, rel);
        continue;
      }
      if (!/\.tsx?$/.test(entry.name)) continue;
      if (entry.name === "index.ts" || entry.name === "index.tsx") continue;
      const subpath = `./${rel.replace(/\\/g, "/").replace(/\.tsx?$/, "")}`;
      modules.add(subpath);
    }
  }

  await walk(srcRoot);
  return [...modules].sort();
}

async function collectBarrelSubpaths(srcDir) {
  const barrels = new Set();
  const srcRoot = join(root, srcDir);

  async function walk(dir, prefix = "") {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
      const full = join(dir, entry.name);
      const children = await readdir(full);
      if (children.includes("index.ts") || children.includes("index.tsx")) {
        barrels.add(`./${rel.replace(/\\/g, "/")}`);
      }
      await walk(full, rel);
    }
  }

  await walk(srcRoot);
  return [...barrels].sort();
}

function tsToDist(srcPath) {
  return srcPath
    .replace(/^\.\/src\//, "./dist/")
    .replace(/\.tsx$/, ".js")
    .replace(/\.ts$/, ".js");
}

async function buildExports(pkgRel, config) {
  const pkgDir = dirname(join(root, pkgRel));
  const srcRoot = join(pkgDir, config.srcDir);
  const exports = {
    ".": HYBRID_ENTRY("./src/index.ts", "./dist/index.js"),
    "./*": HYBRID_ENTRY("./src/*.ts", "./dist/*.js"),
  };

  const srcDirRel = pkgRel.replace(/package\.json$/, config.srcDir);
  const barrels = await collectBarrelSubpaths(srcDirRel);
  for (const subpath of barrels) {
    const indexTs = `${subpath}/index.ts`;
    const indexTsx = `${subpath}/index.tsx`;
    let srcPath = `./src${subpath.slice(1)}/index.ts`;
    try {
      await stat(join(pkgDir, "src", subpath.slice(2), "index.tsx"));
      srcPath = `./src${subpath.slice(1)}/index.tsx`;
    } catch {
      // use index.ts
    }
    exports[subpath] = HYBRID_ENTRY(srcPath, tsToDist(srcPath));
  }

  const modules = await collectModuleSubpaths(srcDirRel);
  for (const subpath of modules) {
    const base = subpath.slice(2);
    let srcPath = `./src/${base}.ts`;
    try {
      await stat(join(pkgDir, "src", `${base}.tsx`));
      srcPath = `./src/${base}.tsx`;
    } catch {
      // use .ts
    }
    exports[subpath] = HYBRID_ENTRY(srcPath, tsToDist(srcPath));
  }

  if (config.extraExports) {
    for (const [subpath, paths] of Object.entries(config.extraExports)) {
      exports[subpath] = HYBRID_ENTRY(paths.types, paths.default);
    }
  }

  if (config.jsonWildcard) {
    exports["./*.json"] = { default: "./dist/*.json" };
  }

  if (pkgRel === "packages/branding/package.json") {
    exports["./icon-generator"] = {
      types: "./scripts/icon-generator.d.ts",
      default: "./scripts/generate-icons.ts",
    };
  }

  if (pkgRel === "packages/mantine-next/package.json") {
    exports["./styles"] = {
      types: "./src/styles.d.ts",
      style: "./src/styles.css",
      default: "./src/styles.css",
    };
  }

  return exports;
}

for (const [relPath, config] of Object.entries(PACKAGE_CONFIGS)) {
  const pkgPath = join(root, relPath);
  const pkg = JSON.parse(await readFile(pkgPath, "utf8"));
  pkg.exports = await buildExports(relPath, config);
  pkg.imports = HASH_IMPORTS;
  pkg.main = "./dist/index.js";
  pkg.types = "./src/index.ts";
  await writeFile(pkgPath, `${JSON.stringify(pkg, null, 2)}\n`);
  console.log(`Updated ${relPath}`);
}
