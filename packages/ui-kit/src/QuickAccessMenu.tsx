'use client';

import { ReactNode, useState } from 'react';
import {
    Box,
    Divider,
    IconButton,
    Popover,
    Switch,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import { Apps as AppsIcon, DarkMode, LightMode } from '@mui/icons-material';

export interface QuickAccessItem {
    title: string;
    icon: ReactNode;
    href?: string;
    onClick?: () => void;
    color?: string;
    status?: 'active' | 'coming_soon';
}

export interface QuickAccessMenuProps {
    items: QuickAccessItem[];
    onToggleTheme?: () => void;
    isDarkMode?: boolean;
}

export function QuickAccessMenu({ items, onToggleTheme, isDarkMode }: QuickAccessMenuProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const open = Boolean(anchorEl);

    const activeItems = items.filter((i) => i.status !== 'coming_soon');
    const soonItems = items.filter((i) => i.status === 'coming_soon');

    return (
        <>
            <Tooltip title="Apps">
                <IconButton
                    onClick={(e) => setAnchorEl(e.currentTarget)}
                    aria-label="Open app switcher"
                    sx={{
                        width: 40,
                        height: 40,
                        borderRadius: '50%',
                        bgcolor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
                        border: isDark ? '1px solid rgba(255,255,255,0.2)' : '1px solid rgba(0,0,0,0.1)',
                        color: isDark ? 'white' : 'text.primary',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s ease-in-out',
                        '&:hover': {
                            bgcolor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.05)',
                            transform: 'scale(1.05)',
                        },
                    }}
                >
                    <AppsIcon fontSize="small" />
                </IconButton>
            </Tooltip>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={() => setAnchorEl(null)}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                slotProps={{
                    paper: {
                        elevation: 0,
                        sx: {
                            mt: 1.5,
                            width: 300,
                            borderRadius: '20px',
                            background: isDark
                                ? 'rgba(15, 23, 42, 0.92)'
                                : 'rgba(255, 255, 255, 0.96)',
                            backdropFilter: 'blur(24px)',
                            border: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}`,
                            boxShadow: isDark
                                ? '0 20px 60px rgba(0,0,0,0.5)'
                                : '0 20px 60px rgba(0,0,0,0.15)',
                            overflow: 'hidden',
                        },
                    },
                }}
            >
                <Box sx={{ p: 2.5 }}>
                    {/* Apps section */}
                    <Typography
                        variant="subtitle2"
                        fontWeight={700}
                        sx={{ mb: 1.5, color: 'text.primary', letterSpacing: 0.3 }}
                    >
                        Apps
                    </Typography>

                    <Box
                        sx={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(4, 1fr)',
                            gap: 0.5,
                            mx: -1,
                        }}
                    >
                        {activeItems.map((item) => (
                            <AppIcon
                                key={item.title}
                                item={item}
                                onClose={() => setAnchorEl(null)}
                            />
                        ))}
                    </Box>

                    {/* Coming soon */}
                    {soonItems.length > 0 && (
                        <>
                            <Typography
                                variant="subtitle2"
                                fontWeight={700}
                                sx={{ mt: 2, mb: 1.5, color: 'text.primary', letterSpacing: 0.3 }}
                            >
                                Coming Soon
                            </Typography>
                            <Box
                                sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(4, 1fr)',
                                    gap: 0.5,
                                    mx: -1,
                                }}
                            >
                                {soonItems.map((item) => (
                                    <AppIcon
                                        key={item.title}
                                        item={item}
                                        onClose={() => setAnchorEl(null)}
                                        dimmed
                                    />
                                ))}
                            </Box>
                        </>
                    )}

                    {/* Theme toggle */}
                    {onToggleTheme && (
                        <>
                            <Divider sx={{ my: 2 }} />
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    px: 0.5,
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {isDarkMode
                                        ? <DarkMode sx={{ fontSize: 18, color: 'text.secondary' }} />
                                        : <LightMode sx={{ fontSize: 18, color: 'text.secondary' }} />
                                    }
                                    <Typography variant="body2" fontWeight={500}>
                                        {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                                    </Typography>
                                </Box>
                                <Switch
                                    checked={isDarkMode}
                                    onChange={onToggleTheme}
                                    size="small"
                                    color="primary"
                                />
                            </Box>
                        </>
                    )}
                </Box>
            </Popover>
        </>
    );
}

interface AppIconProps {
    item: QuickAccessItem;
    onClose: () => void;
    dimmed?: boolean;
}

function AppIcon({ item, onClose, dimmed }: AppIconProps) {
    const theme = useTheme();
    const defaultGradient = `linear-gradient(135deg, ${theme.palette.primary.main}, ${theme.palette.primary.dark ?? theme.palette.primary.main})`;

    const handleClick = () => {
        if (item.onClick) {
            item.onClick();
        }
        onClose();
    };

    return (
        <Box
            component={item.href ? 'a' : 'div'}
            href={item.href}
            onClick={!item.href ? handleClick : onClose}
            sx={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 0.75,
                p: 1,
                borderRadius: '14px',
                cursor: dimmed ? 'default' : 'pointer',
                textDecoration: 'none',
                color: 'inherit',
                opacity: dimmed ? 0.45 : 1,
                transition: 'background 0.15s',
                '&:hover': dimmed
                    ? {}
                    : {
                          bgcolor: theme.palette.mode === 'dark'
                              ? 'rgba(255,255,255,0.07)'
                              : 'rgba(0,0,0,0.05)',
                      },
            }}
        >
            <Box
                sx={{
                    width: 52,
                    height: 52,
                    borderRadius: '14px',
                    background: item.color ?? defaultGradient,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
                    fontSize: 24,
                    '& svg': { fontSize: '1.4rem' },
                }}
            >
                {item.icon}
            </Box>
            <Typography
                variant="caption"
                textAlign="center"
                sx={{
                    fontSize: '0.65rem',
                    lineHeight: 1.2,
                    width: '100%',
                    overflow: 'hidden',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                    wordBreak: 'break-word',
                }}
            >
                {item.title}
            </Typography>
        </Box>
    );
}
