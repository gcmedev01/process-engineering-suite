import path from "path";
import type { NextConfig } from "next";
import bundleAnalyzer from "@next/bundle-analyzer";

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "");
const apiProxyTarget = stripTrailingSlash(
  process.env.API_PROXY_TARGET?.trim() ||
    process.env.NEXT_PUBLIC_API_URL?.trim() ||
    "http://localhost:8000",
);

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  transpilePackages: [
    "@eng-suite/physics",
    "@eng-suite/ui-kit",
  ],
  basePath: "/psv",
  async redirects() {
    return [
      {
        source: "/",
        destination: "/psv",
        permanent: false,
        basePath: false,
      },
    ];
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${apiProxyTarget}/:path*`,
      },
    ];
  },
};

const withBundleAnalyzer = bundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);
