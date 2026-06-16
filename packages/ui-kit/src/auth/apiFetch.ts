'use client';

import { getSharedAuthSnapshot } from './useSharedAuthStore';

function joinUrl(base: string, path: string): string {
    return `${base.replace(/\/+$/, '')}${path}`;
}

/** True when the session came from the in-browser fallback (no real API). */
export function isFallbackSession(): boolean {
    const snap = getSharedAuthSnapshot();
    return snap.source === 'fallback' || (snap.accessToken?.startsWith('fallback_') ?? false);
}

/**
 * Fetch wrapper that injects the Bearer token from the shared auth store.
 * Throws on 401/403 with a readable message.
 */
export async function authedFetch(
    path: string,
    init: RequestInit = {},
    apiBaseUrl: string,
): Promise<Response> {
    const { accessToken } = getSharedAuthSnapshot();

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...(init.headers as Record<string, string>),
    };
    if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch(joinUrl(apiBaseUrl, path), { ...init, headers });

    if (res.status === 401) throw new Error('Unauthorized — please log in again');
    if (res.status === 403) throw new Error('Forbidden — insufficient permissions');

    return res;
}

// ---------------------------------------------------------------------------
// Typed client functions
// ---------------------------------------------------------------------------

export interface ApiUser {
    id: string;
    name: string;
    initials?: string;
    email: string;
    role: string;
    status: string;
}

export interface CreateUserPayload {
    name: string;
    username: string;
    email: string;
    password: string;
    role?: string;
    initials?: string;
}

export interface UpdateUserPayload {
    name?: string;
    initials?: string;
    email?: string;
    role?: string;
    status?: string;
}

export async function fetchUsers(apiBaseUrl: string): Promise<ApiUser[]> {
    const res = await authedFetch('/users', {}, apiBaseUrl);
    return res.json() as Promise<ApiUser[]>;
}

export async function createUser(apiBaseUrl: string, payload: CreateUserPayload): Promise<ApiUser> {
    const res = await authedFetch('/users', { method: 'POST', body: JSON.stringify(payload) }, apiBaseUrl);
    return res.json() as Promise<ApiUser>;
}

export async function updateUser(
    apiBaseUrl: string,
    userId: string,
    payload: UpdateUserPayload,
): Promise<ApiUser> {
    const res = await authedFetch(
        `/users/${userId}`,
        { method: 'PATCH', body: JSON.stringify(payload) },
        apiBaseUrl,
    );
    return res.json() as Promise<ApiUser>;
}

export async function deleteUser(apiBaseUrl: string, userId: string): Promise<ApiUser> {
    const res = await authedFetch(`/users/${userId}`, { method: 'DELETE' }, apiBaseUrl);
    return res.json() as Promise<ApiUser>;
}

export async function updateMyProfile(
    apiBaseUrl: string,
    payload: { name?: string; initials?: string; email?: string },
): Promise<ApiUser> {
    const res = await authedFetch('/users/me', { method: 'PATCH', body: JSON.stringify(payload) }, apiBaseUrl);
    return res.json() as Promise<ApiUser>;
}

export async function changeMyPassword(
    apiBaseUrl: string,
    currentPassword: string,
    newPassword: string,
): Promise<void> {
    await authedFetch(
        '/users/me/password',
        { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) },
        apiBaseUrl,
    );
}
