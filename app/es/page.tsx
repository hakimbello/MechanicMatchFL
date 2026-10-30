import { buildHomeMetadata } from "../../src/seo/metadata.ts";
import { listRuntimePublicProviders } from "../../src/providers/runtimeProviderPersistence.ts";
import { MechanicSearchExperience } from "../search-experience";

export const metadata = buildHomeMetadata("es");
export const dynamic = "force-dynamic";

export default async function SpanishHomePage() {
  const providers = await listRuntimePublicProviders();
  return <MechanicSearchExperience providers={providers} locale="es" />;
}
