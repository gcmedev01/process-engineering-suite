"use client";

import {
  ThemeProvider,
  createTheme,
  CssBaseline,
  Theme,
  Components,
} from "@mui/material";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v15-appRouter";
import { ReactNode, useState, useMemo, useEffect } from "react";
import { ColorModeContext } from "@/contexts/ColorModeContext";

const getDesignTokens = (mode: "light" | "dark") => {
  const isDark = mode === "dark";

  const primaryMain = isDark ? "#38bdf8" : "#0284c7";
  const secondaryMain = isDark ? "#fbbf24" : "#f59e0b";
  const backgroundDefault = isDark ? "#0f172a" : "#f8fafc";
  const backgroundPaper = isDark
    ? "rgba(30, 41, 59, 0.7)"
    : "rgba(255, 255, 255, 0.8)";
  const textPrimary = isDark ? "#f1f5f9" : "#0f172a";
  const textSecondary = isDark ? "#94a3b8" : "#475569";

  // Minimal MUI component overrides — only what the toolbar needs
  const components: Components<Omit<Theme, "components">> = {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          // Let Tailwind handle body styling; only reset margin
          margin: 0,
        },
      },
    },
  };

  return {
    typography: {
      fontFamily:
        '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
      h6: { fontWeight: 700 },
      button: { textTransform: "none" as const, fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components,
    palette: {
      mode,
      primary: { main: primaryMain },
      secondary: { main: secondaryMain },
      background: { default: backgroundDefault, paper: backgroundPaper },
      text: { primary: textPrimary, secondary: textSecondary },
      divider: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
    },
  };
};

export function Providers({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<"light" | "dark">("dark");

  useEffect(() => {
    // Priority: 1) URL ?theme= param, 2) localStorage, 3) default dark
    const searchParams = new URLSearchParams(window.location.search);
    const themeParam = searchParams.get("theme");

    if (themeParam === "light" || themeParam === "dark") {
      setMode(themeParam);
      try {
        localStorage.setItem("ept-pes-theme", JSON.stringify(themeParam));
      } catch {
        /* ignore */
      }
    } else {
      try {
        const savedTheme = localStorage.getItem("ept-pes-theme");
        if (savedTheme) {
          const parsed = JSON.parse(savedTheme);
          if (parsed === "light" || parsed === "dark") {
            setMode(parsed);
          }
        }
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Sync .dark class on <html> for Tailwind dark mode
  useEffect(() => {
    const html = document.documentElement;
    if (mode === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prev) => {
          const next = prev === "light" ? "dark" : "light";
          try {
            localStorage.setItem("ept-pes-theme", JSON.stringify(next));
          } catch {
            /* ignore */
          }
          return next;
        });
      },
    }),
    [],
  );

  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  return (
    <AppRouterCacheProvider>
      <ColorModeContext.Provider value={colorMode}>
        <ThemeProvider theme={theme}>
          <CssBaseline enableColorScheme />
          {children}
        </ThemeProvider>
      </ColorModeContext.Provider>
    </AppRouterCacheProvider>
  );
}
