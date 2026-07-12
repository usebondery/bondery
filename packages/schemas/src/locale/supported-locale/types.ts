export interface AppLocaleMetadata {
  code: string;
  flag: string;
  nativeName: string;
}

import localeCatalog from "../../../locale/supported-locales.json" with { type: "json" };

type LocaleEntry = (typeof localeCatalog.supported)[number];
export type SupportedLocale = LocaleEntry["code"];
