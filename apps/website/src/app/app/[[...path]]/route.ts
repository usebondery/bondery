import { redirectWebapp } from "@/lib/navigation/redirect/webapp";

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { path } = await params;
  redirectWebapp("/app", path ?? []);
}
