import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import { Analytics } from "@vercel/analytics/next";
import "./globals.css";

import { buildRootMetadata } from "../src/seo/metadata.ts";

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="site-footer">
          <Link href="/privacy">Privacy</Link>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}
