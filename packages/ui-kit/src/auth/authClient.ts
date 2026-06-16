import { fallbackCredentials, fallbackUsers } from './fallbackUsers';
import { verifySha256Password } from './password';
import type { SharedAuthSession, SharedUser } from './types';

type Fetcher = typeof fetch;

export interface LoginWithFallbackOptions {
    username: string;
    password: string;
    apiBaseUrl?: string;
    fetcher?: Fetcher;
}

export interface LogoutWithFallbackOptions {
    apiBaseUrl?: string;
    accessToken?: string;
    fetcher?: Fetcher;
}

interface ApiLoginResponse {
    accessToken?: string;
    access_token?: string;
    tokenType?: string;
    token_type?: string;
    expiresIn?: number;
    expires_in?: number;
    user?: SharedUser;
}

const FALLBACK_STATUSES = new Set([404, 501, 502, 503, 504]);
const AUTH_REJECTION_STATUSES = new Set([400, 401, 403]);

function joinUrl(baseUrl: string, path: string): string {
    return `${baseUrl.replace(/\/+$/, '')}${path}`;
}

function isUnavailableError(error: unknown): boolean {
    return error instanceof TypeError || error instanceof DOMException;
}

function normalizeApiResponse(data: ApiLoginResponse): SharedAuthSession {
    if (!data.user) {
        throw new Error('Auth API response is missing user data');
    }

    return {
        user: { ...data.user, status: data.user.status ?? 'active' },
        accessToken: data.accessToken ?? data.access_token ?? '',
        tokenType: data.tokenType ?? data.token_type ?? 'Bearer',
        expiresIn: data.expiresIn ?? data.expires_in ?? 28800,
        source: 'api',
    };
}

async function loginWithApi(
    username: string,
    password: string,
    apiBaseUrl: string,
    fetcher: Fetcher,
): Promise<SharedAuthSession | null> {
    try {
        const response = await fetcher(joinUrl(apiBaseUrl, '/auth/login'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
        });

        if (response.ok) {
            return normalizeApiResponse((await response.json()) as ApiLoginResponse);
        }

        if (AUTH_REJECTION_STATUSES.has(response.status)) {
            throw new Error('Invalid username or password');
        }

        if (FALLBACK_STATUSES.has(response.status)) {
            return null;
        }

        throw new Error(`Auth API returned ${response.status}`);
    } catch (error) {
        if (isUnavailableError(error)) {
            return null;
        }
        throw error;
    }
}

export async function loginWithLocalFallback(username: string, password: string): Promise<SharedAuthSession> {
    const credential = fallbackCredentials.find((item) => item.username === username);

    if (!credential || !(await verifySha256Password(password, credential.password))) {
        throw new Error('Invalid username or password');
    }

    const user = fallbackUsers.find((item) => item.id === credential.userId);

    if (!user || user.status !== 'active') {
        throw new Error('User not found or inactive');
    }

    return {
        user,
        accessToken: `fallback_${user.id}_${Date.now()}`,
        tokenType: 'Bearer',
        expiresIn: 28800,
        source: 'fallback',
    };
}

export async function loginWithFallback({
    username,
    password,
    apiBaseUrl,
    fetcher = fetch,
}: LoginWithFallbackOptions): Promise<SharedAuthSession> {
    const normalizedApiBaseUrl = apiBaseUrl?.trim();

    if (normalizedApiBaseUrl) {
        const apiSession = await loginWithApi(username, password, normalizedApiBaseUrl, fetcher);
        if (apiSession) return apiSession;
    }

    return loginWithLocalFallback(username, password);
}

export async function logoutWithFallback({
    apiBaseUrl,
    accessToken,
    fetcher = fetch,
}: LogoutWithFallbackOptions): Promise<void> {
    const normalizedApiBaseUrl = apiBaseUrl?.trim();

    if (!normalizedApiBaseUrl) return;

    try {
        await fetcher(joinUrl(normalizedApiBaseUrl, '/auth/logout'), {
            method: 'POST',
            headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined,
        });
    } catch {
        return;
    }
}
