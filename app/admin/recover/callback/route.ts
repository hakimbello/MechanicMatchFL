import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_PASSWORD_RECOVERY_UPDATE_PATH } from "../../../../src/admin/passwordRecovery.ts";
import { createSupabaseServerAuthClient } from "../../../../src/supabase/serverClient.ts";

export async function GET(request: NextRequest) {
  const recoveryUrl = new URL(ADMIN_PASSWORD_RECOVERY_UPDATE_PATH, request.nextUrl.origin);
  const code = request.nextUrl.searchParams.get("code");
  const flowId = request.nextUrl.searchParams.get("sb_flow_id");
  const providerError =
    request.nextUrl.searchParams.get("error") ?? request.nextUrl.searchParams.get("error_code");

  if (providerError || !code) {
    recoveryUrl.searchParams.set("error", "invalid-link");
    return NextResponse.redirect(recoveryUrl);
  }

  try {
    const supabase = await createSupabaseServerAuthClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code, flowId ? { flowId } : undefined);

    if (error) {
      recoveryUrl.searchParams.set("error", "invalid-link");
    }
  } catch {
    recoveryUrl.searchParams.set("error", "invalid-link");
  }

  return NextResponse.redirect(recoveryUrl);
}
