"use client";

import { AuthGuard } from "@eng-suite/ui-kit";
import { ThemeProvider, createTheme, CssBaseline, Theme, Components } from "@mui/material";
import { AppRouterCacheProvider } from '@mui/material-nextjs/v15-appRouter';
import { ReactNode, useState, useMemo, useEffect } from "react";
import { ColorModeContext } from "@/contexts/ColorModeContext";
import { SessionGuard } from "@/hooks/useSessionGuard";
import { SharedAuthBridge } from "@/components/SharedAuthBridge";
import { Toaster } from 'sonner';

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
                    borderRadius: '8px',
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
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: 16,
                    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                    '&:hover': {
                        boxShadow: isDark
                            ? '0 10px 15px -3px rgba(0, 0, 0, 0.5), 0 4px 6px -4px rgba(0, 0, 0, 0.5)'
                            : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)',
                    },
                },
            },
        },
        MuiChip: {
            styleOverrides: {
                root: {
                    fontWeight: 500,
                },
            },
        },
        MuiTab: {
            styleOverrides: {
                root: {
                    textTransform: 'none',
                    fontWeight: 600,
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
                        borderWidth: 1,
                    },
                },
            },
        },
    };

    return {
        typography: {
            fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Noto Sans", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji"',
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
        },
    };
};

export function Providers({ children }: { children: ReactNode }) {
    const [mode, setMode] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        const searchParams = new URLSearchParams(window.location.search);
        const themeParam = searchParams.get('theme');

        if (themeParam === 'light' || themeParam === 'dark') {
            setMode(themeParam);
            try {
                localStorage.setItem('ept-pes-theme', JSON.stringify(themeParam));
            } catch { /* ignore */ }
        } else {
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
                    <Toaster theme={mode} position="top-right" closeButton />
                    <SharedAuthBridge />
                    <AuthGuard apiBaseUrl={process.env.NEXT_PUBLIC_AUTH_API_URL}>
                        <SessionGuard>
                            {children}
                        </SessionGuard>
                    </AuthGuard>
                </ThemeProvider>
            </ColorModeContext.Provider>
        </AppRouterCacheProvider>
    );
}
