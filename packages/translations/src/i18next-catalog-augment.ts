import type { Catalog } from "./generated/i18n/catalog-types.js";

declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "common";
    enableSelector: false;
    resources: Catalog;
  }
}
