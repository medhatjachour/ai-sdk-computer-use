import type { NextConfig } from "next";

// @vercel/sandbox uses xdg-app-paths which requires HOME on Linux/Mac.
// On Windows, HOME is not set by default — fall back to USERPROFILE.
// Belt-and-suspenders: also handled in instrumentation.ts and sandbox/utils.ts
if (!process.env.HOME) {
  process.env.HOME =
    process.env.USERPROFILE ??
    process.env.HOMEPATH ??
    "C:/Users/medha";
}

const nextConfig: NextConfig = {
  // Prevent webpack from bundling @vercel/sandbox so it is require()'d at
  // runtime, by which point process.env.HOME is already set (from .env.local
  // and from the patch above). Without this, xdg-app-paths (a transitive dep)
  // evaluates HOME at bundle-evaluation time before env vars are injected.
  serverExternalPackages: ["@vercel/sandbox"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "frame-src https://*.vercel.app https://*.vercel.run https://va.vercel-scripts.com",
              "frame-ancestors 'self' https://*.vercel.app https://*.vercel.run",
              "connect-src 'self' https://*.vercel.app https://*.vercel.run",
              "img-src 'self' data: https://*.vercel.app https://*.vercel.run",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://*.vercel.app https://*.vercel.run https://va.vercel-scripts.com",
              "style-src 'self' 'unsafe-inline'",
            ].join("; "),
          },
          {
            key: "X-Frame-Options",
            value: "SAMEORIGIN",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
