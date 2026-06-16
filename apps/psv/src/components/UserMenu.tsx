"use client";

import { useState } from 'react';
import {
    Box,
    Avatar,
    IconButton,
    Menu,
    MenuItem,
    ListItemIcon,
    ListItemText,
    Divider,
    Typography,
    Chip,
    ToggleButtonGroup,
    ToggleButton,
    useTheme,
    Tooltip,
    Dialog,
} from '@mui/material';
import { BackendStatusDot } from '@eng-suite/ui-kit';
import {
    Dashboard,
    Settings,
    Home,
    Logout,
    DarkMode,
    LightMode,
    Computer,
    Person,
    Login,
    History,
} from '@mui/icons-material';
import { useAuthStore } from '@/store/useAuthStore';
import { usePsvStore } from '@/store/usePsvStore';
import { useColorMode } from '@/contexts/ColorModeContext';
import { LoginPage } from '@/components/LoginPage';
import { API_BASE_URL } from '@/lib/api';

export function UserMenu() {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { toggleColorMode } = useColorMode();
    const currentUser = useAuthStore((state) => state.currentUser);
    const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
    const logout = useAuthStore((state) => state.logout);
    const setCurrentPage = usePsvStore((state) => state.setCurrentPage);

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [showLogin, setShowLogin] = useState(false);
    const open = Boolean(anchorEl);

    const handleClick = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleLogout = () => {
        logout();
        setCurrentPage(null); // Clear any special page state
        handleClose();
    };

    const getRoleColor = (role?: string) => {
        switch (role) {
            case 'admin':
                return theme.palette.secondary.main; // Amber/Gold
            case 'approver':
                return '#9333ea'; // Purple
            case 'division_manager':
                return '#0284c7'; // Blue
            case 'lead':
                return '#059669'; // Green
            case 'engineer':
                return theme.palette.primary.main; // Sky Blue
            default:
                return theme.palette.text.disabled; // Gray for viewer
        }
    };

    const getRoleLabel = (role?: string) => {
        switch (role) {
            case 'admin':
                return 'Admin ⭐';
            case 'approver':
                return 'Approver ✓';
            case 'division_manager':
                return 'Division Manager 👨‍💼';
            case 'lead':
                return 'Lead 👤';
            case 'engineer':
                return 'Engineer 🔧';
            default:
                return 'Viewer 👁️';
        }
    };

    const getInitials = (user?: { initials?: string; name?: string }) => {
        const raw = user?.initials?.trim();
        if (raw) return raw.toUpperCase();
        const name = user?.name;
        if (!name) return '?';
        return name
            .split(' ')
            .filter(Boolean)
            .map((n) => n[0])
            .join('')
            .toUpperCase();
    };

    return (
        <>
            <Box sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5 }}>
                <Tooltip title={isAuthenticated ? currentUser?.name || 'User' : 'Guest (View Only)'}>
                    <IconButton onClick={handleClick} size="small">
                        <Avatar
                            src={currentUser?.avatarUrl}
                            sx={{
                                width: 40,
                                height: 40,
                                bgcolor: isAuthenticated ? getRoleColor(currentUser?.role) : theme.palette.grey[500],
                                fontSize: '0.875rem',
                                fontWeight: 600,
                            }}
                        >
                            {isAuthenticated ? getInitials(currentUser ?? undefined) : <Person />}
                        </Avatar>
                    </IconButton>
                </Tooltip>
                <BackendStatusDot apiBaseUrl={API_BASE_URL} />
            </Box>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                onClick={handleClose}
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
                                ? '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
                                : '0 8px 32px 0 rgba(0, 0, 0, 0.15)',
                        },
                    },
                }}
            >
                {/* User Info Header */}
                {isAuthenticated && currentUser && (
                    <Box sx={{ px: 2, py: 1.5, pb: 1 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.5 }}>
                            <Avatar
                                src={currentUser.avatarUrl}
                                sx={{
                                    width: 42,
                                    height: 42,
                                    bgcolor: getRoleColor(currentUser.role),
                                }}
                            >
                                {getInitials(currentUser)}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                                <Typography variant="subtitle2" fontWeight={600}>
                                    {currentUser.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
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
                                bgcolor: `${getRoleColor(currentUser.role)}22`,
                                color: getRoleColor(currentUser.role),
                                fontWeight: 600,
                            }}
                        />
                    </Box>
                )}

                {/* Home Page */}
                <MenuItem onClick={() => (window.location.href = '/')}>
                    <ListItemIcon>
                        <Home fontSize="small" />
                    </ListItemIcon>
                    <ListItemText>Home Page</ListItemText>
                </MenuItem>

                {isAuthenticated && <Divider />}

                {/* Quick Links */}
                {isAuthenticated && (
                    <MenuItem onClick={() => {
                        handleClose();
                        setCurrentPage('dashboard');
                    }}>
                        <ListItemIcon>
                            <Dashboard fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Dashboard</ListItemText>
                    </MenuItem>
                )}
                {isAuthenticated && (
                    <MenuItem onClick={() => {
                        handleClose();
                        setCurrentPage('account');
                    }}>
                        <ListItemIcon>
                            <Settings fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Account Settings</ListItemText>
                    </MenuItem>
                )}

                {/* Activity Feed for privileged roles */}
                {isAuthenticated && (currentUser?.role === 'admin' || currentUser?.role === 'division_manager') && (
                    <MenuItem onClick={() => {
                        handleClose();
                        setCurrentPage('activity');
                    }}>
                        <ListItemIcon>
                            <History fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Activity Feed</ListItemText>
                    </MenuItem>
                )}
                {isAuthenticated && <Divider />}

                {/* Login / Logout */}
                {!isAuthenticated ? (
                    <MenuItem onClick={() => { handleClose(); setShowLogin(true); }}>
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

            {/* Login Dialog */}
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
                <LoginPage
                    onSuccess={() => setShowLogin(false)}
                    onContinueAsGuest={() => setShowLogin(false)}
                />
            </Dialog>
        </>
    );
}
