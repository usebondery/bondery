import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { WEBAPP_ROUTES } from "@bondery/helpers/globals/paths";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;

  if (code) {
    const cookieStore = await cookies();
    const redirectPath = requestUrl.searchParams.get("redirect");
    const postLoginUrl =
      redirectPath && redirectPath.startsWith("/") ? `${origin}${redirectPath}` : `${origin}/app`;

    const response = NextResponse.redirect(postLoginUrl);

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
              response.cookies.set(name, value, options);
            });
          },
        },
      },
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      return response;
    } else {
      console.error("Error exchanging code for session:", error.message);
    }
  }

  return NextResponse.redirect(`${origin}${WEBAPP_ROUTES.LOGIN}`);
}
