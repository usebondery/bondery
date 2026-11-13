export type LocaleTextDirection = "ltr" | "rtl";

export interface AppLocaleMetadata {
  code: string;
  dir: LocaleTextDirection;
  flag: string;
  /** BCP 47 tag for Intl, speech, and dayjs region rules. */
  intl: string;
  nativeName: string;
}

import localeCatalog from "../../../locale/supported-locales.json" with { type: "json" };

type LocaleEntry = (typeof localeCatalog.supported)[number];
export type SupportedLocale = LocaleEntry["code"];
