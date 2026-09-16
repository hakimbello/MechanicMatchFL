import type { Provider } from "../domain/providers.ts";
import { DEVELOPMENT_PROVIDERS } from "../fixtures/developmentProviders.ts";

type ProviderSourceEnvironment = Pick<NodeJS.ProcessEnv, "NODE_ENV">;

export function getDefaultProviderData(env: ProviderSourceEnvironment = process.env): Provider[] {
  return env.NODE_ENV === "production" ? [] : DEVELOPMENT_PROVIDERS;
}
