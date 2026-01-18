import { headers } from "next/headers";
import * as translations from "@bondery/translations";

type SupportedLocale = keyof typeof translations;

/**
 * Get locale from browser's Accept-Language header
 */
export async function getLocaleFromHeaders(): Promise<SupportedLocale> {
  const headersList = await headers();
  const acceptLanguage = headersList.get("accept-language") || "";

  const languages = acceptLanguage
    .split(",")
    .map((lang) => {
      const [code, priority] = lang.trim().split(";q=");
      return {
        code: code.split("-")[0].toLowerCase(),
        priority: priority ? parseFloat(priority) : 1,
      };
    })
    .sort((a, b) => b.priority - a.priority);

  for (const { code } of languages) {
    if (code in translations) {
      return code as SupportedLocale;
    }
  }

  return "en";
}
