import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";
import * as translations from "@bondery/translations";

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = store.get("locale")?.value || "en";

  return {
    locale,
    messages: translations[locale as keyof typeof translations] || translations.en,
  };
});
