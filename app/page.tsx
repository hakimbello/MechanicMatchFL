import { homeMetadata } from "../src/seo/metadata.ts";
import { listRuntimePublicProviders } from "../src/providers/runtimeProviderPersistence.ts";
import { MechanicSearchExperience } from "./search-experience";

export const metadata = homeMetadata;
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const providers = await listRuntimePublicProviders();
  return <MechanicSearchExperience providers={providers} />;
}
