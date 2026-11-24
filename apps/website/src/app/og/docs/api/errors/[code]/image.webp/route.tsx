import { OgTitled } from "@bondery/branding/og";
import { API_ERROR_CODES, isApiErrorCode } from "@bondery/schemas/errors";
import docs from "@bondery/translations/locales/en/platform/website/WebsiteDocs.json" with {
  type: "json",
};
import { notFound } from "next/navigation";
import { formatText } from "@/lib/i18n/message";
import { createOgImageResponse } from "@/lib/og/imageResponse";

type RouteContext = {
  params: Promise<{ code: string }>;
};

async function GET(_req: Request, context: RouteContext) {
  const { code } = await context.params;
  if (!isApiErrorCode(code)) {
    notFound();
  }

  return createOgImageResponse(
    <OgTitled subtype={docs.Og.Subtype} title={formatText(docs.Og.ApiErrorTitle, { code })} />,
  );
}

function generateStaticParams() {
  return API_ERROR_CODES.map((code) => ({ code }));
}

export { GET, generateStaticParams };
export const revalidate = false;
