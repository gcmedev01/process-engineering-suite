"use client";

import type { ReactNode } from "react";
import { useTheme } from "@mui/material";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";
import { ControlValveIcon } from "./ControlValveIcon";
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
      title="Control Valve Sizing"
      subtitle="ISA-75.01.01 / IEC 60534-2-1 · Process Engineering Suite"
      icon={<ControlValveIcon width={24} height={24} />}
      actions={actions}
      homeHref={homeHref}
      onToggleTheme={toggleColorMode}
      isDarkMode={isDark}
    />
  );
}
