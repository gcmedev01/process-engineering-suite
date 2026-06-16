'use client';

import { ReactNode, useEffect } from 'react';
import { Box, Typography, useTheme } from '@mui/material';
import { Lock } from '@mui/icons-material';
import { useSharedAuth } from './useSharedAuthStore';

interface AuthInteractionGuardProps {
    children: ReactNode;
    notice?: boolean;
}

export function AuthInteractionGuard({ children, notice = false }: AuthInteractionGuardProps) {
    const theme = useTheme();
    const { isAuthenticated, isRestored, restoreSession } = useSharedAuth();
    const locked = isRestored && !isAuthenticated;

    useEffect(() => {
        restoreSession();
    }, [restoreSession]);

    return (
        <Box sx={{ position: 'relative' }}>
            <Box
                inert={locked ? true : undefined}
                aria-disabled={locked ? true : undefined}
                sx={{
                    pointerEvents: locked ? 'none' : undefined,
                    userSelect: locked ? 'none' : undefined,
                    opacity: locked ? 0.42 : 1,
                    transition: 'opacity 0.2s ease',
                }}
            >
                {children}
            </Box>
            {locked && notice && (
                <Box
                    aria-hidden="true"
                    sx={{
                        position: 'absolute',
                        inset: 0,
                        zIndex: 2,
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'center',
                        pt: 5,
                        pointerEvents: 'none',
                        background:
                            theme.palette.mode === 'dark'
                                ? 'linear-gradient(180deg, rgba(15, 23, 42, 0.55), rgba(15, 23, 42, 0.18))'
                                : 'linear-gradient(180deg, rgba(248, 250, 252, 0.65), rgba(248, 250, 252, 0.2))',
                    }}
                >
                    <Box
                        sx={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: 1,
                            px: 2,
                            py: 1,
                            borderRadius: 2,
                            bgcolor: theme.palette.background.paper,
                            border: `1px solid ${theme.palette.divider}`,
                            boxShadow: '0 10px 30px rgba(0, 0, 0, 0.12)',
                        }}
                    >
                        <Lock sx={{ fontSize: 18, color: 'text.secondary' }} />
                        <Typography variant="body2" color="text.secondary" fontWeight={600}>
                            Sign in required
                        </Typography>
                    </Box>
                </Box>
            )}
        </Box>
    );
}
