import { OgTitled } from "@bondery/branding/og";
import landing from "@bondery/translations/locales/en/platform/website/WebsiteLanding.json" with {
  type: "json",
};
import { createOgImageResponse, OG_IMAGE_CONTENT_TYPE } from "@/lib/og/imageResponse";

export const alt = landing.Meta.ContactTitle;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const size = { height: 630, width: 1200 };

export default async function Image() {
  return createOgImageResponse(<OgTitled title={landing.Meta.ContactTitle} />);
}
