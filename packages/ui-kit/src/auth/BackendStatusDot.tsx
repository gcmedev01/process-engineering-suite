'use client';

import { useCallback, useEffect, useState } from 'react';
import { Box, Tooltip, useTheme } from '@mui/material';

type BackendStatus = 'checking' | 'ready' | 'not-ready';

interface BackendStatusDotProps {
    apiBaseUrl?: string;
    pollMs?: number;
}

interface HealthResponse {
    status?: string;
    database?: string;
}

function joinUrl(baseUrl: string, path: string): string {
    return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

export function BackendStatusDot({ apiBaseUrl, pollMs = 30000 }: BackendStatusDotProps) {
    const theme = useTheme();
    const [status, setStatus] = useState<BackendStatus>('checking');

    const check = useCallback(async () => {
        const normalizedApiBaseUrl = apiBaseUrl?.trim();

        if (!normalizedApiBaseUrl) {
            setStatus('not-ready');
            return;
        }

        setStatus('checking');

        try {
            const response = await fetch(joinUrl(normalizedApiBaseUrl, '/health'), {
                method: 'GET',
                headers: { Accept: 'application/json' },
            });

            if (!response.ok) {
                setStatus('not-ready');
                return;
            }

            const health = (await response.json()) as HealthResponse;
            setStatus(health.status === 'healthy' && health.database === 'connected' ? 'ready' : 'not-ready');
        } catch {
            setStatus('not-ready');
        }
    }, [apiBaseUrl]);

    useEffect(() => {
        void check();
        const interval = window.setInterval(() => void check(), pollMs);
        return () => window.clearInterval(interval);
    }, [check, pollMs]);

    const color =
        status === 'ready'
            ? theme.palette.success.main
            : status === 'checking'
                ? theme.palette.warning.main
                : theme.palette.error.main;

    const label =
        status === 'ready'
            ? 'Backend and database ready'
            : status === 'checking'
                ? 'Checking backend and database'
                : 'Backend or database not ready';

    return (
        <Tooltip title={label}>
            <Box
                component="span"
                aria-label={label}
                onClick={(event) => {
                    event.stopPropagation();
                    void check();
                }}
                sx={{
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    bgcolor: color,
                    border: `2px solid ${theme.palette.background.paper}`,
                    boxShadow: `0 0 0 1px ${theme.palette.divider}`,
                    display: 'inline-block',
                    cursor: 'pointer',
                    flexShrink: 0,
                }}
            />
        </Tooltip>
    );
}
