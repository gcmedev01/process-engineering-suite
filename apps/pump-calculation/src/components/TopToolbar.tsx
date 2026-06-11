"use client";

import { useTheme } from "@mui/material";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";
import BoltIcon from "@mui/icons-material/Bolt";
import { useColorMode } from "@/contexts/ColorModeContext";

export function TopToolbar() {
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const isDark = theme.palette.mode === "dark";

  return (
    <TopFloatingToolbar
      title="Pump Calculator"
      subtitle="Head · NPSHa · Motor Sizing"
      icon={<BoltIcon fontSize="medium" />}
      onToggleTheme={toggleColorMode}
      isDarkMode={isDark}
    />
  );
}
