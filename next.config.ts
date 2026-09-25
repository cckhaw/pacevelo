import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // /admin/login was merged into the single /login screen (it redirects
      // by role), kept for anyone with the old URL bookmarked.
      { source: "/admin/login", destination: "/login", permanent: true },
      // Static explainer player in public/explainer; Next.js does not map a
      // folder URL to its index.html on its own.
      { source: "/explainer", destination: "/explainer/index.html", permanent: false },
    ];
  },
};

export default nextConfig;
