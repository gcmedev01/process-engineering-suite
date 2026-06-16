'use client';

import { useSyncExternalStore } from 'react';
import { loginWithFallback, logoutWithFallback } from './authClient';
import type { SharedUser, StoredSharedAuthSession } from './types';

const STORAGE_KEY = 'pes-shared-auth-storage';
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

interface SharedAuthSnapshot {
    currentUser: SharedUser | null;
    isAuthenticated: boolean;
    sessionExpiresAt: number | null;
    accessToken: string | null;
    tokenType: string | null;
    source: 'api' | 'fallback' | null;
    isRestored: boolean;
}

interface LoginOptions {
    username: string;
    password: string;
    apiBaseUrl?: string;
}

const emptySnapshot: SharedAuthSnapshot = {
    currentUser: null,
    isAuthenticated: false,
    sessionExpiresAt: null,
    accessToken: null,
    tokenType: null,
    source: null,
    isRestored: false,
};

let snapshot: SharedAuthSnapshot = emptySnapshot;
const listeners = new Set<() => void>();

function emit(nextSnapshot: SharedAuthSnapshot): void {
    snapshot = nextSnapshot;
    for (const listener of listeners) {
        listener();
    }
}

function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
}

function getSnapshot(): SharedAuthSnapshot {
    return snapshot;
}

function getServerSnapshot(): SharedAuthSnapshot {
    return emptySnapshot;
}

function readStoredSession(): StoredSharedAuthSession | null {
    if (typeof window === 'undefined') return null;

    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    try {
        return JSON.parse(raw) as StoredSharedAuthSession;
    } catch {
        window.localStorage.removeItem(STORAGE_KEY);
        return null;
    }
}

function writeStoredSession(session: StoredSharedAuthSession): void {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

function clearStoredSession(): void {
    if (typeof window === 'undefined') return;
    window.localStorage.removeItem(STORAGE_KEY);
}

function toSnapshot(session: StoredSharedAuthSession, isRestored: boolean): SharedAuthSnapshot {
    return {
        currentUser: session.user,
        isAuthenticated: true,
        sessionExpiresAt: session.sessionExpiresAt,
        accessToken: session.accessToken,
        tokenType: session.tokenType,
        source: session.source,
        isRestored,
    };
}

export function restoreSharedAuthSession(): void {
    const stored = readStoredSession();

    if (!stored || Date.now() >= stored.sessionExpiresAt || stored.user.status === 'inactive') {
        clearStoredSession();
        emit({ ...emptySnapshot, isRestored: true });
        return;
    }

    emit(toSnapshot(stored, true));
}

export async function loginSharedAuth({ username, password, apiBaseUrl }: LoginOptions): Promise<void> {
    const session = await loginWithFallback({ username, password, apiBaseUrl });
    const sessionExpiresAt = Date.now() + (session.expiresIn * 1000 || SESSION_DURATION_MS);
    const storedSession: StoredSharedAuthSession = {
        user: session.user,
        accessToken: session.accessToken,
        tokenType: session.tokenType,
        source: session.source,
        sessionExpiresAt,
    };

    writeStoredSession(storedSession);
    emit(toSnapshot(storedSession, true));
}

export async function logoutSharedAuth(apiBaseUrl?: string): Promise<void> {
    const accessToken = snapshot.accessToken ?? undefined;
    clearStoredSession();
    emit({ ...emptySnapshot, isRestored: true });
    await logoutWithFallback({ apiBaseUrl, accessToken });
}

export function useSharedAuth() {
    const state = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

    return {
        ...state,
        restoreSession: restoreSharedAuthSession,
        login: loginSharedAuth,
        logout: logoutSharedAuth,
        isSessionExpired: () => !state.sessionExpiresAt || Date.now() >= state.sessionExpiresAt,
    };
}
