export const SUPABASE_CLIENT_SAFE_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
] as const;

export const SUPABASE_SERVER_ONLY_ENV_VARS = ["SUPABASE_SECRET_KEY"] as const;

export interface SupabaseEnvironmentContract {
  clientSafe: readonly (typeof SUPABASE_CLIENT_SAFE_ENV_VARS)[number][];
  serverOnly: readonly (typeof SUPABASE_SERVER_ONLY_ENV_VARS)[number][];
}

export const SUPABASE_ENVIRONMENT_CONTRACT: SupabaseEnvironmentContract = {
  clientSafe: SUPABASE_CLIENT_SAFE_ENV_VARS,
  serverOnly: SUPABASE_SERVER_ONLY_ENV_VARS
};

export function assertNoServerOnlySupabaseEnvIsClientExposed() {
  const exposed = SUPABASE_SERVER_ONLY_ENV_VARS.filter((name) => name.startsWith("NEXT_PUBLIC_"));

  if (exposed.length > 0) {
    throw new Error(`Server-only Supabase environment variables must not be client exposed: ${exposed.join(", ")}`);
  }
}
