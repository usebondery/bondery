import { OgTitled } from "@bondery/branding/og";
import legal from "@bondery/translations/locales/en/platform/website/WebsiteLegal.json" with {
  type: "json",
};
import { createOgImageResponse, OG_IMAGE_CONTENT_TYPE } from "@/lib/og/imageResponse";

export const alt = legal.Documents.Privacy.Title;
export const contentType = OG_IMAGE_CONTENT_TYPE;
export const size = { height: 630, width: 1200 };

export default async function Image() {
  return createOgImageResponse(<OgTitled title={legal.Documents.Privacy.Title} />);
}
