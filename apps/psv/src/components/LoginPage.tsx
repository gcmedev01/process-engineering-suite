"use client";

import { useState } from 'react';
import { Box, TextField, Button, Typography, Alert, useTheme } from '@mui/material';
import { Lock, Person } from '@mui/icons-material';
import { useAuthStore } from '@/store/useAuthStore';

interface LoginPageProps {
    onSuccess?: () => void;
    onContinueAsGuest?: () => void;
}

export function LoginPage({ onSuccess, onContinueAsGuest }: LoginPageProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const login = useAuthStore((state) => state.login);

    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const success = await login(username, password);

        if (success) {
            onSuccess?.();
        } else {
            setError('Invalid username or password');
        }

        setLoading(false);
    };

    const handleGuestMode = () => {
        onContinueAsGuest?.();
    };

    return (
        <Box
            sx={{
                minHeight: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: isDark
                    ? 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
                    : 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                p: 3,
            }}
        >
            <Box
                sx={{
                    width: '100%',
                    maxWidth: 420,
                    p: 4,
                    borderRadius: '20px',
                    background: isDark
                        ? 'rgba(30, 41, 59, 0.6)'
                        : 'rgba(255, 255, 255, 0.7)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)'}`,
                    boxShadow: isDark
                        ? '0 8px 32px 0 rgba(0, 0, 0, 0.4)'
                        : '0 8px 32px 0 rgba(0, 0, 0, 0.1)',
                }}
            >
                {/* Logo/Title */}
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1,
                        }}
                    >
                        PSV Sizing
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Sign in to continue
                    </Typography>
                </Box>

                {/* Error Alert */}
                {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
                        {error}
                    </Alert>
                )}

                {/* Login Form */}
                <form aria-label="Sign in" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Username"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        InputProps={{
                            startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                        sx={{
                            mb: 2,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
                            },
                        }}
                        disabled={loading}
                        autoFocus
                    />

                    <TextField
                        fullWidth
                        type="password"
                        label="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        InputProps={{
                            startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                        sx={{
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
                                background: isDark ? 'rgba(0, 0, 0, 0.2)' : 'rgba(255, 255, 255, 0.5)',
                            },
                        }}
                        disabled={loading}
                    />

                    <Button
                        fullWidth
                        type="submit"
                        variant="contained"
                        size="large"
                        disabled={loading || !username || !password}
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 600,
                            py: 1.5,
                            mb: 2,
                            background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                            '&:hover': {
                                background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                            },
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </Button>

                    <Button
                        fullWidth
                        variant="text"
                        size="large"
                        onClick={handleGuestMode}
                        disabled={loading}
                        sx={{
                            borderRadius: '12px',
                            textTransform: 'none',
                            fontWeight: 500,
                            color: 'text.secondary',
                        }}
                    >
                        Continue as Guest (View Only)
                    </Button>
                </form>

                {/* Test Credentials Hint */}
                <Box
                    sx={{
                        mt: 4,
                        pt: 3,
                        borderTop: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)'}`,
                    }}
                >
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                        Demo Accounts:
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace' }}>
                        engineer / engineer
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace' }}>
                        lead / lead
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
}
