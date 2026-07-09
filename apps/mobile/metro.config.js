const fs = require("node:fs");
const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

// Patch fs.promises.readFile to retry on EMFILE / ENFILE.
//
// WHY: Metro's BinaryFileStore (in @expo/metro-config) uses fs.promises.readFile
// to read cached transform results. On a 16-core machine Metro defaults to 10
// workers, which fires up to 112+ simultaneous readFile calls (Promise.all over
// all module dependencies). On Windows this exceeds the per-process file-handle
// limit and throws EMFILE. graceful-fs only patches the callback-based fs API,
// not fs.promises — so this patch fills that gap. require('fs') and
// require('node:fs') return the same object, so this one patch covers both.
const _origReadFile = fs.promises.readFile;
fs.promises.readFile = async function emfileRetryReadFile(...args) {
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      return await _origReadFile.apply(fs.promises, args);
    } catch (err) {
      if ((err.code === "EMFILE" || err.code === "ENFILE") && attempt < 9) {
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
        continue;
      }
      throw err;
    }
  }
};

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const workspacePackagesRoot = path.resolve(workspaceRoot, "packages");

// Only watch workspace packages that the mobile app actually depends on.
// Watching unrelated packages (emails, branding, mantine-next, vcard, …) adds
// unnecessary files to Metro's crawl surface and slows down the initial file map
// build and HMR watching.
const mobilePkg = JSON.parse(fs.readFileSync(path.resolve(projectRoot, "package.json"), "utf8"));
const mobileDeps = new Set([
  ...Object.keys(mobilePkg.dependencies ?? {}),
  ...Object.keys(mobilePkg.devDependencies ?? {}),
]);

const workspacePackageFolders = fs
  .readdirSync(workspacePackagesRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => {
    const folderPath = path.resolve(workspacePackagesRoot, entry.name);
    const pkgJsonPath = path.resolve(folderPath, "package.json");
    if (!fs.existsSync(pkgJsonPath)) {
      return null;
    }
    const name = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8")).name;
    return { folderPath, name };
  })
  .filter((entry) => entry !== null && mobileDeps.has(entry.name))
  .map((entry) => entry.folderPath);

const config = getDefaultConfig(projectRoot);

// Watch only workspace package folders instead of the entire monorepo root.
config.watchFolders = workspacePackageFolders;

// Workers: Metro's automatic default is used. If EMFILE recurs despite the
// fs.promises.readFile retry patch above, set METRO_MAX_WORKERS=4 in .env
// to manually cap concurrency (try 4 first, then 2).
const metroMaxWorkers = process.env.METRO_MAX_WORKERS;
if (metroMaxWorkers) {
  const parsed = Number.parseInt(metroMaxWorkers, 10);
  if (Number.isFinite(parsed) && parsed > 0) {
    config.maxWorkers = parsed;
  }
}

function toBlockPattern(dir) {
  // blockList entries must be RegExps. Escape path separators and regex
  // metacharacters (critical on Windows) and match everything under `dir`.
  return new RegExp(`${dir.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}.*`);
}

const blockListPatterns = [
  // Native build outputs — large, churn constantly, not JS bundle inputs
  toBlockPattern(path.join(projectRoot, "android", "build")),
  toBlockPattern(path.join(projectRoot, "android", ".gradle")),
  toBlockPattern(path.join(projectRoot, "ios", "build")),
  toBlockPattern(path.join(projectRoot, "ios", "Pods")),
  // Generated Expo / web artefacts inside the mobile app folder
  toBlockPattern(path.join(projectRoot, ".expo-test-bundle")),
  toBlockPattern(path.join(projectRoot, "dist-web")),
  // Backend app in the monorepo — Metro should never resolve into it
  toBlockPattern(path.join(workspaceRoot, "apps", "api")),
  // Inside each watched workspace package, exclude nested node_modules.
  // Metro doesn't need to crawl or transform packages-within-packages; all
  // dependencies are hoisted to the monorepo root node_modules.
  ...workspacePackageFolders.map((folderPath) =>
    toBlockPattern(path.join(folderPath, "node_modules")),
  ),
];
config.resolver.blockList = blockListPatterns;
// Resolve node_modules from the app first, then fall back to the root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Deduplicate React — always resolve from the mobile app's own node_modules
// to prevent "multiple copies of React" errors in a monorepo.
const DEDUPLICATED = ["react", "react-dom", "react-native"];
const localNodeModules = path.resolve(projectRoot, "node_modules");

