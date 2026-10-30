import type { Metadata } from "next";
import Link from "next/link";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import "./globals.css";

import { buildRootMetadata } from "../src/seo/metadata.ts";
import { SiteAnalytics } from "./site-analytics";
import { normalizePublicLocale, localizePublicPath } from "../src/i18n/locale.ts";
import { getPublicMessages } from "../src/i18n/messages.ts";
import { PublicNavigation } from "./public-navigation";

export const metadata: Metadata = buildRootMetadata();

export default async function RootLayout({ children }: { children: ReactNode }) {
  const locale = normalizePublicLocale((await headers()).get("x-mechanicmatch-locale"));
  const messages = getPublicMessages(locale).navigation;
  return (
    <html lang={locale === "es" ? "es-US" : "en-US"}>
      <body>
        <a className="skip-link" href="#main-content">{messages.skipToContent}</a>
        <PublicNavigation />
        <div id="main-content" tabIndex={-1}>{children}</div>
        <footer className="site-footer">
          {locale === "es" ? <Link href="/es/privacy">{messages.privacy}</Link> : <Link href="/privacy">{messages.privacy}</Link>}
          <Link href="/provider/login">{messages.providerAccount}</Link>
          <Link href={localizePublicPath("/safety/report", locale)}>{messages.safetyReport}</Link>
        </footer>
        <SiteAnalytics />
      </body>
    </html>
  );
}
