"use client"

import { useTheme } from "@mui/material"
import { TopFloatingToolbar } from "@eng-suite/ui-kit"
import CalculateIcon from "@mui/icons-material/Calculate";
import { useColorMode } from "@/app/providers"

export function TopToolbar() {
  const theme = useTheme()
  const { mode, toggleColorMode } = useColorMode()
  // Ensure we check MUI's theme in addition to ours to sync both
  const isDark = mode === "dark" || theme.palette.mode === "dark"

  return (
    <TopFloatingToolbar
      title="Vessel Calculator"
      subtitle="Volume & Surface Area · Pressure Vessels & Tanks"
      icon={<CalculateIcon fontSize="medium" />}
      onToggleTheme={toggleColorMode}
      isDarkMode={isDark}
    />
  )
}
