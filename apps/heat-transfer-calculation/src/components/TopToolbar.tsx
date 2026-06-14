"use client"

import { useTheme } from "@mui/material"
import { TopFloatingToolbar } from "@eng-suite/ui-kit"
import { HeatIcon } from "./HeatIcon"
import { useColorMode } from "@/contexts/ColorModeContext"

export function TopToolbar() {
  const theme = useTheme()
  const { toggleColorMode } = useColorMode()
  const isDark = theme.palette.mode === "dark"

  return (
    <TopFloatingToolbar
      title="Heat Transfer in Storage Tank"
      subtitle="Calculate heat loss and cooling rate for insulated storage tanks"
      icon={<HeatIcon width={24} height={24} />}
      onToggleTheme={toggleColorMode}
      isDarkMode={isDark}
    />
  )
}
