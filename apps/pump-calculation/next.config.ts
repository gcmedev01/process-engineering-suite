import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@eng-suite/physics", "@eng-suite/ui-kit", "@eng-suite/api-client"],
  basePath: "/pump-calculation",
  env: {
    NEXT_PUBLIC_BASE_PATH: "/pump-calculation",
  },
  async redirects() {
    return [
      {
        source: "/",
        destination: "/pump-calculation",
        permanent: false,
        basePath: false,
      },
    ];
  },
};

export default nextConfig;
