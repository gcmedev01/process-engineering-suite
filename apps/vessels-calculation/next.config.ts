import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@eng-suite/physics", "@eng-suite/engineering-units", "@eng-suite/ui-kit"],
  basePath: "/vessels-calculation",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/vessels-calculation",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/vessels-calculation",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
