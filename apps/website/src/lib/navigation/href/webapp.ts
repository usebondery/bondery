import { type AppHref, hrefAssert } from "@bondery/mantine-next";
import { webappUrl } from "@/lib/webapp-url";

/** Absolute webapp URL as {@link AppHref} for marketing CTAs and buttons. */
export function hrefWebapp(pathname: string, segments: string[] = []): AppHref {
  return hrefAssert(webappUrl(pathname, segments));
}

/** Webapp login entry used by header and landing CTAs. */
export function hrefWebappLogin(): AppHref {
  return hrefWebapp("/login");
}
