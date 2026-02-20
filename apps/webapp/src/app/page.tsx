import { redirect } from "next/navigation";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";

export default function Home() {
  redirect(WEBAPP_ROUTES.HOME);
}
