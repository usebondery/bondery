const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all monorepo packages so Metro can resolve shared packages
config.watchFolders = [workspaceRoot];

// Resolve node_modules from the app first, then fall back to the root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// Deduplicate React — always resolve from the mobile app's own node_modules
// to prevent "multiple copies of React" errors in a monorepo.
const DEDUPLICATED = ["react", "react-dom", "react-native"];
const localNodeModules = path.resolve(projectRoot, "node_modules");

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

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
