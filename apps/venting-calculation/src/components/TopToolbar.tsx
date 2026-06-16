"use client";

import type { ReactNode } from "react";
import { useTheme } from "@mui/material";
import {
    Air as AirIcon,
    AutoFixHigh,
    Calculate,
    Description,
    ElectricBolt,
    Science,
    Shield,
    Storage,
    Thermostat,
    Timeline,
    Tune,
} from "@mui/icons-material";
import { QuickAccessMenu, SharedUserMenu, TopFloatingToolbar } from "@eng-suite/ui-kit";
import { useColorMode } from "@/contexts/ColorModeContext";

const APP_ITEMS = [
    { title: "Network Editor", icon: <Timeline />, href: "/network-editor", color: "linear-gradient(135deg, #0ea5e9, #0284c7)", status: "active" as const, requiresAuth: true },
    { title: "PSV Sizing", icon: <Shield />, href: "/psv", color: "linear-gradient(135deg, #ef4444, #b91c1c)", status: "active" as const },
    { title: "Design Agents", icon: <AutoFixHigh />, href: "/design-agents", color: "linear-gradient(135deg, #8b5cf6, #6d28d9)", status: "active" as const, requiresAuth: true },
    { title: "Tank Venting", icon: <AirIcon />, href: "/venting-calculation/calculator", color: "linear-gradient(135deg, #14b8a6, #0d9488)", status: "active" as const },
    { title: "Vessel Sizing", icon: <Storage />, href: "/vessels-calculation/calculator", color: "linear-gradient(135deg, #64748b, #334155)", status: "active" as const },
    { title: "Pump Sizing", icon: <ElectricBolt />, href: "/pump-calculation/calculator", color: "linear-gradient(135deg, #3b82f6, #1d4ed8)", status: "active" as const },
    { title: "Heat Transfer", icon: <Thermostat />, href: "/heat-transfer-calculation/calculator", color: "linear-gradient(135deg, #f97316, #c2410c)", status: "active" as const },
    { title: "Control Valve", icon: <Tune />, href: "/control-valve-calculation/calculator", color: "linear-gradient(135deg, #22c55e, #15803d)", status: "active" as const },
    { title: "Docs", icon: <Description />, href: "/docs", color: "linear-gradient(135deg, #94a3b8, #475569)", status: "active" as const },
    { title: "Orifice Calc", icon: <Calculate />, color: "linear-gradient(135deg, #cbd5e1, #94a3b8)", status: "coming_soon" as const },
    { title: "Fluid Props", icon: <Science />, color: "linear-gradient(135deg, #cbd5e1, #94a3b8)", status: "coming_soon" as const },
];

interface TopToolbarProps {
  actions?: ReactNode;
  homeHref?: string;
}

export function TopToolbar({ actions, homeHref }: TopToolbarProps) {
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const isDark = theme.palette.mode === "dark";

  return (
    <TopFloatingToolbar
      title="Tank Venting"
      subtitle="API 2000 Venting Calculator"
      icon={<AirIcon fontSize="medium" />}
      actions={actions}
      homeHref={homeHref}
      quickAccess={<QuickAccessMenu items={APP_ITEMS} onToggleTheme={toggleColorMode} isDarkMode={isDark} />}
      userAction={
        <SharedUserMenu
          homeHref={homeHref}
          apiBaseUrl={process.env.NEXT_PUBLIC_AUTH_API_URL}
          backendStatusApiBaseUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
        />
      }
    />
  );
}
