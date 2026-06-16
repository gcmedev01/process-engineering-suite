'use client';

import { useEffect, useState } from 'react';
import {
    Avatar,
    Box,
    Chip,
    Dialog,
    Divider,
    IconButton,
    ListItemIcon,
    ListItemText,
    Menu,
    MenuItem,
    Tooltip,
    Typography,
    useTheme,
} from '@mui/material';
import { Home, Login, Logout, Person, Settings } from '@mui/icons-material';
import { BackendStatusDot } from './BackendStatusDot';
import { LoginPanel } from './LoginPanel';
import { useSharedAuth } from './useSharedAuthStore';
import type { SharedUserRole } from './types';

interface SharedUserMenuProps {
    homeHref?: string;
    apiBaseUrl?: string;
    backendStatusApiBaseUrl?: string;
    showAccountSettings?: boolean;
    onAccountSettings?: () => void;
}

function getRoleColor(role: SharedUserRole | undefined, fallback: string): string {
    switch (role) {
        case 'admin':
            return '#f59e0b';
        case 'division_manager':
            return '#0284c7';
        case 'approver':
            return '#9333ea';
        case 'lead':
            return '#059669';
        case 'engineer':
            return fallback;
        default:
            return '#64748b';
    }
}

function getRoleLabel(role: SharedUserRole | undefined): string {
    switch (role) {
        case 'admin':
            return 'Admin';
        case 'division_manager':
            return 'Division Manager';
        case 'approver':
            return 'Approver';
        case 'lead':
            return 'Lead';
        case 'engineer':
            return 'Engineer';
        default:
            return 'Viewer';
    }
}

function getInitials(user?: { initials?: string; name?: string }): string {
    const raw = user?.initials?.trim();
    if (raw) return raw.toUpperCase();
    const name = user?.name;
    if (!name) return '?';
    return name
        .split(' ')
        .filter(Boolean)
        .map((part) => part[0])
        .join('')
        .toUpperCase();
}

export function SharedUserMenu({
    homeHref = '/',
    apiBaseUrl,
    backendStatusApiBaseUrl,
    showAccountSettings = false,
    onAccountSettings,
}: SharedUserMenuProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { currentUser, isAuthenticated, restoreSession, logout } = useSharedAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [showLogin, setShowLogin] = useState(false);
    const open = Boolean(anchorEl);
    const roleColor = getRoleColor(currentUser?.role, theme.palette.primary.main);

    useEffect(() => {
        restoreSession();
    }, [restoreSession]);

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        void logout(apiBaseUrl);
        handleClose();
    };

    return (
        <>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title={isAuthenticated ? currentUser?.name || 'User' : 'Sign in'}>
                    <IconButton
                        aria-label="User menu"
                        onClick={(event) => setAnchorEl(event.currentTarget)}
                        size="small"
                    >
                        <Avatar
                            src={currentUser?.avatarUrl}
                            sx={{
                                width: 40,
                                height: 40,
                                bgcolor: isAuthenticated ? roleColor : theme.palette.grey[500],
                                fontSize: '0.875rem',
                                fontWeight: 600,
                            }}
                        >
                            {isAuthenticated ? getInitials(currentUser ?? undefined) : <Person fontSize="small" />}
                        </Avatar>
                    </IconButton>
                </Tooltip>
                <BackendStatusDot apiBaseUrl={backendStatusApiBaseUrl ?? apiBaseUrl} />
            </Box>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                slotProps={{
                    paper: {
                        elevation: 0,
                        sx: {
                            minWidth: 280,
                            mt: 1.5,
                            borderRadius: '14px',
                            background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
                            backdropFilter: 'blur(20px)',
                            border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                            boxShadow: isDark
                                ? '0 8px 32px rgba(0, 0, 0, 0.4)'
                                : '0 8px 32px rgba(0, 0, 0, 0.15)',
                        },
                    },
                }}
            >
                {isAuthenticated && currentUser && (
                    <Box sx={{ px: 2, py: 1.5, pb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                            <Avatar
                                src={currentUser.avatarUrl}
                                sx={{
                                    width: 42,
                                    height: 42,
                                    bgcolor: roleColor,
                                }}
                            >
                                {getInitials(currentUser)}
                            </Avatar>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2" fontWeight={600} noWrap>
                                    {currentUser.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }} noWrap>
                                    {currentUser.email}
                                </Typography>
                            </Box>
                        </Box>
                        <Chip
                            label={getRoleLabel(currentUser.role)}
                            size="small"
                            sx={{
                                mt: 0.5,
                                height: 22,
                                fontSize: '0.75rem',
                                bgcolor: `${roleColor}22`,
                                color: roleColor,
                                fontWeight: 600,
                            }}
                        />
                    </Box>
                )}

                <MenuItem component="a" href={homeHref} onClick={handleClose}>
                    <ListItemIcon>
                        <Home fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Home Page</ListItemText>
                </MenuItem>

                {isAuthenticated && showAccountSettings && (
                    <MenuItem
                        onClick={() => {
                            onAccountSettings?.();
                            handleClose();
                        }}
                    >
                        <ListItemIcon>
                            <Settings fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Account Settings</ListItemText>
                    </MenuItem>
                )}

                <Divider />

                {!isAuthenticated ? (
                    <MenuItem
                        onClick={() => {
                            handleClose();
                            setShowLogin(true);
                        }}
                    >
                        <ListItemIcon>
                            <Login fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Log In</ListItemText>
                    </MenuItem>
                ) : (
                    <MenuItem onClick={handleLogout}>
                        <ListItemIcon>
                            <Logout fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Log Out</ListItemText>
                    </MenuItem>
                )}
            </Menu>

            <Dialog
                open={showLogin}
                onClose={() => setShowLogin(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        background: 'transparent',
                        boxShadow: 'none',
                        overflow: 'visible',
                    },
                }}
            >
                <LoginPanel apiBaseUrl={apiBaseUrl} onSuccess={() => setShowLogin(false)} />
            </Dialog>
        </>
    );
}
