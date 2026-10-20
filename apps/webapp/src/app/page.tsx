import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { redirectRoute } from "@/lib/navigation/redirect/route";
import { routeAssert } from "@/lib/navigation/route/assert";

export default function Home() {
  redirectRoute(routeAssert(WEBAPP_ROUTES.HOME));
}
