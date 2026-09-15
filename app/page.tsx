import { homeMetadata } from "../src/seo/metadata.ts";
import { MechanicSearchExperience } from "./search-experience";

export const metadata = homeMetadata;

export default function HomePage() {
  return <MechanicSearchExperience />;
}
