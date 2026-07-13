import { WEBAPP_NAME } from "@bondery/helpers/globals/paths";
import type { Metadata } from "next";

/**
 * Sync root metadata so title.default is in the initial HTML (avoids URL flash
 * while async child generateMetadata streams). Description is English-only here;
 * localized copy lives in per-route metadata when needed.
 */
export const rootMetadata: Metadata = {
  description: "Build bonds that last forever.",
  title: WEBAPP_NAME,
};
