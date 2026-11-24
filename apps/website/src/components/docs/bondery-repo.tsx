import { GITHUB_REPO_WEB_URL } from "@bondery/helpers";
import { LinkCard } from "@bondery/mantine-next";
import docs from "@bondery/translations/locales/en/platform/website/WebsiteDocs.json" with {
  type: "json",
};
import { IconBrandGithub } from "@tabler/icons-react";

/** Tile that opens the Bondery repository. */
export function BonderyRepo() {
  return (
    <LinkCard
      description={docs.Repo.Description}
      external
      href={GITHUB_REPO_WEB_URL}
      icon={<IconBrandGithub size={18} />}
      title={docs.Repo.Title}
    />
  );
}
