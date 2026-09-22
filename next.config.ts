import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /admin/login was merged into the single /login screen (it redirects
      // by role), kept for anyone with the old URL bookmarked.
      { source: "/admin/login", destination: "/login", permanent: true },
    ];
  },
};

export default nextConfig;
