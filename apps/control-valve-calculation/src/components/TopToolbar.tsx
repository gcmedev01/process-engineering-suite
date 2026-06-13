"use client";

import { useTheme } from "@mui/material";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";
import TuneIcon from "@mui/icons-material/Tune";
import { useColorMode } from "@/contexts/ColorModeContext";

export function TopToolbar() {
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const isDark = theme.palette.mode === "dark";

  return (
    <TopFloatingToolbar
      title="Control Valve Sizing"
      subtitle="ISA-75.01.01 / IEC 60534-2-1 · Process Engineering Suite"
      icon={<TuneIcon fontSize="medium" />}
      onToggleTheme={toggleColorMode}
      isDarkMode={isDark}
    />
  );
}
