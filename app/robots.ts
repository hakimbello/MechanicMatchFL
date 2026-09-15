import type { MetadataRoute } from "next";

import { buildRobotsRules } from "../src/seo/robots.ts";

export default function robots(): MetadataRoute.Robots {
  return buildRobotsRules();
}
