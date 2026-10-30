import type { NextRequest } from "next/server";

import { updateSupabaseSession } from "./src/supabase/proxy.ts";

export async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-mechanicmatch-locale", request.nextUrl.pathname === "/es" || request.nextUrl.pathname.startsWith("/es/") ? "es" : "en");
  return updateSupabaseSession(request, requestHeaders);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
