"use client";

import type { ReactNode } from "react";
import { useTheme } from "@mui/material";
import { SharedUserMenu, TopFloatingToolbar } from "@eng-suite/ui-kit";
import AirIcon from "@mui/icons-material/Air";
import { useColorMode } from "@/contexts/ColorModeContext";

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
      onToggleTheme={toggleColorMode}
      isDarkMode={isDark}
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
