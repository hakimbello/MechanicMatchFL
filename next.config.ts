import type { NextConfig } from "next";

import { SECURITY_HEADERS } from "./src/security/headers.ts";

const nextConfig: NextConfig = {
  agentRules: false,
  async headers() {
    return [
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
