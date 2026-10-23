import { parseOAuthProvidersResponse } from "@bondery/helpers/auth/oauth-providers";
import { API_ROUTES } from "@bondery/helpers/globals/paths";
import type { OAuthProvidersBitmap } from "@bondery/schemas/oauth-providers";
import { IconBrandGithub, IconBrandLinkedin } from "@tabler/icons-react-native";
import { API_URL } from "../../lib/config";
import { OAUTH_PROVIDER_COLORS } from "../../theme/colors";

export type LoginOAuthProvider = "github" | "linkedin";

export type LoginBusyAction = LoginOAuthProvider | "passkey" | "email" | null;

export const LOGIN_OAUTH_PROVIDERS: Array<{
  backgroundColor: string;
  Icon: typeof IconBrandGithub;
  labelKey: "Providers.GitHub" | "Providers.LinkedIn";
  pressedBackgroundColor: string;
  provider: LoginOAuthProvider;
  textColor: string;
}> = [
  {
    backgroundColor: OAUTH_PROVIDER_COLORS.github.background,
    Icon: IconBrandGithub,
    labelKey: "Providers.GitHub",
    pressedBackgroundColor: OAUTH_PROVIDER_COLORS.github.backgroundPress,
    provider: "github",
    textColor: OAUTH_PROVIDER_COLORS.github.text,
  },
  {
    backgroundColor: OAUTH_PROVIDER_COLORS.linkedin.background,
    Icon: IconBrandLinkedin,
    labelKey: "Providers.LinkedIn",
    pressedBackgroundColor: OAUTH_PROVIDER_COLORS.linkedin.backgroundPress,
    provider: "linkedin",
    textColor: OAUTH_PROVIDER_COLORS.linkedin.text,
  },
];

export async function fetchOAuthProvidersBitmap(): Promise<OAuthProvidersBitmap | null> {
  if (!API_URL) {
    return null;
  }

  try {
    const response = await fetch(`${API_URL}${API_ROUTES.OAUTH_PROVIDERS}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      return null;
    }
    return parseOAuthProvidersResponse(await response.json());
  } catch {
    return null;
  }
}
