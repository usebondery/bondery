import { WEBSITE_ROUTES } from "@bondery/helpers";
import { permanentRedirect } from "next/navigation";

export function GET() {
  permanentRedirect(WEBSITE_ROUTES.DOCS_API_REFERENCE);
}
