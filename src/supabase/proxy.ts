import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { getSupabaseClientSafeConfig, hasSupabaseClientSafeConfig } from "../config/supabaseEnvironment.ts";

export async function updateSupabaseSession(request: NextRequest, requestHeaders: Headers = request.headers) {
  const forwardedRequest = { headers: requestHeaders };
  if (!hasSupabaseClientSafeConfig()) {
    return NextResponse.next({ request: forwardedRequest });
  }

  const config = getSupabaseClientSafeConfig();
  let response = NextResponse.next({ request: forwardedRequest });

  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request: forwardedRequest });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      }
    }
  });

  await supabase.auth.getUser();

  return response;
}
