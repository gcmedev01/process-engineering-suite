'use client';

import { FormEvent, useState } from 'react';
import { Alert, Box, Button, TextField, Typography, useTheme } from '@mui/material';
import { Lock, Person } from '@mui/icons-material';
import { useSharedAuth } from './useSharedAuthStore';

interface LoginPanelProps {
    apiBaseUrl?: string;
    title?: string;
    subtitle?: string;
    onSuccess?: () => void;
}

export function LoginPanel({
    apiBaseUrl,
    title = 'Engineering Suite',
    subtitle = 'Sign in to continue',
    onSuccess,
}: LoginPanelProps) {
    const theme = useTheme();
    const isDark = theme.palette.mode === 'dark';
    const { login } = useSharedAuth();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event: FormEvent) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        try {
            await login({ username, password, apiBaseUrl });
            onSuccess?.();
        } catch (loginError) {
            setError(loginError instanceof Error ? loginError.message : 'Unable to sign in');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Box
            sx={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
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
                        ? 'rgba(30, 41, 59, 0.66)'
                        : 'rgba(255, 255, 255, 0.76)',
                    backdropFilter: 'blur(20px)',
                    border: `1px solid ${isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.06)'}`,
                    boxShadow: isDark
                        ? '0 8px 32px rgba(0, 0, 0, 0.38)'
                        : '0 8px 32px rgba(0, 0, 0, 0.1)',
                }}
            >
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                    <Typography
                        variant="h4"
                        sx={{
                            fontWeight: 700,
                            background: `${theme.palette.primary.main}`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                            mb: 1,
                        }}
                    >
                        {title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        {subtitle}
                    </Typography>
                </Box>

                {error && (
                    <Alert severity="error" sx={{ mb: 3, borderRadius: '12px' }}>
                        {error}
                    </Alert>
                )}

                <Box component="form" aria-label="Sign in" onSubmit={handleSubmit}>
                    <TextField
                        fullWidth
                        label="Username"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        InputProps={{
                            startAdornment: <Person sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                        sx={{
                            mb: 2,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
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
                        onChange={(event) => setPassword(event.target.value)}
                        InputProps={{
                            startAdornment: <Lock sx={{ mr: 1, color: 'text.secondary' }} />,
                        }}
                        sx={{
                            mb: 3,
                            '& .MuiOutlinedInput-root': {
                                borderRadius: '12px',
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
                            fontWeight: 600,
                            py: 1.5,
                        }}
                    >
                        {loading ? 'Signing in...' : 'Sign in'}
                    </Button>
                </Box>
            </Box>
        </Box>
    );
}
