"use client";

import { useTheme } from "@mui/material";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";
import { PumpIcon } from "./PumpIcon";
import { useColorMode } from "@/contexts/ColorModeContext";

export function TopToolbar() {
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const isDark = theme.palette.mode === "dark";

  return (
    <TopFloatingToolbar
      title="Pump Calculator"
      subtitle="Head · NPSHa · Motor Sizing"
      icon={<PumpIcon width={24} height={24} />}
      onToggleTheme={toggleColorMode}
      isDarkMode={isDark}
    />
  );
}
