import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const cspHeader = `
    default-src 'self';
    connect-src 'self' https://api.stripe.com https://pay.google.com https://openpipestorage.blob.core.windows.net data:;
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://cdn.jsdelivr.net https://js.stripe.com;
    style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net;
    img-src 'self' blob: data: https://avatars.githubusercontent.com;
    font-src 'self' https://cdn.jsdelivr.net;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
    frame-ancestors 'none';
    block-all-mixed-content;
    upgrade-insecure-requests;
    worker-src 'self' blob:;
    frame-src 'self' https://js.stripe.com;
`;
  // Replace newline characters and spaces
  const contentSecurityPolicyHeaderValue = cspHeader.replace(/\s{2,}/g, " ").trim();

  const requestHeaders = new Headers(req.headers);

  requestHeaders.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  const response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
  response.headers.set("Content-Security-Policy", contentSecurityPolicyHeaderValue);

  return response;
}
