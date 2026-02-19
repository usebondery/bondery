import { GITHUB_REPO_URL } from "@bondery/helpers";
import { HeaderClient } from "./HeaderClient";

const FALLBACK_STARS = 3;

type GithubRepoResponse = {
  stargazers_count?: number;
};

/**
 * Fetches GitHub stars for the configured repository using Next.js fetch cache.
 * Falls back to a default value when the API is unavailable.
 */
async function getGithubStars(): Promise<number> {
  try {
    const response = await fetch(GITHUB_REPO_URL, {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      return FALLBACK_STARS;
    }

    const data = (await response.json()) as GithubRepoResponse;
    return typeof data.stargazers_count === "number" ? data.stargazers_count : FALLBACK_STARS;
  } catch {
    return FALLBACK_STARS;
  }
}

export async function Header() {
  const initialStars = await getGithubStars();
  return <HeaderClient initialStars={initialStars} />;
}
