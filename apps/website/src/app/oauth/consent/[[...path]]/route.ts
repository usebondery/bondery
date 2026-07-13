import { redirect } from "next/navigation";
import { webappUrl } from "@/lib/webapp-url";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { path } = await params;
  const requestUrl = new URL(request.url);
  const target = webappUrl("/oauth/consent", path ?? []);
  redirect(`${target}${requestUrl.search}`);
}
