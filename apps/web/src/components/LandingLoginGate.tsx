"use client";

import { ReactNode, useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { LoginPanel, useSharedAuth } from "@eng-suite/ui-kit";

interface LandingLoginGateProps {
  children: ReactNode;
}

export function LandingLoginGate({ children }: LandingLoginGateProps) {
  const { isAuthenticated, isRestored, restoreSession } = useSharedAuth();

  useEffect(() => {
    restoreSession();
  }, [restoreSession]);

  if (!isRestored) {
    return (
      <Box
        sx={{
          minHeight: "calc(100vh - 73px)",
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
          minHeight: "calc(100vh - 73px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <LoginPanel apiBaseUrl={process.env.NEXT_PUBLIC_AUTH_API_URL} />
      </Box>
    );
  }

  return <>{children}</>;
}
