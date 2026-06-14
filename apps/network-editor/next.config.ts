import path from "path";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname, "../.."),
  },
  transpilePackages: ["@eng-suite/physics", "@eng-suite/ui-kit"],
  basePath: "/network-editor",
  async redirects() {
    return [
      {
        source: "/",
        destination: "/network-editor",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
