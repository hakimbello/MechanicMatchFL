import { ProviderSubmissionForm } from "./provider-submission-form";
import { listBusinessMetadata } from "../../src/seo/metadata.ts";

export const metadata = listBusinessMetadata;

export default function ListYourBusinessPage() {
  return <ProviderSubmissionForm />;
}
