import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// TODO: Move this https redirect to a load balancer
export function middleware(req: NextRequest) {
  const hostname = req.headers.get("host") || req.nextUrl.hostname;

  if (!req.headers.get("x-forwarded-proto")?.includes("https") && !hostname.includes("localhost")) {
    const url = new URL(req.nextUrl.pathname, `https://${hostname}`);
    return NextResponse.redirect(url, 301);
  }
  return NextResponse.next();
}
