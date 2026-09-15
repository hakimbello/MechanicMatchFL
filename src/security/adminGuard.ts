type AdminGuardEnvironment = Pick<NodeJS.ProcessEnv, "NODE_ENV">;

export function isDevelopmentAdminRouteAvailable(env: AdminGuardEnvironment = process.env): boolean {
  return env.NODE_ENV !== "production";
}
