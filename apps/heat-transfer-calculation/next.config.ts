import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@eng-suite/physics", "@eng-suite/ui-kit", "@eng-suite/api-client"],
  basePath: "/heat-transfer-calculation",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/heat-transfer-calculation",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/heat-transfer-calculation",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
