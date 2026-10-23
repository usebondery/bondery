import { permanentRedirect, redirect } from "next/navigation";

type NextRedirectArg = Parameters<typeof redirect>[0];

/** Absolute URL outside the website route table (API host, webapp). */
export function redirectExternal(absoluteUrl: string): never {
  redirect(absoluteUrl as NextRedirectArg);
}

export function permanentRedirectExternal(absoluteUrl: string): never {
  permanentRedirect(absoluteUrl as NextRedirectArg);
}
