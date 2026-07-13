import fs from "node:fs";
import path from "node:path";

const root = "apps/chrome-extension/src";

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(filePath, files);
    } else if (/\.(ts|tsx)$/.test(entry.name) && !filePath.endsWith("lib/log.ts")) {
      files.push(filePath);
    }
  }
  return files;
}

for (const file of walk(root)) {
  let content = fs.readFileSync(file, "utf8");
  if (!/console\.(log|warn|error)\(/.test(content)) {
    continue;
  }

  content = content.replace(/console\.log\(/g, "extLog.debug(");
  content = content.replace(/console\.warn\(/g, "extLog.warn(");
  content = content.replace(/console\.error\(/g, "extLog.error(");

  if (!content.includes("lib/log")) {
    const rel = path.relative(path.dirname(file), path.join(root, "lib/log")).replace(/\\/g, "/");
    const importPath = rel.startsWith(".") ? rel : `./${rel}`;
    const importLine = `import { extLog } from "${importPath.replace(/\.tsx?$/, "")}";\n`;
    const lastImportIdx = content.lastIndexOf("import ");
    if (lastImportIdx === -1) {
      content = importLine + content;
    } else {
      const lineEnd = content.indexOf("\n", lastImportIdx);
      content = `${content.slice(0, lineEnd + 1)}${importLine}${content.slice(lineEnd + 1)}`;
    }
  }

  fs.writeFileSync(file, content);
  process.stdout.write(`updated ${file}\n`);
}
