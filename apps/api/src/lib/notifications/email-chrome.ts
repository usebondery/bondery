import type { EmailChromeCopy } from "@bondery/emails";
import { WEBAPP_ROUTES } from "@bondery/helpers";
import type { SupportedLocale } from "@bondery/schemas/locale/supported-locale";
import { loadEmailNamespace, readCopyString } from "./email-i18n.js";

const TRAILING_SLASHES_PATTERN = /\/+$/;

const PRODUCTION_WEBAPP = "https://app.usebondery.com";
const PRODUCTION_WEBSITE = "https://usebondery.com";

function stripTrailingSlash(value: string): string {
  return value.replace(TRAILING_SLASHES_PATTERN, "");
}

export function resolveAppOrigin(): string {
  const fromEnv = process.env.BONDERY_PUBLIC_WEBAPP_URL?.trim();
  return stripTrailingSlash(fromEnv || PRODUCTION_WEBAPP);
}

export function resolveWebsiteOrigin(): string {
  const fromEnv = process.env.BONDERY_PUBLIC_WEBSITE_URL?.trim();
  return stripTrailingSlash(fromEnv || PRODUCTION_WEBSITE);
}

export function buildEmailChromeCopy(bundle: Record<string, unknown>): EmailChromeCopy {
  return {
    documentation: readCopyString(bundle, "documentation"),
    help: readCopyString(bundle, "help"),
    internalNote: readCopyString(bundle, "internalNote"),
    logoAlt: readCopyString(bundle, "logoAlt"),
    manageNotifications: readCopyString(bundle, "manageNotifications"),
    support: readCopyString(bundle, "support"),
  };
}

export function loadEmailChrome(lng: SupportedLocale): EmailChromeCopy {
  return buildEmailChromeCopy(loadEmailNamespace(lng, "EmailChrome"));
}

export function emailDocumentProps(lng: SupportedLocale, title: string) {
  return {
    chrome: loadEmailChrome(lng),
    lang: lng,
    title,
    websiteUrl: resolveWebsiteOrigin(),
  };
}

export function appSettingsUrl(): string {
  return `${resolveAppOrigin()}${WEBAPP_ROUTES.SETTINGS}`;
}
