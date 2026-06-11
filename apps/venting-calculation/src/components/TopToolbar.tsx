"use client";

import { useTheme } from "@mui/material";
import { TopFloatingToolbar } from "@eng-suite/ui-kit";
import AirIcon from "@mui/icons-material/Air";
import { useColorMode } from "@/contexts/ColorModeContext";

export function TopToolbar() {
  const theme = useTheme();
  const { toggleColorMode } = useColorMode();
  const isDark = theme.palette.mode === "dark";

  return (
    <TopFloatingToolbar
      title="Tank Venting"
      subtitle="API 2000 Venting Calculator"
      icon={<AirIcon fontSize="medium" />}
      onToggleTheme={toggleColorMode}
      isDarkMode={isDark}
    />
  );
}
