"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";

import { buildLocaleSwitchHref, isLocalizedPublicPath, localeFromPathname, localizePublicPath } from "../src/i18n/locale.ts";
import { getPublicMessages } from "../src/i18n/messages.ts";

export function PublicNavigation() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  if (!isLocalizedPublicPath(pathname) || pathname.endsWith("/reviews/verify")) return null;

  const locale = localeFromPathname(pathname);
  const messages = getPublicMessages(locale).navigation;
  const englishHref = buildLocaleSwitchHref(pathname, "en", searchParams);
  const spanishHref = buildLocaleSwitchHref(pathname, "es", searchParams);

  return (
    <header className="site-header">
      <nav className="site-navigation" aria-label={locale === "es" ? "Navegación principal" : "Main navigation"}>
        <Link className="site-brand" href={localizePublicPath("/", locale)}>MechanicMatchFL</Link>
        <div className="site-nav-links">
          <Link href={localizePublicPath("/", locale)}>{messages.home}</Link>
          <Link href={localizePublicPath("/list-your-business", locale)}>{messages.listBusiness}</Link>
        </div>
        <div className="language-switcher" aria-label={messages.languageLabel} role="group">
          <Link aria-current={locale === "en" ? "page" : undefined} href={englishHref} hrefLang="en-US" lang="en">{messages.english}</Link>
          <Link aria-current={locale === "es" ? "page" : undefined} href={spanishHref} hrefLang="es-US" lang="es">{messages.spanish}</Link>
        </div>
      </nav>
    </header>
  );
}
