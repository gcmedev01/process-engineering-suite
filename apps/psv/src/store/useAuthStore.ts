import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MockCredential, User } from '@/data/types';
import { users, credentials } from '@/data/mockData';
import { hashPassword, verifyPassword } from '@/lib/hashPassword';
import { api, USE_LOCAL_STORAGE } from '@/lib/api';

/**
 * Demo auth storage keys (local-only).
 *
 * The PSV app currently runs in a demo mode where users and credentials are stored in
 * `localStorage`. This enables "admin creates user + temporary password" without a
 * backend identity provider.
 */
const USERS_STORAGE_KEY = 'psv_demo_users';
const CREDENTIALS_STORAGE_KEY = 'psv_demo_credentials';
const LEGACY_DEMO_PASSWORD_HASHES = new Set([
    'aae210703bf75e57a8531be04328d6f1aca6e299d97f4956300fe6568c93a8b5',
    '0a406e57b23ca636fd559f6cca9e9ca5068312f00b896722483e4d09ccfafa41',
    '162bf45d4f836003000411a54bd96455e08986f2e1c8010bf9e6eb1fb7c5891a',
    'a4243deb4e4fd5d3c764f8df3b8911264bf6b908f496fd54acd7100b57776f57',
]);

// Session expires after 8 hours (in milliseconds)
const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

function loadFromStorage<T>(key: string, fallback: T): T {
    if (typeof window === 'undefined') return fallback;
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    try {
        return JSON.parse(raw) as T;
    } catch {
        return fallback;
    }
}

function persistToStorage<T>(key: string, value: T) {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(value));
}

function ensureSeedData() {
    const existingUsers = loadFromStorage<User[]>(USERS_STORAGE_KEY, []);
    const existingCreds = loadFromStorage<MockCredential[]>(CREDENTIALS_STORAGE_KEY, []);
    if (existingUsers.length === 0) persistToStorage(USERS_STORAGE_KEY, users);
    if (existingCreds.length === 0) {
        persistToStorage(CREDENTIALS_STORAGE_KEY, credentials);
        return;
    }

    let changed = false;
    const nextCreds = existingCreds.map((storedCred) => {
        const seedCred = credentials.find(
            (credential) =>
                credential.userId === storedCred.userId &&
                credential.username === storedCred.username,
        );

        if (!seedCred || !LEGACY_DEMO_PASSWORD_HASHES.has(storedCred.password)) {
            return storedCred;
        }

        changed = true;
        return seedCred;
    });

    for (const credential of credentials) {
        const exists = nextCreds.some(
            (storedCred) =>
                storedCred.userId === credential.userId &&
                storedCred.username === credential.username,
        );

        if (!exists) {
            nextCreds.push(credential);
            changed = true;
        }
    }

    if (changed) persistToStorage(CREDENTIALS_STORAGE_KEY, nextCreds);
}

interface AuthState {
    currentUser: User | null;
    isAuthenticated: boolean;
    sessionExpiresAt: number | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
    updateUserProfile: (updates: Partial<Pick<User, 'name' | 'email' | 'initials' | 'displaySettings'>>) => void;
    changePassword: (currentPassword: string, newPassword: string) => Promise<{ success: boolean; message: string }>;
    resetUserPassword: (userId: string) => Promise<{ success: boolean; message: string; username?: string; temporaryPassword?: string }>;
    isSessionExpired: () => boolean;
    // Permission helpers
    canEdit: () => boolean;            // engineer+ (add/edit/delete items)
    canApprove: () => boolean;         // approver+
    canManageHierarchy: () => boolean; // lead+ (project/area/unit/plant)
    canManageCustomer: () => boolean;  // approver+
    canManageUsers: () => boolean;     // admin only
}

