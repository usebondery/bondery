import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { redirectWebapp } from "@/lib/navigation/redirect/webapp";

export default function ChangePasswordPage() {
  redirectWebapp(WEBAPP_ROUTES.WELL_KNOWN_CHANGE_PASSWORD);
}
