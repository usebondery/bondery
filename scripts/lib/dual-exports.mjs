/** Build dual JIT (import) + Node (default/node) export entries for package.json. */
export function dualExport(srcPath) {
  const nodePath = srcPath
    .replace(/^\.\/src\//, "./dist/")
    .replace(/\.ts$/, ".js");
  return {
    types: srcPath,
    import: srcPath,
    node: nodePath,
    default: nodePath,
  };
}

export function dualJsonExport(srcPath) {
  const nodePath = srcPath.replace(/^\.\/src\//, "./dist/");
  return {
    import: srcPath,
    default: nodePath,
  };
}
