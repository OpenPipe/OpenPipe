import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TODO: Move this https redirect to a load balancer
export function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") || req.nextUrl.hostname;

  if (!req.headers.get("x-forwarded-proto")?.includes("https") && !hostname.includes("localhost")) {
    const url = new URL(req.nextUrl.pathname, `https://${hostname}`);
    return NextResponse.redirect(url, 301);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const cspHeader = `
  default-src 'self';
  script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com/v3;
  style-src 'self' 'unsafe-inline';
  img-src 'self' blob: data: https://avatars.githubusercontent.com;
  font-src 'self';
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  block-all-mixed-content;
  upgrade-insecure-requests;
  worker-src 'self' blob:;
`;
  // Replace newline characters and spaces
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);

  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
