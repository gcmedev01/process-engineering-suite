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
import {
    AccountCircle,
    AdminPanelSettings,
    Login,
    Logout,
    MoreVert,
    Settings,
} from '@mui/icons-material';
import { BackendStatusDot } from './BackendStatusDot';
import { LoginPanel } from './LoginPanel';
import { useSharedAuth } from './useSharedAuthStore';
import type { SharedUserRole } from './types';

interface SharedUserMenuProps {
    homeHref?: string;
    apiBaseUrl?: string;
    backendStatusApiBaseUrl?: string;
    /** Link to the /account-settings page (relative or absolute). */
    accountSettingsHref?: string;
    /** Link to the /docs page (relative, resolved by vercel.json redirects). */
    docsHref?: string;
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
    accountSettingsHref = '/account-settings',
    docsHref = '/docs',
}: SharedUserMenuProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { currentUser, isAuthenticated, restoreSession, logout } = useSharedAuth();
    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [showLogin, setShowLogin] = useState(false);
    const open = Boolean(anchorEl);
    const roleColor = getRoleColor(currentUser?.role, theme.palette.primary.main);
    const isAdmin = currentUser?.role === 'admin';

    useEffect(() => {
        restoreSession();
    }, [restoreSession]);

    const handleClose = () => setAnchorEl(null);

    const handleLogout = () => {
        void logout(apiBaseUrl);
        handleClose();
    };

    const paperSx = {
        minWidth: 280,
        mt: 1.5,
        borderRadius: '14px',
        background: isDark ? 'rgba(30, 41, 59, 0.95)' : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
        boxShadow: isDark ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.15)',
    };

    // ----- NOT AUTHENTICATED — show ⋯ button -----
    if (!isAuthenticated) {
        return (
            <>
                <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="More options">
                        <IconButton
                            aria-label="More options"
                            onClick={(e) => setAnchorEl(e.currentTarget)}
                            size="small"
                        >
                            <MoreVert />
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
                    slotProps={{ paper: { elevation: 0, sx: paperSx } }}
                >
                    <MenuItem component="a" href={docsHref} onClick={handleClose}>
                        <ListItemIcon>
                            <AccountCircle fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Documentation</ListItemText>
                    </MenuItem>
                </Menu>
            </>
        );
    }

    // ----- AUTHENTICATED — show avatar icon -----
    return (
        <>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title={currentUser?.name || 'Account'}>
                    <IconButton
                        aria-label="Account menu"
                        onClick={(e) => setAnchorEl(e.currentTarget)}
                        size="small"
                    >
                        <Avatar
                            src={currentUser?.avatarUrl}
                            sx={{
                                width: 40,
                                height: 40,
                                bgcolor: roleColor,
                            }}
                        />
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
                slotProps={{ paper: { elevation: 0, sx: paperSx } }}
            >
                {currentUser && (
                    <Box sx={{ px: 2, py: 1.5, pb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                            <Avatar src={currentUser.avatarUrl} sx={{ width: 42, height: 42, bgcolor: roleColor }} />
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

                <MenuItem component="a" href={accountSettingsHref} onClick={handleClose}>
                    <ListItemIcon>
                        <Settings fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Account Settings</ListItemText>
                </MenuItem>

                {isAdmin && (
                    <MenuItem component="a" href={`${accountSettingsHref}?tab=admin`} onClick={handleClose}>
                        <ListItemIcon>
                            <AdminPanelSettings fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>User Management</ListItemText>
                    </MenuItem>
                )}

                <Divider />

                <MenuItem onClick={handleLogout}>
                    <ListItemIcon>
                        <Logout fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Log Out</ListItemText>
                </MenuItem>
            </Menu>

            <Dialog
                open={showLogin}
                onClose={() => setShowLogin(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: { background: 'transparent', boxShadow: 'none', overflow: 'visible' },
                }}
            >
                <LoginPanel apiBaseUrl={apiBaseUrl} onSuccess={() => setShowLogin(false)} />
            </Dialog>
        </>
    );
}
