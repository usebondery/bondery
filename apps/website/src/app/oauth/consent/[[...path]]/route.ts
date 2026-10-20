import { redirectWebapp } from "@/lib/navigation/redirect/webapp";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { path } = await params;
  const requestUrl = new URL(request.url);
  redirectWebapp("/oauth/consent", path ?? [], requestUrl.search);
}
