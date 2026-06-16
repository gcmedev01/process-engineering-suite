"use client";

import { Box, InputBase, Button, useTheme, useMediaQuery, IconButton } from "@mui/material";
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import DescriptionIcon from '@mui/icons-material/Description';
import HubIcon from '@mui/icons-material/Hub';
import CalculateIcon from "@mui/icons-material/Calculate";
import ScienceIcon from "@mui/icons-material/Science";
import AutoFixHighIcon from '@mui/icons-material/AutoFixHigh';
import AirIcon from '@mui/icons-material/Air';
import { Timeline } from "@mui/icons-material";
import { useColorMode } from "@/contexts/ColorModeContext";
import { QuickAccessMenu, SharedUserMenu, TopFloatingToolbar } from "@eng-suite/ui-kit";
import { useState } from "react";
import { ControlValveIcon } from "./ControlValveIcon";
import { PumpIcon } from "./PumpIcon";
import { VesselIcon } from "./VesselIcon";
import { HeatIcon } from "./HeatIcon";
import { PsvIcon } from "./PsvIcon";

const APP_ITEMS = [
    {
        title: "Network Editor",
        icon: <Timeline />,
        href: "/network-editor",
        color: "linear-gradient(135deg, #0ea5e9, #0284c7)",
        status: "active" as const,
    },
    {
        title: "PSV Sizing",
        icon: <PsvIcon width={22} height={22} />,
        href: "/psv",
        color: "linear-gradient(135deg, #ef4444, #b91c1c)",
        status: "active" as const,
    },
    {
        title: "Design Agents",
        icon: <AutoFixHighIcon />,
        href: "/design-agents",
        color: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
        status: "active" as const,
    },
    {
        title: "Tank Venting",
        icon: <AirIcon />,
        href: "/venting-calculation/calculator",
        color: "linear-gradient(135deg, #14b8a6, #0d9488)",
        status: "active" as const,
    },
    {
        title: "Vessel Sizing",
        icon: <VesselIcon width={22} height={22} />,
        href: "/vessels-calculation/calculator",
        color: "linear-gradient(135deg, #64748b, #334155)",
        status: "active" as const,
    },
    {
        title: "Pump Sizing",
        icon: <PumpIcon width={22} height={22} />,
        href: "/pump-calculation/calculator",
        color: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
        status: "active" as const,
    },
    {
        title: "Heat Transfer",
        icon: <HeatIcon width={22} height={22} />,
        href: "/heat-transfer-calculation/calculator",
        color: "linear-gradient(135deg, #f97316, #c2410c)",
        status: "active" as const,
    },
    {
        title: "Control Valve",
        icon: <ControlValveIcon width={22} height={22} />,
        href: "/control-valve-calculation/calculator",
        color: "linear-gradient(135deg, #22c55e, #15803d)",
        status: "active" as const,
    },
    {
        title: "Docs",
        icon: <DescriptionIcon />,
        href: "/docs",
        color: "linear-gradient(135deg, #94a3b8, #475569)",
        status: "active" as const,
    },
    {
        title: "Orifice Calc",
        icon: <CalculateIcon />,
        color: "linear-gradient(135deg, #cbd5e1, #94a3b8)",
        status: "coming_soon" as const,
    },
    {
        title: "Fluid Props",
        icon: <ScienceIcon />,
        color: "linear-gradient(135deg, #cbd5e1, #94a3b8)",
        status: "coming_soon" as const,
    },
];

export const TopToolbar = () => {
    const theme = useTheme();
    const { toggleColorMode } = useColorMode();
    const isDark = theme.palette.mode === 'dark';
    const isMobile = useMediaQuery(theme.breakpoints.down('md'));
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [searchText, setSearchText] = useState("");

    return (
        <TopFloatingToolbar
            title="E-PT"
            subtitle="process engineering suite"
            icon={<HubIcon />}
            actions={
                <>
                    {/* Search Box */}
                    {(!isMobile || isSearchOpen) && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                bgcolor: isDark ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.05)',
                                borderRadius: '999px',
                                px: 2,
                                py: 0.5,
                                width: isMobile ? '55vw' : 240,
                                border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`,
                                transition: 'all 0.2s',
                                '&:hover': {
                                    bgcolor: isDark ? 'rgba(0,0,0,0.3)' : 'rgba(0,0,0,0.08)',
                                    borderColor: theme.palette.primary.main,
                                }
                            }}
                        >
                            <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: 20 }} />
                            <InputBase
                                placeholder="Search tools..."
                                value={searchText}
                                onChange={(e) => setSearchText(e.target.value)}
                                sx={{
                                    color: 'text.primary',
                                    fontSize: '0.875rem',
                                    width: '100%',
                                }}
                            />
                            {isMobile && (
                                <IconButton
                                    size="small"
                                    onClick={() => {
                                        setIsSearchOpen(false);
                                        setSearchText("");
                                    }}
                                    sx={{ ml: 0.5 }}
                                >
                                    <CloseIcon fontSize="small" />
                                </IconButton>
                            )}
                        </Box>
                    )}

                    {isMobile && !isSearchOpen && (
                        <IconButton
                            size="small"
                            onClick={() => setIsSearchOpen(true)}
                            sx={{
                                width: 40,
                                height: 40,
                                borderRadius: "999px",
                                border: `1px solid ${isDark ? "rgba(255,255,255,0.24)" : "rgba(0,0,0,0.12)"}`,
                                bgcolor: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.9)",
                            }}
                        >
                            <SearchIcon sx={{ fontSize: 20 }} />
                        </IconButton>
                    )}
                </>
            }
            quickAccess={
                <QuickAccessMenu
                    items={APP_ITEMS}
                    onToggleTheme={toggleColorMode}
                    isDarkMode={isDark}
                />
            }
            userAction={
                <SharedUserMenu
                    apiBaseUrl={process.env.NEXT_PUBLIC_AUTH_API_URL}
                    backendStatusApiBaseUrl={process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000"}
                />
            }
        />
    );
};
