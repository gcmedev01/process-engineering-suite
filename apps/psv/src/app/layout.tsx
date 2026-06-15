import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { Providers } from "./providers";
import { TopToolbar } from "@/components/TopToolbar";
import { GlobalConflictHandler } from "@/components/GlobalConflictHandler";
import { Footer } from "@/components/shared/Footer";
import { Box } from "@mui/material";

const inter = localFont({
    src: "./fonts/Inter-roman.var.woff2",
    variable: "--font-inter",
    display: "swap",
});

export const metadata: Metadata = {
    title: "PSV Sizing - Process Engineering Suite",
    description: "Pressure Safety Valve sizing and overpressure protection management.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={inter.className} suppressHydrationWarning>
                <Providers>
                    <Box
                        sx={{
                            position: "fixed",
                            top: 0,
                            left: 0,
                            right: 0,
                            zIndex: 1000,
                            boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                            backdropFilter: "blur(4px)",
                            "@media print": { display: "none" },
                        }}
                    >
                        <TopToolbar />
                    </Box>
                    <Box sx={{ minHeight: "83px", "@media print": { display: "none" } }} />
                    {children}
                    <Footer />
                    {/* Global conflict detection dialogs */}
                    <GlobalConflictHandler />
                </Providers>
            </body>
        </html>
    );
}

