"use client";

import { ReactNode } from 'react';
import { Box, Typography, Stack, useTheme, IconButton, Tooltip } from "@mui/material";
import { LightMode as LightModeIcon, DarkMode as DarkModeIcon } from "@mui/icons-material";

export interface TopFloatingToolbarProps {
    title?: string;
    subtitle?: string;
    icon?: ReactNode;
    leadingAction?: ReactNode;
    actions?: ReactNode;
    homeHref?: string;
    onToggleTheme?: () => void;
    isDarkMode?: boolean;
}

export const TopFloatingToolbar = ({
    title = "E-PT",
    subtitle,
    icon,
    leadingAction,
    actions,
    homeHref,
    onToggleTheme,
    isDarkMode = false,
}: TopFloatingToolbarProps) => {
    const theme = useTheme();

    const branding = (
        <Stack
            direction="row"
            alignItems="center"
            spacing={1.5}
            component={homeHref ? 'a' : 'div'}
            href={homeHref}
            sx={{
                color: 'inherit',
                textDecoration: 'none',
                borderRadius: 1.5,
                outline: 'none',
                '&:focus-visible': {
                    boxShadow: `0 0 0 3px ${theme.palette.primary.main}`,
                },
            }}
        >
            {icon && (
                <Box
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '12px',
                        background: 'linear-gradient(#00C4F9,#0076F0)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        boxShadow: "0px 0px 2px 1px rgba(255, 255, 255, 0.3) inset, 2px 2px 3px -2px rgba(255,255,255,0.7) inset, -2px -2px 3px -2px rgba(255,255,255,0.7) inset",
                    }}
                >
                    {icon}
                </Box>
            )}
            <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, lineHeight: 1.2 }}>
                    {title}
                </Typography>
                {subtitle && (
                    <Typography variant="caption" sx={{ color: 'text.secondary', display: 'block', lineHeight: 1 }}>
                        {subtitle}
                    </Typography>
                )}
            </Box>
        </Stack>
    );

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                px: 3,
                py: 2,
                borderBottom: `1px solid ${theme.palette.divider}`,
                boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                bgcolor: 'background.paper',
                backdropFilter: 'blur(10px)',
                position: 'sticky',
                top: 0,
                zIndex: 1100,
            }}
        >
            {/* Left Side: Branding */}
            <Stack direction="row" alignItems="center" spacing={1.5}>
                {leadingAction}
                {branding}
            </Stack>

            {/* Right Side: Actions */}
            <Stack direction="row" alignItems="center" spacing={1.5}>
                {actions}
                {onToggleTheme && (
                    <Tooltip title={`Switch to ${isDarkMode ? 'light' : 'dark'} mode`}>
                        <IconButton
                            onClick={onToggleTheme}
                            sx={{
                                bgcolor: isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.9)",
                                backdropFilter: "blur(10px)",
                                border: isDarkMode ? "1px solid rgba(255,255,255,0.2)" : "1px solid rgba(0,0,0,0.1)",
                                color: isDarkMode ? "white" : "text.primary",
                                "&:hover": {
                                    bgcolor: isDarkMode ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.05)",
                                    transform: "scale(1.05)",
                                },
                                transition: "all 0.2s ease-in-out",
                                boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                borderRadius: '50%',
                                width: 40,
                                height: 40,
                            }}
                        >
                            {isDarkMode ? <LightModeIcon fontSize="small" /> : <DarkModeIcon fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                )}
            </Stack>
        </Box>
    );
};
