import type { NextConfig } from "next";

import { NOINDEX_HEADERS, SECURITY_HEADERS } from "./src/security/headers.ts";

const SENSITIVE_HTML_ROUTES = [
  "/admin/:path*",
  "/provider/:path*",
  "/reviews/verify",
  "/es/reviews/verify",
  "/safety/report",
  "/es/safety/report"
] as const;

const nextConfig: NextConfig = {
  agentRules: false,
  experimental: {
    serverActions: {
      bodySizeLimit: "5mb"
    }
  },
  async headers() {
    return [
      ...SENSITIVE_HTML_ROUTES.map((source) => ({ source, headers: NOINDEX_HEADERS })),
      {
        source: "/:path*",
        headers: SECURITY_HEADERS
      }
    ];
  },
  turbopack: {
    root: process.cwd()
  }
};

export default nextConfig;
