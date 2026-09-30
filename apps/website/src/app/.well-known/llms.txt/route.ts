import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { permanentRedirect } from "next/navigation";

export function GET() {
  permanentRedirect(WEBSITE_ROUTES.LLMS_TXT);
}
