"use client";

import { Box, Link, Typography, useTheme } from "@mui/material";

export function Footer() {
    const theme = useTheme();
    const isDark = theme.palette.mode === "dark";

    const linkSx = {
        color: "text.secondary",
        textDecoration: "none",
        fontSize: "0.75rem",
        "&:hover": {
            color: "primary.main",
            textDecoration: "underline",
        },
    };

    return (
        <Box
            component="footer"
            sx={{
                mt: 4,
                py: 3,
                borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
                display: "flex",
                flexDirection: { xs: "column", sm: "row" },
                alignItems: "center",
                justifyContent: "center",
                gap: { xs: 1.5, sm: 3 },
                flexWrap: "wrap",
            }}
        >
            {/* Company Logo & Copyright */}
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                <Box
                    sx={{
                        width: 24,
                        height: 24,
                        borderRadius: "50%",
                        bgcolor: "primary.main",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "primary.contrastText",
                        fontSize: "0.7rem",
                        fontWeight: 700,
                    }}
                >
                    EPT
                </Box>
                <Typography variant="caption" color="text.secondary">
                    © 2025 Process Technology
                </Typography>
            </Box>

            {/* Navigation Links */}
            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap", justifyContent: "center" }}>
                <Link href="#" sx={linkSx}>Terms</Link>
                <Link href="#" sx={linkSx}>Privacy</Link>
                <Link href="#" sx={linkSx}>Security</Link>
                <Link href="#" sx={linkSx}>Docs</Link>
                <Link href="#" sx={linkSx}>Contact</Link>
            </Box>
        </Box>
    );
}
