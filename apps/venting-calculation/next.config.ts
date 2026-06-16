import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@eng-suite/physics", "@eng-suite/ui-kit", "@eng-suite/api-client"],
  basePath: "/venting-calculation",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/venting-calculation",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/venting-calculation",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
