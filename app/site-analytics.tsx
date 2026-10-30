"use client";

import { Analytics } from "@vercel/analytics/next";
import { usePathname } from "next/navigation";
import { stripLocalePrefix } from "../src/i18n/locale.ts";

export function SiteAnalytics() {
  const pathname = usePathname();
  if (stripLocalePrefix(pathname) === "/reviews/verify") return null;
  return <Analytics />;
}
