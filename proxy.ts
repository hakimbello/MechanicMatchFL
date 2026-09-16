import type { NextRequest } from "next/server";

import { updateSupabaseSession } from "./src/supabase/proxy.ts";

export async function proxy(request: NextRequest) {
  return updateSupabaseSession(request);
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"
  ]
};
