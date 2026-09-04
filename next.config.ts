import type { NextConfig } from "next";

// Set on all routes to harden against clickjacking (X-Frame-Options),
// MIME sniffing (X-Content-Type-Options), referrer leakage
// (Referrer-Policy), and unnecessary browser feature access
// (Permissions-Policy). HSTS is already provided by Vercel. A Content
// Security Policy is intentionally not set here: a strict CSP without
// nonces would break Next.js inline runtime scripts/styles.
const securityHeaders = [
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
