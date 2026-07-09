import i18n from "../i18n/i18n";
import { isDeviceOffline } from "../network/isDeviceOffline";

export async function resolveFetchFailureMessage(_error: unknown): Promise<string> {
  if (await isDeviceOffline()) {
    return i18n.t("errors.connection", { ns: "common" });
  }

  return i18n.t("errors.apiUnreachable", { ns: "common" });
}
