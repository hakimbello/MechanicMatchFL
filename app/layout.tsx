import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

import { buildRootMetadata } from "../src/seo/metadata.ts";

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
