import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

function parseOrigin(url?: string): string | null {
	if (!url) {
		return null;
	}

	try {
		return new URL(url).origin;
	} catch {
		return null;
	}
}

export async function proxy(request: NextRequest) {
	const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
	const isDev = process.env.NODE_ENV === "development";
	const apiOrigin = parseOrigin(process.env.NEXT_PUBLIC_API_URL);
	const supabaseOrigin = parseOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
	const supabaseWsOrigin = supabaseOrigin
		? supabaseOrigin.replace("https://", "wss://").replace("http://", "ws://")
		: null;

	const connectSrcValues = [
		"'self'",
		apiOrigin,
		supabaseOrigin,
		supabaseWsOrigin,
		"https://api.github.com",
		"https://tiles.openfreemap.org",
	].filter(Boolean);

	const imgSrcValues = [
		"'self'",
		"blob:",
		"data:",
		apiOrigin,
		supabaseOrigin,
		"https://avatars.githubusercontent.com",
		"https://*.githubusercontent.com",
		"https://*.licdn.com",
	].filter(Boolean);

	const scriptSrcDirective = isDev
		? "script-src 'self' 'unsafe-inline' 'unsafe-eval';"
		: `script-src 'self' 'nonce-${nonce}' 'strict-dynamic';`;

	const cspHeader = `
		default-src 'self';
		${scriptSrcDirective}
		style-src 'self' ${isDev ? "'unsafe-inline'" : `'nonce-${nonce}'`};
		img-src ${imgSrcValues.join(" ")};
		font-src 'self';
		connect-src ${connectSrcValues.join(" ")};
		object-src 'none';
		base-uri 'self';
		form-action 'self';
		frame-ancestors 'none';
		upgrade-insecure-requests;
	`;

	const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, " ").trim();

	const requestHeaders = new Headers(request.headers);
	if (!isDev) {
		requestHeaders.set("x-nonce", nonce);
	}
	requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

	const response = await updateSession(request, requestHeaders);
	response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

	return response;
}

export const config = {
	matcher: [
		"/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
	],
};
