import type { NextConfig } from "next";

// Next.js emits inline bootstrap scripts, so script-src keeps 'unsafe-inline'
// (a nonce-based CSP would need middleware and forces fully dynamic
// rendering). Everything else is locked down: no framing, no plugins, forms
// and base URI pinned to this origin, Turnstile + Vercel Analytics only.
const isDev = process.env.NODE_ENV !== "production";
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://va.vercel-scripts.com`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "media-src 'self'",
  "font-src 'self' data:",
  "connect-src 'self' https://challenges.cloudflare.com https://vitals.vercel-insights.com",
  "frame-src https://challenges.cloudflare.com",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  ...(isDev ? [] : ["upgrade-insecure-requests"]),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
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
