import { redirect } from "next/navigation";
import { webappUrl } from "@/lib/webapp-url";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { path } = await params;
  redirect(webappUrl("/oauth/consent", path ?? []));
}
