import { permanentRedirect, redirect } from "next/navigation";

type NextRedirectArg = Parameters<typeof redirect>[0];

/**
 * Redirect to an absolute URL outside the webapp route table (marketing site, well-known proxy).
 */
export function redirectExternal(absoluteUrl: string): never {
  redirect(absoluteUrl as NextRedirectArg);
}

export function permanentRedirectExternal(absoluteUrl: string): never {
  permanentRedirect(absoluteUrl as NextRedirectArg);
}
