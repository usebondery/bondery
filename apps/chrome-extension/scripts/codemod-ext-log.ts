import fs from "node:fs";
import path from "node:path";

const TS_FILE_EXT_RE = /\.(?<group1>ts|tsx)$/u;
const root = "apps/chrome-extension/src";

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(filePath, files);
    } else if (TS_FILE_EXT_RE.test(entry.name) && !filePath.endsWith("lib/log.ts")) {
      files.push(filePath);
    }
  }
  return files;
}

for (const file of walk(root)) {
  let content = fs.readFileSync(file, "utf8");
  if (!/console\.(?<group1>log|warn|error)\(/u.test(content)) {
    continue;
  }

  content = content.replace(/console\.log\(/gu, "extLog.debug(");
  content = content.replace(/console\.warn\(/gu, "extLog.warn(");
  content = content.replace(/console\.error\(/gu, "extLog.error(");

  if (!content.includes("lib/log")) {
    const rel = path.relative(path.dirname(file), path.join(root, "lib/log")).replace(/\\/gu, "/");
    const importPath = rel.startsWith(".") ? rel : `./${rel}`;
    const importLine = `import { extLog } from "${importPath.replace(/\.tsx?$/u, "")}";\n`;
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
