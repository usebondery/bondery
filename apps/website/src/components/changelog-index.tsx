import { SOCIAL_LINKS } from "@bondery/helpers";
import docs from "@bondery/translations/locales/en/platform/website/WebsiteDocs.json" with {
  type: "json",
};
import Link from "next/link";
import { getChangelogFeedPages, releaseHeadingLabel } from "@/lib/changelog";
import { changelogGithubReleaseUrl, changelogVersionHeadingId } from "@/lib/changelog-github";
import { formatMessage } from "@/lib/i18n/message";

export function ChangelogIndex() {
  const { releases } = getChangelogFeedPages();

  return (
    <>
      {releases.map((entry) => {
        const version = entry.slugs[1];
        if (!version) {
          return null;
        }
        const githubUrl = changelogGithubReleaseUrl(version);

        return (
          <section key={entry.url}>
            <h2 id={changelogVersionHeadingId(version)}>{releaseHeadingLabel(entry)}</h2>
            <ul>
              <li>
                <Link href={`/docs/changelog/${version}`}>{docs.Changelog.Changelog}</Link>
              </li>
              {githubUrl ? (
                <li>
                  <a href={githubUrl} rel="noreferrer" target="_blank">
                    {docs.Changelog.GitHubRelease}
                  </a>
                </li>
              ) : null}
            </ul>
          </section>
        );
      })}
      <p>
        {formatMessage(docs.Changelog.EarlierVersions, {
          link: (
            <a href={`${SOCIAL_LINKS.github}/releases`} rel="noreferrer" target="_blank">
              {docs.Changelog.GitHubReleases}
            </a>
          ),
        })}
      </p>
    </>
  );
}
