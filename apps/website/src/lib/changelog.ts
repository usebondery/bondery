import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { TOCItemType } from "fumadocs-core/toc";
import { changelogVersionHeadingId } from "@/lib/changelog-github";
import { source } from "@/lib/source";

const CHANGELOG_DIR = join(process.cwd(), "../../docs/changelog");
const CHANGELOG_META_PATH = join(CHANGELOG_DIR, "meta.json");
const RELEASE_HEADING_RE = /^##\s+(.+)$/m;

export const CHANGELOG_INDEX_SLUGS = ["changelog"] as const;
export const UNRELEASED_SLUGS = ["changelog", "unreleased"] as const;

function readReleaseVersions(): string[] {
  const meta = JSON.parse(readFileSync(CHANGELOG_META_PATH, "utf8")) as { pages: string[] };
  return meta.pages.filter((page) => page !== "index" && page !== "unreleased");
}

export function isUnpublishedChangelogSlug(slug: string[] | undefined): boolean {
  return (
    slug?.length === UNRELEASED_SLUGS.length &&
    slug[0] === UNRELEASED_SLUGS[0] &&
    slug[1] === UNRELEASED_SLUGS[1]
  );
}

export function isChangelogIndexSlug(slug: string[] | undefined): boolean {
  return slug?.length === CHANGELOG_INDEX_SLUGS.length && slug[0] === CHANGELOG_INDEX_SLUGS[0];
}

export function getChangelogFeedPages() {
  const versions = readReleaseVersions();
  const releases = versions
    .map((version) => source.getPage(["changelog", version]))
    .filter((page): page is NonNullable<typeof page> => page !== undefined);

  return { releases };
}

export function releaseHeadingLabel(version: string): string {
  const text = readFileSync(join(CHANGELOG_DIR, `${version}.mdx`), "utf8");
  const title = RELEASE_HEADING_RE.exec(text)?.[1]?.trim();
  if (title) {
    return title;
  }
  return `[${version}]`;
}

export function getChangelogIndexToc(): TOCItemType[] {
  const { releases } = getChangelogFeedPages();
  const toc: TOCItemType[] = [];

  for (const page of releases) {
    const version = page.slugs[1];
    if (!version) {
      continue;
    }
    toc.push({
      depth: 2,
      title: releaseHeadingLabel(version),
      url: `#${changelogVersionHeadingId(version)}`,
    });
  }

  return toc;
}
