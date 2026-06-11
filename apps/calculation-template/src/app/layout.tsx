import type { Metadata } from "next";
import localFont from "next/font/local";
import { Box } from "@mui/material";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Providers } from "./providers";
import { TopToolbar } from "@/components/TopToolbar";
import "./globals.css";

const inter = localFont({
  src: "./fonts/Inter-roman.var.woff2",
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "App Title - Process Engineering Suite", // TODO: replace per app
  description:
    "App Description Calculation", // TODO: replace per app
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className} suppressHydrationWarning>
        <Providers>
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
            <TopToolbar />
          </Box>
          <TooltipProvider>{children}</TooltipProvider>
        </Providers>
      </body>
    </html>
  );
}
