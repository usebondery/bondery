// Patched by packages/translations/scripts/generate-i18n-catalog.mjs — do not edit.
import type { Catalog } from "../i18n/catalog-types";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    enableSelector: false;
    resources: Catalog;
  }
}
