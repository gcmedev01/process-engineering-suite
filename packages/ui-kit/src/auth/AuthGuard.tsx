"use client";

import { ReactNode, useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { LoginPanel } from "./LoginPanel";
import { useSharedAuth } from "./useSharedAuthStore";

interface AuthGuardProps {
  children: ReactNode;
  apiBaseUrl?: string;
}

export function AuthGuard({ children, apiBaseUrl }: AuthGuardProps) {
  const { isAuthenticated, isRestored, restoreSession } = useSharedAuth();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (!isRestored) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (!isAuthenticated) {
    return (
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LoginPanel apiBaseUrl={apiBaseUrl} />
      </Box>
    );
  }

  return <>{children}</>;
}
