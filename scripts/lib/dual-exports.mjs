/** Build dual JIT (import) + Node (default/node) export entries for package.json. */
export function dualExport(srcPath) {
  const nodePath = srcPath
    .replace(/^\.\/src\//, "./dist/")
    .replace(/\.ts$/, ".js");
  return {
    types: srcPath,
    // Key order matters: Node ESM matches export keys in insertion order. `node`
    // must precede `import` so runtime resolves dist; bundlers skip `node` and
    // still hit `import` → src for JIT (Next transpilePackages, Metro, Vite).
    node: nodePath,
    import: srcPath,
    default: nodePath,
  };
}

export function dualJsonExport(srcPath) {
  const nodePath = srcPath.replace(/^\.\/src\//, "./dist/");
  return {
    default: nodePath,
    import: srcPath,
  };
}
