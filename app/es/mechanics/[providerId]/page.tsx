import type { Metadata } from "next";

import { generateLocalizedMetadata, renderMechanicProfilePage } from "../../../mechanics/[providerId]/page";

type Props = {
  params: Promise<{ providerId: string }>;
  searchParams: Promise<{ service?: string; make?: string; zip?: string }>;
};

export const dynamic = "force-dynamic";

export function generateMetadata({ params }: Props): Promise<Metadata> {
  return generateLocalizedMetadata({ params }, "es");
}

export default function SpanishMechanicProfilePage(props: Props) {
  return renderMechanicProfilePage(props, "es");
}
