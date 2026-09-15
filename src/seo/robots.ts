import { buildAbsoluteUrl } from "./site.ts";

export const ADMIN_DISALLOW_RULES = ["/admin/", "/admin/*"];

export function buildRobotsRules() {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ADMIN_DISALLOW_RULES
      }
    ],
    sitemap: buildAbsoluteUrl("/sitemap.xml")
  };
}
