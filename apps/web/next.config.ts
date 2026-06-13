import type { NextConfig } from "next";

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "");
const isVercel = process.env.VERCEL === "1";
const deployTarget = (process.env.DEPLOY_TARGET || (isVercel ? "vercel" : "local")).toLowerCase();

const createProxyTarget = (
  envKeys: string | string[],
  productionFallback: string,
  localFallback: string,
) => {
  const keys = Array.isArray(envKeys) ? envKeys : [envKeys];
  for (const key of keys) {
    const configured = process.env[key];
    if (configured && configured.trim().length > 0) {
      return stripTrailingSlash(configured.trim());
    }
  }

  if (deployTarget === "vercel") {
    const fallback = stripTrailingSlash(productionFallback);
    console.warn(
      `[web] "${keys.join('" | "')}" not provided. Falling back to "${fallback}".`,
    );
    return fallback;
  }

  return stripTrailingSlash(localFallback);
};

const docsAppOrigin = createProxyTarget(
  "DOCS_URL",
  "https://process-engineering-suite-docs.vercel.app",
  "http://localhost:3001",
);
const networkEditorOrigin = createProxyTarget(
  "NETWORK_EDITOR_URL",
  "https://pes-network-editor.vercel.app",
  "http://localhost:3002",
);
const psvOrigin = createProxyTarget(
  "PSV_URL",
  "https://pes-psv-suite.vercel.app",
  "http://localhost:3003",
);
const designAgentsOrigin = createProxyTarget(
  "DESIGN_AGENTS_URL",
  "https://process-engineering-suite-design-agents.vercel.app",
  "http://localhost:3004",
);
const ventingOrigin = createProxyTarget(
  "VENTING_URL",
  "https://pes-venting-calculation.vercel.app",
  "http://localhost:3005",
);
const vesselCalculationOrigin = createProxyTarget(
  ["VESSELS_CALCULATION_URL", "VESSEL_CALCULATION_URL", "VESSEL_URL"],
  "https://pes-vessels-calculation.vercel.app",
  "http://localhost:3006",
);
const pumpOrigin = createProxyTarget(
  "PUMP_URL",
  "https://pes-pump-calculation.vercel.app",
  "http://localhost:3007",
);
const controlValveOrigin = createProxyTarget(
  "CONTROL_VALVE_URL",
  "https://pes-control-valve-calculation.vercel.app",
  "http://localhost:3009",
);

const nextConfig: NextConfig = {
  /* config options here */
  transpilePackages: ["@eng-suite/physics", "@eng-suite/ui-kit"],



  // ADD THIS BLOCK: Local Routing for the Monorepo
  async rewrites() {
    return [
      {
        source: "/docs/:path*",
        destination: `${docsAppOrigin}/docs/:path*`,
      },
      {
        source: "/network-editor/:path*",
        destination: `${networkEditorOrigin}/network-editor/:path*`,
      },
      {
        source: "/psv/:path*",
        destination: `${psvOrigin}/psv/:path*`,
      },
      {
        source: "/design-agents",
        destination: `${designAgentsOrigin}/design-agents/index.html`,
      },
      {
        source: "/design-agents/:path*",
        destination: `${designAgentsOrigin}/design-agents/:path*`,
      },
      {
        source: "/venting-calculation/:path*",
        destination: `${ventingOrigin}/venting-calculation/:path*`,
      },
      {
        source: "/vessels-calculation/:path*",
        destination: `${vesselCalculationOrigin}/vessels-calculation/:path*`,
      },
      {
        source: "/pump-calculation/:path*",
        destination: `${pumpOrigin}/pump-calculation/:path*`,
      },
      {
        source: "/control-valve-calculation/:path*",
        destination: `${controlValveOrigin}/control-valve-calculation/:path*`,
      },
    ];
  },
};

export default nextConfig;
