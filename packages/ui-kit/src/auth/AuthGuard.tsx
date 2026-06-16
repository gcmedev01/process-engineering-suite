"use client";

import { ReactNode, useEffect } from "react";
import { useSharedAuth } from "./useSharedAuthStore";

interface AuthGuardProps {
  children: ReactNode;
  homeHref?: string;
}

export function AuthGuard({ children, homeHref = "/" }: AuthGuardProps) {
  const { isAuthenticated, isRestored, restoreSession } = useSharedAuth();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (isRestored && !isAuthenticated) {
      window.location.replace(homeHref);
    }
  }, [isRestored, isAuthenticated, homeHref]);

  if (!isRestored || !isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
