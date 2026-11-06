import { GITHUB_REPO_WEB_URL } from "@bondery/helpers";
import { LinkCard } from "@bondery/mantine-next";
import { IconBrandGithub } from "@tabler/icons-react";

/** Tile that opens the Bondery repository. */
export function BonderyRepo() {
  return (
    <LinkCard
      description="Source code, issues, and pull requests."
      external
      href={GITHUB_REPO_WEB_URL}
      icon={<IconBrandGithub size={18} />}
      title="Bondery on GitHub"
    />
  );
}
