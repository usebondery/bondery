import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";
import { redirect } from "next/navigation";

export default function Home() {
  redirect(WEBAPP_ROUTES.HOME);
}
