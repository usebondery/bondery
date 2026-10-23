import { WEBSITE_ROUTES } from "@bondery/helpers/globals/paths";
import { permanentRedirect } from "next/navigation";
import { routeAssert } from "@/lib/navigation/route/assert";

export function GET() {
  permanentRedirect(routeAssert(WEBSITE_ROUTES.LLMS_TXT));
}
