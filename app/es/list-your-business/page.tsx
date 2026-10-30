import { ProviderSubmissionForm } from "../../list-your-business/provider-submission-form";
import { buildListBusinessMetadata } from "../../../src/seo/metadata.ts";

export const metadata = buildListBusinessMetadata("es");

export default function SpanishListYourBusinessPage() {
  return <ProviderSubmissionForm locale="es" />;
}