function generateTemporaryPassword(length = 12) {
    const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%';
    let next = '';
    for (let i = 0; i < length; i++) {
        next += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return next;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            currentUser: null,
            isAuthenticated: false,
            sessionExpiresAt: null,

            login: async (username: string, password: string) => {
                if (USE_LOCAL_STORAGE) {
                    ensureSeedData();
                    const storedCredentials = loadFromStorage<MockCredential[]>(CREDENTIALS_STORAGE_KEY, credentials);
                    const storedUsers = loadFromStorage<User[]>(USERS_STORAGE_KEY, users);

                    // Find credential by username
                    const credential = storedCredentials.find((c) => c.username === username);
                    if (!credential) {
                        return false;
                    }

                    // Verify password using hash comparison
                    const isValid = await verifyPassword(password, credential.password);
                    if (!isValid) {
                        return false;
                    }

                    // Find user
                    const user = storedUsers.find((u) => u.id === credential.userId);
                    if (!user || user.status !== 'active') {
                        return false;
                    }

                    const expiresAt = Date.now() + SESSION_DURATION_MS;
                    set({ currentUser: user, isAuthenticated: true, sessionExpiresAt: expiresAt });
                    return true;
                } else {
                    try {
                        const response = await api.login(username, password);
                        const expiresAt = Date.now() + (response.expiresIn * 1000);
                        set({
                            currentUser: response.user,
                            isAuthenticated: true,
                            sessionExpiresAt: expiresAt
                        });
                        return true;
                    } catch (error) {
                        console.error('API Login failed:', error);
                        return false;
                    }
                }
            },

            logout: () => {
                if (!USE_LOCAL_STORAGE) {
                    api.logout().catch(err => console.error('API Logout failed:', err));
                }
                set({ currentUser: null, isAuthenticated: false, sessionExpiresAt: null });
            },

            updateUserProfile: (updates) => {
                const { currentUser } = get();
                if (currentUser) {
                    ensureSeedData();
                    const storedUsers = loadFromStorage<User[]>(USERS_STORAGE_KEY, users);
                    const updatedUser = { ...currentUser, ...updates };
                    persistToStorage(
                        USERS_STORAGE_KEY,
                        storedUsers.map((u) => (u.id === currentUser.id ? updatedUser : u))
                    );
                    set({ currentUser: updatedUser });
                }
            },

            changePassword: async (currentPassword, newPassword) => {
                const { currentUser } = get();
                if (!currentUser) return { success: false, message: 'Not signed in' };
                if (!newPassword || newPassword.length < 6) {
                    return { success: false, message: 'Password must be at least 6 characters' };
                }

                ensureSeedData();
                const storedCredentials = loadFromStorage<MockCredential[]>(CREDENTIALS_STORAGE_KEY, credentials);
                const credIndex = storedCredentials.findIndex((c) => c.userId === currentUser.id);
                if (credIndex === -1) return { success: false, message: 'Credential not found' };

                // Verify current password
                const isValid = await verifyPassword(currentPassword, storedCredentials[credIndex].password);
                if (!isValid) {
                    return { success: false, message: 'Current password is incorrect' };
                }

                // Hash new password and store
                const hashedNewPassword = await hashPassword(newPassword);
                const nextCredentials = [...storedCredentials];
                nextCredentials[credIndex] = { ...nextCredentials[credIndex], password: hashedNewPassword };
                persistToStorage(CREDENTIALS_STORAGE_KEY, nextCredentials);
                return { success: true, message: 'Password updated' };
            },

            resetUserPassword: async (userId) => {
                const { currentUser } = get();
                if (!currentUser || !['admin', 'division_manager'].includes(currentUser.role)) {
                    return { success: false, message: 'Admin or Division Manager permission required' };
                }

                ensureSeedData();
                const storedUsers = loadFromStorage<User[]>(USERS_STORAGE_KEY, users);
                const storedCredentials = loadFromStorage<MockCredential[]>(CREDENTIALS_STORAGE_KEY, credentials);

                const targetUser = storedUsers.find((u) => u.id === userId);
                if (!targetUser) {
                    return { success: false, message: 'User not found' };
                }

                // Division managers cannot reset admin passwords
                if (currentUser.role === 'division_manager' && targetUser.role === 'admin') {
                    return { success: false, message: 'Division Manager cannot reset Admin passwords' };
                }

                const temporaryPassword = generateTemporaryPassword();
                const hashedPassword = await hashPassword(temporaryPassword);
                const existingIndex = storedCredentials.findIndex((c) => c.userId === userId);
                const username =
                    existingIndex !== -1
                        ? storedCredentials[existingIndex].username
                        : targetUser.email.split('@')[0] || targetUser.id.slice(0, 8);

                const nextCredentials = [...storedCredentials];
                if (existingIndex !== -1) {
                    nextCredentials[existingIndex] = { ...nextCredentials[existingIndex], password: hashedPassword };
                } else {
                    nextCredentials.push({ userId, username, password: hashedPassword });
                }

                // Sync username back to user object for display
                const nextUsers = storedUsers.map(u => u.id === userId ? { ...u, username } : u);
                persistToStorage(USERS_STORAGE_KEY, nextUsers);
                persistToStorage(CREDENTIALS_STORAGE_KEY, nextCredentials);

                // If the reset user is the current user (unlikely but possible), update local state
                if (currentUser.id === userId) {
                    set({ currentUser: { ...currentUser, username } });
                }
                return {
                    success: true,
                    message: `Temporary password created for ${targetUser.name}`,
                    username,
                    temporaryPassword,
                };
            },

            isSessionExpired: () => {
                const { sessionExpiresAt, isAuthenticated } = get();
                if (!isAuthenticated || !sessionExpiresAt) return true;
                return Date.now() >= sessionExpiresAt;
            },

            // Permission helpers
            canEdit: () => {
                const { currentUser } = get();
                if (!currentUser) return false;
                return ['engineer', 'lead', 'approver', 'division_manager', 'admin'].includes(currentUser.role);
            },

            canApprove: () => {
                const { currentUser } = get();
                if (!currentUser) return false;
                return ['lead', 'approver', 'division_manager', 'admin'].includes(currentUser.role);
            },

            canManageHierarchy: () => {
                const { currentUser } = get();
                if (!currentUser) return false;
                return ['lead', 'approver', 'division_manager', 'admin'].includes(currentUser.role);
            },

            canManageCustomer: () => {
                const { currentUser } = get();
                if (!currentUser) return false;
                return ['approver', 'division_manager', 'admin'].includes(currentUser.role);
            },

            canManageUsers: () => {
                const { currentUser } = get();
                if (!currentUser) return false;
                return ['admin', 'division_manager'].includes(currentUser.role);
            },
        }),
        {
            name: 'psv-auth-storage',
            onRehydrateStorage: () => (state, error) => {
                if (error) return;
                // If PSV already has a valid session, keep it
                if (state?.isAuthenticated && state.sessionExpiresAt && Date.now() < state.sessionExpiresAt) return;
                // Otherwise try to inherit the shared session from the landing page
                if (typeof window === 'undefined') return;
                try {
                    const raw = window.localStorage.getItem('pes-shared-auth-storage');
                    if (!raw) return;
                    const shared = JSON.parse(raw) as { user: User; sessionExpiresAt: number };
                    if (shared?.user && shared.sessionExpiresAt && Date.now() < shared.sessionExpiresAt) {
                        // Run after Zustand finishes applying the rehydrated state
                        setTimeout(() => {
                            useAuthStore.setState({
                                currentUser: shared.user,
                                isAuthenticated: true,
                                sessionExpiresAt: shared.sessionExpiresAt,
                            });
                        }, 0);
                    }
                } catch {
                    // ignore malformed data
                }
            },
        }
    )
);
