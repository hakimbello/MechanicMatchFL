export const SUPABASE_CLIENT_SAFE_ENV_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
] as const;

export const SUPABASE_SERVER_ONLY_ENV_VARS = ["SUPABASE_SECRET_KEY"] as const;

export class MissingSupabaseConfigurationError extends Error {
  readonly missingNames: string[];

  constructor(missingNames: string[]) {
    super("Supabase configuration is missing.");
    this.name = "MissingSupabaseConfigurationError";
    this.missingNames = missingNames;
  }
}

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

export interface SupabaseClientSafeConfig {
  url: string;
  publishableKey: string;
}

export interface SupabaseServerSecretConfig extends SupabaseClientSafeConfig {
  secretKey: string;
}

type SupabaseEnvironment = Partial<
  Record<"NEXT_PUBLIC_SUPABASE_URL" | "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" | "SUPABASE_SECRET_KEY", string>
>;

export function getSupabaseClientSafeConfig(
  env: SupabaseEnvironment = process.env as unknown as SupabaseEnvironment
): SupabaseClientSafeConfig {
  const missing = missingSupabaseClientSafeNames(env);
  if (missing.length > 0) {
    throw new MissingSupabaseConfigurationError(missing);
  }

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    publishableKey: env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!.trim()
  };
}

export function getSupabaseServerSecretConfig(
  env: SupabaseEnvironment = process.env as unknown as SupabaseEnvironment
): SupabaseServerSecretConfig {
  const missing = [...missingSupabaseClientSafeNames(env), ...missingSupabaseServerSecretNames(env)];
  if (missing.length > 0) {
    throw new MissingSupabaseConfigurationError(missing);
  }

  return {
    ...getSupabaseClientSafeConfig(env),
    secretKey: env.SUPABASE_SECRET_KEY!.trim()
  };
}

export function hasSupabaseClientSafeConfig(env: SupabaseEnvironment = process.env as unknown as SupabaseEnvironment): boolean {
  return missingSupabaseClientSafeNames(env).length === 0;
}

export function hasSupabaseServerSecretConfig(
  env: SupabaseEnvironment = process.env as unknown as SupabaseEnvironment
): boolean {
  return missingSupabaseClientSafeNames(env).length === 0 && missingSupabaseServerSecretNames(env).length === 0;
}

function missingSupabaseClientSafeNames(env: SupabaseEnvironment): string[] {
  return SUPABASE_CLIENT_SAFE_ENV_VARS.filter((name) => !env[name]?.trim());
}

function missingSupabaseServerSecretNames(env: SupabaseEnvironment): string[] {
  return SUPABASE_SERVER_ONLY_ENV_VARS.filter((name) => !env[name]?.trim());
}
