"use client";

import type { ReactNode } from "react";
import { useTheme } from "@mui/material";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";
import CalculatorIcon from "@mui/icons-material/Calculate"; // TODO: Replace per app
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
      title="App Title" // TODO: replace per app
      subtitle="Subtitle · Process Engineering Suite" // TODO: replace per app
      icon={<CalculatorIcon fontSize="medium" />} // TODO: replace per app
      actions={actions}
      homeHref={homeHref}
      onToggleTheme={toggleColorMode}
      isDarkMode={isDark}
    />
  );
}
