"use client";

import { useEffect } from "react";
import { useSharedAuth } from "@eng-suite/ui-kit";
import { useAuthStore } from "@/store/useAuthStore";

/**
 * Syncs the shared auth session (pes-shared-auth-storage) into PSV's local
 * useAuthStore so that permissions, SessionGuard, and role checks keep working
 * after the user logs in on the landing page.
 */
export function SharedAuthBridge() {
    const { currentUser, isAuthenticated, isRestored, restoreSession } = useSharedAuth();

    useEffect(() => {
        restoreSession();
    }, [restoreSession]);

    useEffect(() => {
        if (!isRestored) return;

        if (isAuthenticated && currentUser) {
            useAuthStore.setState({
                currentUser: {
                    id: currentUser.id,
                    username: currentUser.username,
                    name: currentUser.name,
                    initials: currentUser.initials,
                    email: currentUser.email,
                    role: currentUser.role,
                    status: currentUser.status ?? 'active',
                    avatarUrl: currentUser.avatarUrl,
                },
                isAuthenticated: true,
                sessionExpiresAt: Date.now() + 8 * 60 * 60 * 1000,
            });
        } else {
            useAuthStore.setState({
                currentUser: null,
                isAuthenticated: false,
                sessionExpiresAt: null,
            });
        }
    }, [isAuthenticated, currentUser, isRestored]);

    return null;
}
