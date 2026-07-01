import { HELP_DOCS_URL } from "@bondery/helpers";
import { permanentRedirect } from "next/navigation";

export function GET() {
  permanentRedirect(HELP_DOCS_URL);
}
