import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";
import "./globals.css";

import { buildRootMetadata } from "../src/seo/metadata.ts";
import { SiteAnalytics } from "./site-analytics";

export const metadata: Metadata = buildRootMetadata();

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <footer className="site-footer">
          <Link href="/privacy">Privacy</Link>
          <Link href="/provider/login">Provider Account</Link>
          <Link href="/safety/report">Safety Report</Link>
        </footer>
        <SiteAnalytics />
      </body>
    </html>
  );
}
