import { execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { detachPromise } from "@bondery/helpers/async";
import GithubSlugger from "github-slugger";
import {
  type FileObject,
  printErrors,
  scanURLs,
  type ValidateResult,
  validateFiles,
} from "next-validate-link";
import { glob } from "tinyglobby";

import { createCheck } from "../../../scripts/check/check-report.mjs";

const MDX_EXT_RE = /\.mdx$/;
const MARKDOWN_HEADING_RE = /^#{1,6}\s+(.+?)\s*$/;
const DOCS_URL_RE = /^\/docs(?:\/|$)/;
const report = createCheck("check-docs-mdx");

const DOCS_DIR = join(process.cwd(), "../../docs");

function isDocsPath(filePath: string): boolean {
  return filePath.startsWith(`${DOCS_DIR}/`);
}

function filePathToSlugs(filePath: string): string[] {
  const rel = relative(DOCS_DIR, filePath).replace(MDX_EXT_RE, "");
  if (rel === "index") {
    return [];
  }
  if (rel.endsWith("/index")) {
    return rel.slice(0, -"/index".length).split("/");
  }
  return rel.split("/");
}

function filePathToUrl(filePath: string): string {
  const slugs = filePathToSlugs(filePath);
  return slugs.length === 0 ? "/docs" : `/docs/${slugs.join("/")}`;
}

function resolveDocsFilePath(path: string): string | undefined {
  const candidates = [path, `${path}.mdx`, join(path, "index.mdx")];

  for (const candidate of candidates) {
    if (isDocsPath(candidate) && existsSync(candidate)) {
      return candidate;
    }
  }

  return undefined;
}

function pathToUrl(path: string): string | undefined {
  const resolved = resolveDocsFilePath(path);
  return resolved ? filePathToUrl(resolved) : undefined;
}

function isAllowedHref(href: string): boolean {
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("mailto:") ||
    href.startsWith("#")
  ) {
    return true;
  }

  // Repo source links from docs (outside the docs content tree).
  if (href.startsWith("../../") || href.includes("/../../")) {
    return true;
  }

  return false;
}

function getHeadingsFromRaw(content: string): string[] {
  const slugger = new GithubSlugger();
  const headings = new Set<string>();

  for (const line of content.split("\n")) {
    for (const match of line.matchAll(/\{#([^}]+)\}/g)) {
      const [, id] = match;
      if (id !== undefined) {
        headings.add(id);
      }
    }

    const heading = line.match(MARKDOWN_HEADING_RE);
    if (!heading) {
      continue;
    }

    const text = (heading[1] ?? "").replace(/\s*\{#[^}]+\}\s*/g, "").trim();
    if (text) {
      headings.add(slugger.slug(text));
    }
  }

  return [...headings];
}

async function checkLinks() {
  execSync("npm run generate:api-docs", { cwd: process.cwd(), stdio: "inherit" });

  const files = await glob("**/*.mdx", {
    absolute: true,
    cwd: DOCS_DIR,
  });

  const scanned = await scanURLs({
    cwd: join(process.cwd(), "src/app"),
    populate: {
      "docs/[[...slug]]": files.map((filePath) => {
        const content = readFileSync(filePath, "utf8");
        return {
          hashes: getHeadingsFromRaw(content),
          value: {
            slug: filePathToSlugs(filePath),
          },
        };
      }),
    },
    preset: "next",
  });

  for (const filePath of files) {
    const content = readFileSync(filePath, "utf8");
    scanned.urls.set(filePathToUrl(filePath), {
      hashes: getHeadingsFromRaw(content),
    });
  }

  scanned.fallbackUrls.push({
    meta: {},
    url: DOCS_URL_RE,
  });

  console.log(`Collected ${scanned.urls.size} URLs, ${scanned.fallbackUrls.length} fallbacks.`);

  const fileObjects: FileObject[] = files.map((filePath) => ({
    content: readFileSync(filePath, "utf8"),
    data: {},
    path: filePath,
    url: filePathToUrl(filePath),
  }));

  const results = await validateFiles(fileObjects, {
    baseDir: DOCS_DIR,
    checkRelativePaths: "exists",
    checkRelativeUrls: true,
    determinatePathname: (pathname: string) => {
      if (pathname.endsWith(".mdx")) {
        return "relative-file-path";
      }
      return "relative-url";
    },
    markdown: {
      components: {},
    },
    pathToUrl,
    scanned,
    whitelist: isAllowedHref,
  });

  printErrors(results, true);

  const errorCount = results.reduce(
    (count: number, result: ValidateResult) => count + result.errors.length,
    0,
  );
  if (errorCount > 0) {
    report.add(`${errorCount} link validation error(s)`);
  }
  report.ok(`${files.length} files, ${scanned.urls.size} routes`);
}

detachPromise(checkLinks(), (error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
