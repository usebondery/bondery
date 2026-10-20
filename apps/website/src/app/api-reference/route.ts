import { WEBSITE_ROUTES } from "@bondery/helpers";
import { permanentRedirect } from "next/navigation";
import { routeAssert } from "@/lib/navigation/route/assert";

export function GET() {
  permanentRedirect(routeAssert(WEBSITE_ROUTES.DOCS_API_REFERENCE));
}
