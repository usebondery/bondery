import { HELP_DOCS_URL } from "@bondery/helpers";
import { redirect } from "next/navigation";

export default function DocsPage() {
  redirect(HELP_DOCS_URL);
}