// Metro package "exports" blocks relative imports between compiled dist files
// (e.g. dist/entities/address.js → ../constants/index.js). Resolve workspace
// packages from TypeScript source and handle their internal "#…" imports here.
const WORKSPACE_SOURCE_PACKAGES = [
  { name: "@bondery/schemas", root: path.join(workspacePackagesRoot, "schemas") },
  { name: "@bondery/helpers", root: path.join(workspacePackagesRoot, "helpers") },
  {
    name: "@bondery/translations",
    root: path.join(workspacePackagesRoot, "translations"),
  },
];

function normalizePath(filePath) {
  return filePath.replace(/\\/g, "/");
}

function resolveWorkspaceSourceFile(pkgRoot, subpath) {
  const clean = subpath.replace(/\.(js|ts|tsx)$/, "");
  const candidates = [
    path.join(pkgRoot, "src", `${clean}.ts`),
    path.join(pkgRoot, "src", `${clean}.tsx`),
    path.join(pkgRoot, "src", clean, "index.ts"),
    path.join(pkgRoot, "src", clean, "index.tsx"),
    path.join(pkgRoot, "src", `${clean}.json`),
  ];
  for (const filePath of candidates) {
    if (fs.existsSync(filePath)) {
      return filePath;
    }
  }
  return null;
}

function resolveWorkspacePackage(moduleName) {
  for (const { name, root } of WORKSPACE_SOURCE_PACKAGES) {
    if (moduleName !== name && !moduleName.startsWith(`${name}/`)) {
      continue;
    }
    const subpath = moduleName === name ? "index" : moduleName.slice(name.length + 1);
    const filePath = resolveWorkspaceSourceFile(root, subpath);
    if (filePath) {
      return { filePath, type: "sourceFile" };
    }
  }
  return null;
}

function resolveWorkspaceHashImport(originModulePath, moduleName) {
  if (!moduleName.startsWith("#")) {
    return null;
  }
  const normalizedOrigin = normalizePath(originModulePath);
  const specifier = moduleName.slice(1);
  for (const { root } of WORKSPACE_SOURCE_PACKAGES) {
    const srcRoot = normalizePath(path.join(root, "src"));
    if (!normalizedOrigin.includes(`${srcRoot}/`)) {
      continue;
    }
    const filePath = resolveWorkspaceSourceFile(root, specifier);
    if (filePath) {
      return { filePath, type: "sourceFile" };
    }
  }
  return null;
}

config.resolver.resolveRequest = (context, moduleName, platform) => {
  const base = moduleName.split("/")[0];

  // Only override if the import is coming from *outside* the local node_modules,
  // e.g. from root workspace packages or shared packages. This avoids infinite
  // recursion when React packages require each other internally.
  if (DEDUPLICATED.includes(base) && !context.originModulePath.startsWith(localNodeModules)) {
    return context.resolveRequest(
      {
        ...context,
        originModulePath: path.resolve(localNodeModules, base, "index.js"),
      },
      moduleName,
      platform,
    );
  }

  const hashImport = resolveWorkspaceHashImport(context.originModulePath, moduleName);
  if (hashImport) {
    return hashImport;
  }

  const workspacePackage = resolveWorkspacePackage(moduleName);
  if (workspacePackage) {
    return workspacePackage;
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
