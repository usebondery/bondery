import { preloadMobileNamespaces } from "../../lib/i18n/i18n";

export async function ensureMobileNamespaces(groups: string[]) {
  await preloadMobileNamespaces(groups);
}
