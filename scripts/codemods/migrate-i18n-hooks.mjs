#!/usr/bin/env node
/**
 * Migrates legacy generic i18n hooks to generated namespace-scoped hooks.
 * Usage: node scripts/codemods/migrate-i18n-hooks.mjs [webapp|mobile]
 */
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dirname, "../..");
const manifest = JSON.parse(
  readFileSync(join(repoRoot, "packages/translations/manifest.json"), "utf8"),
);

function hookBaseName(namespace) {
  if (namespace === "common") {
    return "Common";
  }
  if (namespace === "validation") {
    return "Validation";
  }
  if (namespace === "glossary") {
    return "Glossary";
  }
  return namespace;
}

function useHookName(namespace) {
  return `use${hookBaseName(namespace)}Translations`;
}

function getHookName(namespace) {
  return `get${hookBaseName(namespace)}Translations`;
}

const nsToUse = new Map(Object.keys(manifest.namespaces).map((ns) => [ns, useHookName(ns)]));
const nsToGet = new Map(Object.keys(manifest.namespaces).map((ns) => [ns, getHookName(ns)]));

function walk(dir, acc = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        entry.name === "node_modules" ||
        entry.name === "generated" ||
        entry.name === "typecheck-experiments"
      ) {
        continue;
      }
      walk(full, acc);
    } else if (/\.(tsx?|jsx?)$/.test(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

function hookVarName(namespace) {
  if (namespace === "common") {
    return "t";
  }
  return `t${hookBaseName(namespace)}`;
}

function migrateWebapp(content, _filePath) {
  let next = content;
  const usedHooks = new Set();
  const usedServerHooks = new Set();

  next = next.replace(
    /useWebTranslations\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g,
    (_, ns, prefix) => {
      const hook = nsToUse.get(ns);
      if (!hook) {
        return _;
      }
      usedHooks.add(hook);
      return `${hook}(${JSON.stringify(prefix)})`;
    },
  );

  next = next.replace(/useWebTranslations\(\s*["']([^"']+)["']\s*\)/g, (_, ns) => {
    const hook = nsToUse.get(ns);
    if (!hook) {
      return _;
    }
    usedHooks.add(hook);
    return `${hook}()`;
  });

  next = next.replace(
    /getWebTranslations\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g,
    (_, ns, prefix) => {
      const hook = nsToGet.get(ns);
      if (!hook) {
        return _;
      }
      usedServerHooks.add(hook);
      return `${hook}(${JSON.stringify(prefix)})`;
    },
  );

  next = next.replace(/getWebTranslations\(\s*["']([^"']+)["']\s*\)/g, (_, ns) => {
    const hook = nsToGet.get(ns);
    if (!hook) {
      return _;
    }
    usedServerHooks.add(hook);
    return `${hook}()`;
  });

  // getWebTranslations as getTranslations alias (metadata pages)
  next = next.replace(
    /getTranslations\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g,
    (_, ns, prefix) => {
      const hook = nsToGet.get(ns);
      if (!hook) {
        return _;
      }
      usedServerHooks.add(hook);
      return `${hook}(${JSON.stringify(prefix)})`;
    },
  );

  next = next.replace(/getTranslations\(\s*["']([^"']+)["']\s*\)/g, (_, ns) => {
    const hook = nsToGet.get(ns);
    if (!hook) {
      return _;
    }
    usedServerHooks.add(hook);
    return `${hook}()`;
  });

  if (next.includes("useCommonTranslations(")) {
    usedHooks.add("useCommonTranslations");
  }
  if (next.includes("useValidationTranslations(")) {
    usedHooks.add("useValidationTranslations");
  }
  if (next.includes("getCommonTranslations(")) {
    usedServerHooks.add("getCommonTranslations");
  }

  if (usedHooks.size === 0 && usedServerHooks.size === 0) {
    return content;
  }

  // Remove old imports
  next = next.replace(
    /import\s*\{([^}]*)\}\s*from\s*["']@\/lib\/i18n\/useWebTranslations["'];?\n?/g,
    "",
  );
  next = next.replace(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*\/useWebTranslations["'];?\n?/g, "");
  next = next.replace(
    /import\s*\{([^}]*)\}\s*from\s*["']@\/lib\/i18n\/getWebTranslations["'];?\n?/g,
    "",
  );
  next = next.replace(
    /import\s*\{[^}]*getWebTranslations[^}]*\}\s*from\s*["'][^"']*\/getWebTranslations["'];?\n?/g,
    "",
  );
  next = next.replace(/import\s*\{([^}]*)\}\s*from\s*["'][^"']*\/getWebTranslations["'];?\n?/g, "");

  const clientImport = `import { ${[...usedHooks].sort().join(", ")} } from "@/lib/i18n/generated/hooks";\n`;
  const serverImport =
    usedServerHooks.size > 0
      ? `import { ${[...usedServerHooks].sort().join(", ")} } from "@/lib/i18n/generated/hooks.server";\n`
      : "";

  function insertImports(content, imports) {
    if (!imports) {
      return content;
    }
    const useClientMatch = content.match(/^["']use client["'];?\s*\n/);
    if (useClientMatch) {
      const idx = useClientMatch[0].length;
      return content.slice(0, idx) + imports + content.slice(idx);
    }
    return imports + content;
  }

  if (!next.includes('from "@/lib/i18n/generated/hooks"') && usedHooks.size > 0) {
    next = insertImports(next, clientImport + serverImport);
  } else if (
    !next.includes('from "@/lib/i18n/generated/hooks.server"') &&
    usedServerHooks.size > 0
  ) {
    next = insertImports(next, serverImport);
  }

  return next;
}

function migrateMobile(content) {
  if (!content.includes("useMobileTranslations")) {
    return content;
  }

  let next = content;
  const usedHooks = new Set();

  // Explicit namespace + optional prefix: useMobileTranslations("Ns", "prefix")
  next = next.replace(
    /useMobileTranslations\(\s*["']([^"']+)["']\s*,\s*["']([^"']+)["']\s*\)/g,
    (_, ns, prefix) => {
      const hook = nsToUse.get(ns);
      if (!hook) {
        return _;
      }
      usedHooks.add(hook);
      return `${hook}(${JSON.stringify(prefix)})`;
    },
  );

  next = next.replace(/useMobileTranslations\(\s*["']([^"']+)["']\s*\)/g, (_, ns) => {
    const hook = nsToUse.get(ns);
    if (!hook) {
      return _;
    }
    usedHooks.add(hook);
    return `${hook}()`;
  });

  const nsFromCalls = [
    ...new Set([...next.matchAll(/\bns:\s*["']([^"']+)["']/g)].map((m) => m[1])),
  ];

  const usesDefaultT =
    /\bconst\s+t\s*=\s*useMobileTranslations\s*\(\s*\)/.test(next) ||
    /\bconst\s+t\s*=\s*useMobileTranslations\s*\(\s*\)/.test(content);

  const namespaces = new Set(nsFromCalls);
  if (usesDefaultT) {
    namespaces.add("common");
  }

  if (namespaces.size > 0) {
    const hookDecls = [];
    for (const ns of [...namespaces].sort()) {
      const hook = nsToUse.get(ns);
      if (!hook) {
        continue;
      }
      usedHooks.add(hook);
      const varName = hookVarName(ns);
      hookDecls.push(`const ${varName} = ${hook}();`);
    }

    next = next.replace(/\bconst\s+t\s*=\s*useMobileTranslations\s*\(\s*\)\s*;?\n?/g, "");
    next = next.replace(/\bconst\s+t\s*=\s*useMobileTranslations\s*\([^)]*\)\s*;?\n?/g, "");

    for (const ns of namespaces) {
      const varName = hookVarName(ns);
      const nsPattern = ns.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      next = next.replace(
        new RegExp(
          `\\bt\\(\\s*([^,)]+?)\\s*,\\s*\\{[^}]*\\bns:\\s*["']${nsPattern}["'][^}]*\\}`,
          "g",
        ),
        `${varName}($1)`,
      );
    }

    if (hookDecls.length > 0) {
      const insertAt = next.search(/\n(export |function |const [a-zA-Z]+ = \(|return \()/);
      const hookBlock = `${hookDecls.join("\n  ")}\n`;
      if (insertAt > 0) {
        next = `${next.slice(0, insertAt)}\n  ${hookBlock}${next.slice(insertAt)}`;
      } else {
        next = `${hookBlock}\n${next}`;
      }
    }
  }

  if (usedHooks.size === 0) {
    return content;
  }

  next = next.replace(/import\s*\{[^}]*\}\s*from\s*["'][^"']*useMobileTranslations["'];?\n?/g, "");

  if (
    !next.includes('from "@/lib/i18n/generated/hooks"') &&
    !next.includes('from "../../lib/i18n/generated/hooks"') &&
    !next.includes('from "../../../src/lib/i18n/generated/hooks"')
  ) {
    // Preserve relative depth from file - use @ alias if mobile has it
    const importPath = next.includes('from "@/')
      ? "@/lib/i18n/generated/hooks"
      : detectMobileImportPath(next);
    next = `import { ${[...usedHooks].sort().join(", ")} } from "${importPath}";\n${next}`;
  }

  return next;
}

function detectMobileImportPath(content) {
  if (content.includes('from "../../../src/')) {
    return "../../../src/lib/i18n/generated/hooks";
  }
  if (content.includes('from "../../lib/')) {
    return "../../lib/i18n/generated/hooks";
  }
  return "@/lib/i18n/generated/hooks";
}

const target = process.argv[2] ?? "webapp";

if (target === "webapp") {
  const root = join(repoRoot, "apps/webapp/src");
  let count = 0;
  for (const file of walk(root)) {
    const before = readFileSync(file, "utf8");
    const after = migrateWebapp(before, file);
    if (after !== before) {
      writeFileSync(file, after);
      count++;
    }
  }
  console.log(`migrate-i18n-hooks webapp: updated ${count} files`);
} else if (target === "mobile") {
  const roots = [join(repoRoot, "apps/mobile/src"), join(repoRoot, "apps/mobile/app")];
  let count = 0;
  for (const root of roots) {
    for (const file of walk(root)) {
      const before = readFileSync(file, "utf8");
      const after = migrateMobile(before);
      if (after !== before) {
        writeFileSync(file, after);
        count++;
      }
    }
  }
  console.log(`migrate-i18n-hooks mobile: updated ${count} files`);
}
