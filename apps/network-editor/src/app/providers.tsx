"use client";

import { AuthGuard } from "@eng-suite/ui-kit";
import { ThemeProvider, createTheme, CssBaseline, Theme, Components } from "@mui/material";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ReactNode, useState, useMemo, useEffect } from "react";
import { ColorModeContext } from "@/contexts/ColorModeContext";

const getDesignTokens = (mode: 'light' | 'dark') => {
  const isDark = mode === 'dark';

  // Palette definitions
  const primaryMain = isDark ? '#38bdf8' : '#0284c7'; // Sky 400 / Sky 600
  const secondaryMain = isDark ? '#fbbf24' : '#f59e0b'; // Amber 400 / Amber 500
  const backgroundDefault = isDark ? '#0f172a' : '#f8fafc'; // Slate 900 / Slate 50
  const backgroundPaper = isDark ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.8)'; // Slate 800 / White (glass)
  const textPrimary = isDark ? '#f1f5f9' : '#0f172a'; // Slate 100 / Slate 900
  const textSecondary = isDark ? '#94a3b8' : '#475569'; // Slate 400 / Slate 600

  const components: Components<Omit<Theme, 'components'>> = {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          scrollbarColor: isDark ? "#475569 #0f172a" : "#cbd5e1 #f1f5f9",
          "&::-webkit-scrollbar, & *::-webkit-scrollbar": {
            backgroundColor: "transparent",
            width: "8px",
            height: "8px",
          },
          "&::-webkit-scrollbar-thumb, & *::-webkit-scrollbar-thumb": {
            borderRadius: 8,
            backgroundColor: isDark ? "#475569" : "#cbd5e1",
            minHeight: 24,
          },
          "&::-webkit-scrollbar-thumb:focus, & *::-webkit-scrollbar-thumb:focus": {
            backgroundColor: isDark ? "#64748b" : "#94a3b8",
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: '8px', // Slightly rounded, modern look
          textTransform: 'none',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
          },
        },
        containedPrimary: {
          background: isDark
            ? `linear-gradient(135deg, ${primaryMain} 0%, #0ea5e9 100%)`
            : `linear-gradient(135deg, ${primaryMain} 0%, #0369a1 100%)`,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backdropFilter: 'blur(12px)',
          backgroundColor: backgroundPaper,
          border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)'}`,
          boxShadow: isDark
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.5), 0 2px 4px -2px rgba(0, 0, 0, 0.5)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -2px rgba(0, 0, 0, 0.05)',
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: 16,
          boxShadow: isDark
            ? '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)'
            : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          backgroundColor: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
          '& fieldset': {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          },
          '&:hover fieldset': {
            borderColor: isDark ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
          },
          '&.Mui-focused fieldset': {
            borderColor: primaryMain,
            borderWidth: 1, // Keep it subtle
          },
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: isDark ? 'rgba(255, 255, 255, 0.9)' : 'rgba(15, 23, 42, 0.9)',
          color: isDark ? '#0f172a' : '#f8fafc',
          fontSize: '0.75rem',
          fontWeight: 500,
          backdropFilter: 'blur(4px)',
        },
      },
    },
  };

  return {
    typography: {
      fontFamily: 'var(--font-inter), "Inter", "Roboto", "Helvetica", "Arial", sans-serif',
      h1: { fontWeight: 700 },
      h2: { fontWeight: 700 },
      h3: { fontWeight: 600 },
      h4: { fontWeight: 600 },
      h5: { fontWeight: 600 },
      h6: { fontWeight: 600 },
      button: {
        textTransform: 'none' as const,
        fontWeight: 600,
      },
    },
    shape: {
      borderRadius: 12,
    },
    components,
    palette: {
      mode,
      primary: {
        main: primaryMain,
      },
      secondary: {
        main: secondaryMain,
      },
      background: {
        default: backgroundDefault,
        paper: backgroundPaper,
      },
      text: {
        primary: textPrimary,
        secondary: textSecondary,
      },
      divider: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
      // Custom palette extensions can go here if typed
    },
  };
};

export function Providers({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState<'light' | 'dark'>('dark');

  useEffect(() => {
    // Priority: 1) URL params (from dashboard navigation), 2) localStorage, 3) default dark
    const searchParams = new URLSearchParams(window.location.search);
    const themeParam = searchParams.get('theme');

    if (themeParam === 'light' || themeParam === 'dark') {
      setMode(themeParam);
      // Also save to localStorage for consistency
      try {
        localStorage.setItem('ept-pes-theme', JSON.stringify(themeParam));
      } catch { /* ignore */ }
    } else {
      // Check localStorage
      try {
        const savedTheme = localStorage.getItem('ept-pes-theme');
        if (savedTheme) {
          const parsed = JSON.parse(savedTheme);
          if (parsed === 'light' || parsed === 'dark') {
            setMode(parsed);
          }
        }
      } catch { /* ignore */ }
    }
  }, []);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === 'light' ? 'dark' : 'light';
          // Save to localStorage
          try {
            localStorage.setItem('ept-pes-theme', JSON.stringify(newMode));
          } catch { /* ignore */ }
          return newMode;
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
          <CssBaseline />
          <AuthGuard apiBaseUrl={process.env.NEXT_PUBLIC_AUTH_API_URL}>{children}</AuthGuard>
        </ThemeProvider>
      </ColorModeContext.Provider>
    </AppRouterCacheProvider>
  );
}
