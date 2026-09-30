import { SOCIAL_LINKS } from "@bondery/helpers";
import Link from "next/link";
import { getChangelogFeedPages, releaseHeadingLabel } from "@/lib/changelog";
import { changelogGithubReleaseUrl, changelogVersionHeadingId } from "@/lib/changelog-github";

export function ChangelogIndex() {
  const { releases } = getChangelogFeedPages();

  return (
    <>
      {releases.map((entry) => {
        const version = entry.slugs[1];
        if (!version) {
          return null;
        }
        const heading = releaseHeadingLabel(version);
        const githubUrl = changelogGithubReleaseUrl(version);

        return (
          <section key={entry.url}>
            <h2 id={changelogVersionHeadingId(version)}>{heading}</h2>
            <ul>
              <li>
                <Link href={`/docs/changelog/${version}`}>Changelog</Link>
              </li>
              {githubUrl ? (
                <li>
                  <a href={githubUrl} rel="noreferrer" target="_blank">
                    GitHub release
                  </a>
                </li>
              ) : null}
            </ul>
          </section>
        );
      })}
      <p>
        Earlier Bondery versions were not published as GitHub Releases. See{" "}
        <a href={`${SOCIAL_LINKS.github}/releases`} rel="noreferrer" target="_blank">
          GitHub Releases
        </a>{" "}
        for tagged versions.
      </p>
    </>
  );
}
