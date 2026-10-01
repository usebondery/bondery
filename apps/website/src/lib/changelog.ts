import { compareVersions } from "@bondery/helpers/version";
import type { TOCItemType } from "fumadocs-core/toc";
import { changelogVersionHeadingId } from "@/lib/changelog-github";
import { type Page, source } from "@/lib/source";

export const CHANGELOG_INDEX_SLUGS = ["changelog"] as const;
export const UNRELEASED_SLUGS = ["changelog", "unreleased"] as const;

function isChangelogReleasePage(page: Page): boolean {
  const [section, version] = page.slugs;
  return (
    section === "changelog" &&
    page.slugs.length === 2 &&
    version !== undefined &&
    version !== "unreleased" &&
    page.data.hidden !== true
  );
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
  const releases = source
    .getPages()
    .filter(isChangelogReleasePage)
    .toSorted((a, b) => compareVersions(b.slugs[1] ?? "", a.slugs[1] ?? ""));

  return { releases };
}

export function releaseHeadingLabel(page: Page): string {
  const version = page.slugs[1];
  const heading = page.data.toc.find((item) => item.depth === 2);
  if (heading && typeof heading.title === "string") {
    return heading.title;
  }
  return version ? `[${version}]` : "Changelog";
}

export function getChangelogIndexToc(): TOCItemType[] {
  const toc: TOCItemType[] = [];

  for (const page of getChangelogFeedPages().releases) {
    const version = page.slugs[1];
    if (!version) {
      continue;
    }
    toc.push({
      depth: 2,
      title: releaseHeadingLabel(page),
      url: `#${changelogVersionHeadingId(version)}`,
    });
  }

  return toc;
}
