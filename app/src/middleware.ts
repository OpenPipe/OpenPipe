import type { NextRequest } from "next/server";
import { middleware as httpsRedirectMiddleware } from "./middleware/httpsRedirect";
import { middleware as cspMiddleware } from "./middleware/csp";

export function middleware(req: NextRequest) {
  // Run HTTPS redirect middleware
  httpsRedirectMiddleware(req);

  // Check if CSP should be applied
  return cspMiddleware(req);
}
