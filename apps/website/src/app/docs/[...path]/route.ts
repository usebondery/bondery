import { HELP_DOCS_URL } from "@bondery/helpers";
import { permanentRedirect } from "next/navigation";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { path } = await params;
  const suffix = path.length > 0 ? `/${path.join("/")}` : "";
  permanentRedirect(`${HELP_DOCS_URL}${suffix}`);
}
