"use client";

import type { ReactNode } from "react";
import { Box } from "@mui/material";
import { AuthInteractionGuard } from "@eng-suite/ui-kit";
import { TopToolbar } from "@/components/TopToolbar";

interface CalculatorToolbarProps {
  actions?: ReactNode;
  homeHref?: string;
}

export function CalculatorToolbar({
  actions,
  homeHref = process.env.NEXT_PUBLIC_WEB_URL ?? "http://localhost:3000",
}: CalculatorToolbarProps) {
  return (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 1000,
        boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
        backdropFilter: "blur(4px)",
        "@media print": { display: "none" },
      }}
    >
      <TopToolbar
        actions={<AuthInteractionGuard>{actions}</AuthInteractionGuard>}
        homeHref={homeHref}
      />
    </Box>
  );
}
