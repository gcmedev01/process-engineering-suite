import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@eng-suite/physics", "@eng-suite/ui-kit", "@eng-suite/api-client"],
  basePath: "/control-valve-calculation",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/control-valve-calculation",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/control-valve-calculation",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
